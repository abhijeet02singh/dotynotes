package com.dotynotes.overlay

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Diagnostic and safe recovery helper for the DotyNotes SQLite database.
 *
 * CRITICAL SAFETY RULE: This helper must NEVER open the live database
 * (${filesDir}/SQLite/dotynotes.db) using android.database.sqlite.SQLiteDatabase.
 *
 * expo-sqlite compiles its own custom SQLite binary (libexpo-sqlite.so) with
 * a different WAL header format and SHM checksum algorithm. Opening the same
 * WAL-mode file with Android system libsqlite.so rewrites the WAL header and
 * SHM index using incompatible checksums — the next expo-sqlite open will then
 * see "database disk image is malformed".
 *
 * Safe operations performed by this class:
 *  - File-copy backup (no SQLite open on the live file)
 *  - Deleting stale -wal and -shm files so expo-sqlite re-opens cleanly
 *  - Opening BACKUP COPIES (never the live file) via Android SQLite for
 *    note extraction
 */
object DatabaseRecoveryHelper {
    private const val TAG = "DotyNotesRecovery"

    data class RecoveryReport(
        val success: Boolean,
        val message: String,
        val backupDirectory: String?,
        val recoveredNoteCount: Int,
        val integrityCheckResult: String
    ) {
        fun toMap(): Map<String, Any?> = mapOf(
            "success" to success,
            "message" to message,
            "backupDirectory" to backupDirectory,
            "recoveredNoteCount" to recoveredNoteCount,
            "integrityCheckResult" to integrityCheckResult
        )
    }

