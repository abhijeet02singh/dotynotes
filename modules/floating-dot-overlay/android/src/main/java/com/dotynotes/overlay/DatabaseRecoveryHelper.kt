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
 * CRITICAL CONTRACT — this class has two categories of operations:
 *
 * NON-DESTRUCTIVE (always safe to call):
 *  - createSafeBackup(): file-copy of .db + -wal + -shm, no SQLite connection
 *  - extractNotesFromBackupFile(): reads a BACKUP COPY via Android SQLite (read-only)
 *  - repairDatabase(): backup + inspect backup + return diagnostic report, NO live modifications
 *
 * DESTRUCTIVE (must only be called explicitly after user review):
 *  - cleanupStaleWalFiles(): deletes live -wal and -shm files
 *    Call only AFTER: (a) expo-sqlite connection is closed by JS, and
 *    (b) a consistent backup has been verified to exist.
 *
 * NEVER open the live database (${filesDir}/SQLite/dotynotes.db)
 * using android.database.sqlite.SQLiteDatabase. expo-sqlite uses its
 * own custom libexpo-sqlite.so with an incompatible WAL header/SHM
 * checksum format. Any READWRITE open via the Android system library
 * will corrupt the WAL headers irreversibly.
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
     * NON-DESTRUCTIVE diagnostic routine.
     *
     * Steps performed (no live file is modified):
     *  1. File-copy backup of .db + -wal + -shm (pure file I/O).
     *  2. Open the BACKUP COPY with Android system SQLite (OPEN_READONLY).
     *     Reading a backup with a different engine is safe — no WAL headers
     *     are rewritten on a read-only open of a file that has no active WAL.
     *  3. Run PRAGMA integrity_check on the backup copy.
     *  4. Count recoverable notes in the backup copy.
     *  5. Write an emergency JSON of notes alongside the backup.
     *  6. Return a detailed report for the JS layer to present to the user.
     *
     * Live WAL/SHM files are NOT deleted. Call cleanupStaleWalFiles() only
     * after the user has reviewed the diagnostic report.
     */
    fun repairDatabase(context: Context): RecoveryReport {
        Log.i(TAG, "Diagnostic: Starting non-destructive database diagnosis...")

        // Step 1: File-copy backup — no SQLite connection on live file
        val backupPath = createSafeBackup(context)
        Log.i(TAG, "Diagnostic: Backup path: ${backupPath ?: "FAILED"}")

        var recoveredNoteCount = 0
        var integrityResult = "backup_not_available"

        if (backupPath != null) {
            val backupDir = File(backupPath)
            val backupDbFile = File(backupDir, "dotynotes.db")

            if (backupDbFile.exists() && backupDbFile.length() > 0L) {
                // Step 2+3: integrity check on backup copy
                integrityResult = runIntegrityCheckOnBackup(backupDbFile)
                Log.i(TAG, "Diagnostic: Backup integrity check result: $integrityResult")

                // Step 4: count recoverable notes from backup copy
                val notes = extractNotesFromBackupFile(backupDbFile)
                recoveredNoteCount = notes.size
                Log.i(TAG, "Diagnostic: $recoveredNoteCount recoverable note(s) in backup")

                // Step 5: emergency JSON alongside backup
                try {
                    val emergencyJson = File(backupDir, "recovered_notes_emergency.json")
                    val jsonArray = JSONArray()
                    for (note in notes) { jsonArray.put(JSONObject(note)) }
                    emergencyJson.writeText(jsonArray.toString(2))
                    Log.i(TAG, "Diagnostic: Emergency JSON saved alongside backup")
                } catch (e: Exception) {
                    Log.w(TAG, "Diagnostic Warning: Emergency JSON write failed: ${e.message}")
                }
            } else {
                Log.w(TAG, "Diagnostic: Backup .db file missing or empty — live DB may be absent")
                integrityResult = "backup_db_missing"
            }
        }

        val liveDbExists = File(context.filesDir, "SQLite/dotynotes.db").exists()
        val walExists = File(context.filesDir, "SQLite/dotynotes.db-wal").exists()
        val shmExists = File(context.filesDir, "SQLite/dotynotes.db-shm").exists()
        Log.i(TAG, "Diagnostic: Live file state — .db=$liveDbExists .wal=$walExists .shm=$shmExists")

        val diagnosticMsg = buildString {
            append("Backup: ${backupPath ?: "failed"}. ")
            append("Backup integrity: $integrityResult. ")
            append("Recoverable notes: $recoveredNoteCount. ")
            append("Live .wal present: $walExists, .shm present: $shmExists. ")
            append("No live files were modified.")
        }

        return RecoveryReport(
            success = integrityResult.equals("ok", ignoreCase = true),
            message = diagnosticMsg,
            backupDirectory = backupPath,
            recoveredNoteCount = recoveredNoteCount,
            integrityCheckResult = integrityResult
        )
    }

    /**
     * Runs PRAGMA integrity_check on a BACKUP COPY file (read-only).
     * Must never be called on the live database.
     */
    private fun runIntegrityCheckOnBackup(backupDbFile: File): String {
        // Extra guard: only allow files inside a backup_ directory
        val parentName = backupDbFile.parentFile?.name ?: ""
        if (!parentName.startsWith("backup_")) {
            Log.e(TAG, "SAFETY BLOCK: integrity check attempted on non-backup path")
            return "blocked_non_backup_path"
        }
        return try {
            val db = SQLiteDatabase.openDatabase(
                backupDbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY
            )
            val result = db.use { d ->
                d.rawQuery("PRAGMA integrity_check;", null).use { c ->
                    if (c.moveToFirst()) c.getString(0) ?: "no_result" else "no_result"
                }
            }
            result
        } catch (e: Exception) {
            Log.w(TAG, "Diagnostic: integrity check on backup returned: ${e.message}")
            "check_failed: ${e.message}"
        }
    }

    /**
     * DESTRUCTIVE: deletes live -wal and -shm files.
     *
     * MUST only be called:
     *  - After the expo-sqlite connection has been closed from the JS side
     *  - After repairDatabase() has confirmed a usable backup exists
     *  - Explicitly by the user (never automatically)
     *
     * Returns a map with keys: walDeleted, shmDeleted, mainDbExists.
     */
    fun cleanupStaleWalFiles(context: Context): Map<String, Any?> {
        Log.i(TAG, "Cleanup: Explicit WAL/SHM file deletion requested")
        val liveDir = File(context.filesDir, "SQLite")
        val walFile = File(liveDir, "dotynotes.db-wal")
        val shmFile = File(liveDir, "dotynotes.db-shm")

        var walDeleted = false
        var shmDeleted = false

        if (walFile.exists()) {
            walDeleted = walFile.delete()
            Log.i(TAG, "Cleanup: -wal deleted: $walDeleted")
        } else {
            Log.i(TAG, "Cleanup: No -wal file present")
        }
        if (shmFile.exists()) {
            shmDeleted = shmFile.delete()
            Log.i(TAG, "Cleanup: -shm deleted: $shmDeleted")
        } else {
            Log.i(TAG, "Cleanup: No -shm file present")
        }

        val mainDbExists = File(liveDir, "dotynotes.db").exists()
        Log.i(TAG, "Cleanup complete: walDeleted=$walDeleted, shmDeleted=$shmDeleted, mainDbExists=$mainDbExists")

        return mapOf(
            "walDeleted" to walDeleted,
            "shmDeleted" to shmDeleted,
            "mainDbExists" to mainDbExists
        )
    }
}