    /**
     * Creates a timestamped safe backup of all SQLite files using pure file I/O.
     * Never opens any SQLite connection.
     */
    fun createSafeBackup(context: Context): String? {
        return try {
            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val backupDir = File(context.filesDir, "SQLite/backup_$timestamp")
            if (!backupDir.exists()) {
                backupDir.mkdirs()
            }

            val sourceDir = File(context.filesDir, "SQLite")
            val filesToBackup = listOf(
                File(sourceDir, "dotynotes.db"),
                File(sourceDir, "dotynotes.db-wal"),
                File(sourceDir, "dotynotes.db-shm")
            )

            var copiedCount = 0
            for (file in filesToBackup) {
                if (file.exists() && file.isFile && file.length() > 0L) {
                    val destFile = File(backupDir, file.name)
                    file.copyTo(destFile, overwrite = true)
                    copiedCount++
                    Log.i(TAG, "Diagnostic: Backed up '${file.name}' (${file.length()} bytes)")
                }
            }

            Log.i(TAG, "Diagnostic: Backup completed — $copiedCount file(s) in ${backupDir.absolutePath}")
            backupDir.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "Diagnostic Error: Backup failed: ${e.message}")
            null
        }
    }

    /**
     * Extracts note rows from a SQLite database file.
     *
     * MUST only be called on a BACKUP COPY, never on the live database.
     * Uses Android system SQLite which is incompatible with the expo-sqlite
     * WAL format. On a read-only backup copy this is safe because no WAL
     * headers are rewritten.
     */
    fun extractNotesFromBackupFile(dbFile: File): List<Map<String, Any>> {
        val notes = mutableListOf<Map<String, Any>>()
        if (!dbFile.exists() || !dbFile.isFile || dbFile.length() == 0L) {
            return notes
        }

        // Safety guard: refuse to open the live database path
        val isBackup = dbFile.parentFile?.name?.startsWith("backup_") == true
        if (!isBackup && dbFile.name == "dotynotes.db") {
            Log.e(TAG, "SAFETY BLOCK: extractNotesFromBackupFile called on live database — aborting")
            return notes
        }

        try {
            val db = SQLiteDatabase.openDatabase(
                dbFile.absolutePath,
                null,
                SQLiteDatabase.OPEN_READONLY
            )
            try {
                val tableCheck = db.rawQuery(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='notes'",
                    null
                )
                val tableExists = tableCheck.use { it.moveToFirst() }
                if (!tableExists) return notes

                val cursor = db.rawQuery(
                    "SELECT id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt FROM notes",
                    null
                )
                cursor.use { c ->
                    val idIdx = c.getColumnIndex("id")
                    val titleIdx = c.getColumnIndex("title")
                    val contentIdx = c.getColumnIndex("content")
                    val colorIdx = c.getColumnIndex("colorSchemeId")
                    val tagIdx = c.getColumnIndex("tag")
                    val pinIdx = c.getColumnIndex("isPinned")
                    val archIdx = c.getColumnIndex("isArchived")
                    val createdIdx = c.getColumnIndex("createdAt")
                    val updatedIdx = c.getColumnIndex("updatedAt")

                    while (c.moveToNext()) {
                        val noteMap = mutableMapOf<String, Any>()
                        if (idIdx >= 0) noteMap["id"] = c.getString(idIdx) ?: ""
                        if (titleIdx >= 0) noteMap["title"] = c.getString(titleIdx) ?: ""
                        if (contentIdx >= 0) noteMap["content"] = c.getString(contentIdx) ?: ""
                        if (colorIdx >= 0) noteMap["colorSchemeId"] = c.getString(colorIdx) ?: "purple"
                        if (tagIdx >= 0) noteMap["tag"] = c.getString(tagIdx) ?: "General"
                        if (pinIdx >= 0) noteMap["isPinned"] = c.getInt(pinIdx)
                        if (archIdx >= 0) noteMap["isArchived"] = c.getInt(archIdx)
                        if (createdIdx >= 0) noteMap["createdAt"] = c.getLong(createdIdx)
                        if (updatedIdx >= 0) noteMap["updatedAt"] = c.getLong(updatedIdx)
                        notes.add(noteMap)
                    }
                }
                Log.i(TAG, "Diagnostic: Extracted ${notes.size} note(s) from backup '${dbFile.name}'")
            } finally {
                db.close()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Diagnostic Warning: Note extraction from '${dbFile.name}': ${e.message}")
        }
        return notes
    }

    /**
     * Safe repair routine — no Android system SQLite opens on the live file.
     *
     * Steps:
     *  1. Create a file-copy backup of .db, -wal, and -shm (pure file I/O).
     *  2. Extract notes from the backup copy for counting and emergency JSON.
     *  3. Delete the stale -wal and -shm files from the live directory.
     *     These are the corrupted/incompatible WAL artifacts. The main .db
     *     contains all committed data — expo-sqlite can re-open it cleanly.
     *  4. Return a report. expo-sqlite will re-initialize WAL mode on next open.
     */
    fun repairDatabase(context: Context): RecoveryReport {
        Log.i(TAG, "Diagnostic: Initiating safe WAL cleanup repair...")

        // Step 1: File-copy backup — no SQLite connection opened
        val backupPath = createSafeBackup(context)
        Log.i(TAG, "Diagnostic: Backup path: $backupPath")

        // Step 2: Extract notes from the backup copy (never the live file)
        var recoveredNoteCount = 0
        if (backupPath != null) {
            val backupDir = File(backupPath)
            val backupDbFile = File(backupDir, "dotynotes.db")
            if (backupDbFile.exists()) {
                val notes = extractNotesFromBackupFile(backupDbFile)
                recoveredNoteCount = notes.size
                Log.i(TAG, "Diagnostic: $recoveredNoteCount recoverable note(s) confirmed in backup")

                // Save emergency JSON alongside backup
                try {
                    val emergencyJson = File(backupDir, "recovered_notes_emergency.json")
                    val jsonArray = JSONArray()
                    for (note in notes) {
                        jsonArray.put(JSONObject(note))
                    }
                    emergencyJson.writeText(jsonArray.toString(2))
                    Log.i(TAG, "Diagnostic: Emergency JSON saved to ${emergencyJson.absolutePath}")
                } catch (e: Exception) {
                    Log.w(TAG, "Diagnostic Warning: Could not write emergency JSON: ${e.message}")
                }
            }
        }

        // Step 3: Delete the stale -wal and -shm files from the live directory.
        // The main .db file contains all committed data and is preserved intact.
        // expo-sqlite will re-create fresh, compatible WAL files on next open.
        val liveDir = File(context.filesDir, "SQLite")
        val walFile = File(liveDir, "dotynotes.db-wal")
        val shmFile = File(liveDir, "dotynotes.db-shm")

        var deletedWal = false
        var deletedShm = false

        if (walFile.exists()) {
            deletedWal = walFile.delete()
            Log.i(TAG, "Diagnostic: Deleted stale -wal file: $deletedWal")
        }
        if (shmFile.exists()) {
            deletedShm = shmFile.delete()
            Log.i(TAG, "Diagnostic: Deleted stale -shm file: $deletedShm")
        }

        val mainDbExists = File(liveDir, "dotynotes.db").exists()
        val success = mainDbExists

        val statusMsg = buildString {
            append("Main DB preserved: $mainDbExists. ")
            if (deletedWal) append("Stale WAL deleted. ")
            if (deletedShm) append("Stale SHM deleted. ")
            append("expo-sqlite will re-initialize WAL on next open.")
        }

        Log.i(TAG, "Diagnostic: Repair complete — $statusMsg")

        return RecoveryReport(
            success = success,
            message = statusMsg,
            backupDirectory = backupPath,
            recoveredNoteCount = recoveredNoteCount,
            integrityCheckResult = "deferred_to_expo_sqlite"
        )
    }
}
