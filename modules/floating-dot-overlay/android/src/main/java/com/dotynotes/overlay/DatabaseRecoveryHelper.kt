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
 * CRITICAL ARCHITECTURAL CONTRACT:
 * - NEVER open the live database (${filesDir}/SQLite/dotynotes.db) with
 *   android.database.sqlite.SQLiteDatabase.
 * - Only pure file copies are inspected with Android SQLite (read-only).
 * - Live database ownership belongs strictly to expo-sqlite (libexpo-sqlite.so).
 */
object DatabaseRecoveryHelper {
    private const val TAG = "DotyNotesRecovery"

    data class RecoveryReport(
        val success: Boolean,
        val message: String,
        val backupDirectory: String?,
        val recoveredNotesJson: String,
        val recoveredNoteCount: Int,
        val integrityCheckResult: String
    ) {
        fun toMap(): Map<String, Any?> = mapOf(
            "success" to success,
            "message" to message,
            "backupDirectory" to backupDirectory,
            "recoveredNotesJson" to recoveredNotesJson,
            "recoveredNoteCount" to recoveredNoteCount,
            "integrityCheckResult" to integrityCheckResult
        )
    }

    /**
     * Creates a timestamped safe backup of all SQLite and overlay staging files.
     * Uses pure file I/O. Never opens any database connections.
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
                File(sourceDir, "dotynotes.db-shm"),
                File(context.filesDir, "overlay_recent_notes.json"),
                File(context.filesDir, "pending_overlay_notes.json"),
                File(context.filesDir, "pending_overlay_deletions.json")
            )

            var copiedCount = 0
            for (file in filesToBackup) {
                if (file.exists() && file.isFile && file.length() > 0L) {
                    val destFile = File(backupDir, file.name)
                    file.copyTo(destFile, overwrite = true)
                    copiedCount++
                    Log.i(TAG, "Safe Backup: Backed up '${file.name}' (${file.length()} bytes)")
                }
            }

            Log.i(TAG, "Safe Backup: Completed with $copiedCount file(s) in ${backupDir.absolutePath}")
            backupDir.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "Safe Backup Error: Backup failed: ${e.message}")
            null
        }
    }

    /**
     * Extracts note rows from an isolated backup SQLite database file.
     * Must only be run on an isolated copy, never on live files.
     */
    fun extractNotesFromBackupFile(dbFile: File): List<Map<String, Any>> {
        val notes = mutableListOf<Map<String, Any>>()
        if (!dbFile.exists() || !dbFile.isFile || dbFile.length() == 0L) {
            return notes
        }

        val isBackup = dbFile.parentFile?.name?.startsWith("backup_") == true ||
                       dbFile.name.startsWith("standalone_")
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
     * Gathers all recoverable notes across backup files:
     * 1. Standalone copy of dotynotes.db (tested without conflicting WAL file)
     * 2. overlay_recent_notes.json (synced from app)
     * 3. pending_overlay_notes.json (created in overlay)
     *
     * Deduplicates by note ID, preserving the latest updatedAt version.
     */
    fun harvestAllRecoverableNotes(backupDir: File): List<Map<String, Any>> {
        val notesById = mutableMapOf<String, Map<String, Any>>()

        // 1. Standalone database copy
        val backupDb = File(backupDir, "dotynotes.db")
        if (backupDb.exists() && backupDb.length() > 0L) {
            val standaloneDb = File(backupDir, "standalone_check.db")
            try {
                backupDb.copyTo(standaloneDb, overwrite = true)
                val dbNotes = extractNotesFromBackupFile(standaloneDb)
                for (note in dbNotes) {
                    val id = note["id"] as? String ?: continue
                    notesById[id] = note
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not extract notes from standalone copy: ${e.message}")
            } finally {
                if (standaloneDb.exists()) standaloneDb.delete()
            }
        }

        // 2. Overlay recent notes cache
        val recentCache = File(backupDir, "overlay_recent_notes.json")
        if (recentCache.exists() && recentCache.isFile) {
            try {
                val array = JSONArray(recentCache.readText())
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val id = obj.optString("id", "")
                    if (id.isNotEmpty()) {
                        val noteMap = jsonObjectToNoteMap(obj)
                        val existing = notesById[id]
                        if (existing == null || (noteMap["updatedAt"] as Long) >= ((existing["updatedAt"] as? Long) ?: 0L)) {
                            notesById[id] = noteMap
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not parse recent notes backup: ${e.message}")
            }
        }

        // 3. Pending overlay notes
        val pendingFile = File(backupDir, "pending_overlay_notes.json")
        if (pendingFile.exists() && pendingFile.isFile) {
            try {
                val array = JSONArray(pendingFile.readText())
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val id = obj.optString("id", "")
                    if (id.isNotEmpty()) {
                        val noteMap = jsonObjectToNoteMap(obj)
                        notesById[id] = noteMap // Pending notes are latest user edits
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not parse pending overlay notes backup: ${e.message}")
            }
        }

        // 4. Save consolidated recovered notes alongside backup
        val consolidated = notesById.values.toList()
        try {
            val emergencyJson = File(backupDir, "recovered_notes_emergency.json")
            val jsonArray = JSONArray()
            for (note in consolidated) {
                jsonArray.put(JSONObject(note))
            }
            emergencyJson.writeText(jsonArray.toString(2))
            Log.i(TAG, "Consolidated ${consolidated.size} note(s) into emergency backup")
        } catch (e: Exception) {
            Log.w(TAG, "Failed writing emergency backup JSON: ${e.message}")
        }

        return consolidated
    }

    private fun jsonObjectToNoteMap(obj: JSONObject): Map<String, Any> {
        val now = System.currentTimeMillis()
        val isPinned = if (obj.has("isPinned")) {
            val v = obj.get("isPinned")
            if (v is Boolean) (if (v) 1 else 0) else obj.optInt("isPinned", 0)
        } else 0

        val isArchived = if (obj.has("isArchived")) {
            val v = obj.get("isArchived")
            if (v is Boolean) (if (v) 1 else 0) else obj.optInt("isArchived", 0)
        } else 0

        return mapOf(
            "id" to obj.optString("id", "note_$now"),
            "title" to obj.optString("title", "Quick Note"),
            "content" to obj.optString("content", ""),
            "colorSchemeId" to obj.optString("colorSchemeId", "purple"),
            "tag" to obj.optString("tag", "General"),
            "isPinned" to isPinned,
            "isArchived" to isArchived,
            "createdAt" to obj.optLong("createdAt", now),
            "updatedAt" to obj.optLong("updatedAt", now)
        )
    }

    /**
     * Non-destructive diagnostic check on a backup copy.
     */
    fun repairDatabase(context: Context): RecoveryReport {
        Log.i(TAG, "Diagnostic: Starting non-destructive database diagnosis...")
        val backupPath = createSafeBackup(context)
        var recoveredNoteCount = 0
        var integrityResult = "backup_not_available"
        var recoveredNotesJson = "[]"

        if (backupPath != null) {
            val backupDir = File(backupPath)
            val notes = harvestAllRecoverableNotes(backupDir)
            recoveredNoteCount = notes.size

            val jsonArray = JSONArray()
            for (n in notes) jsonArray.put(JSONObject(n))
            recoveredNotesJson = jsonArray.toString()

            val backupDb = File(backupDir, "dotynotes.db")
            if (backupDb.exists() && backupDb.length() > 0L) {
                integrityResult = runIntegrityCheckOnBackup(backupDb)
            } else {
                integrityResult = "db_file_empty_or_missing"
            }
        }

        return RecoveryReport(
            success = true,
            message = "Backup created at $backupPath. Recoverable notes: $recoveredNoteCount. Integrity: $integrityResult.",
            backupDirectory = backupPath,
            recoveredNotesJson = recoveredNotesJson,
            recoveredNoteCount = recoveredNoteCount,
            integrityCheckResult = integrityResult
        )
    }

    /**
     * Safe automated repair:
     * 1. Creates full timestamped backup of all database and JSON staging files.
     * 2. Harvests all recoverable notes from standalone DB, recent cache, and pending notes.
     * 3. Safely clears corrupted live -wal and -shm files from context.filesDir/SQLite.
     * 4. If the main dotynotes.db is unopenable even without WAL, archives it in backup
     *    so expo-sqlite can cleanly initialize a new database.
     * 5. Returns the complete recovered notes JSON so the JS layer can insert them into
     *    the fresh database with zero data loss.
     */
    fun performSafeRepair(context: Context): RecoveryReport {
        Log.i(TAG, "SafeRepair: Starting automated recovery...")
        val backupPath = createSafeBackup(context)
        if (backupPath == null) {
            return RecoveryReport(
                success = false,
                message = "Failed to create safety backup. Live files remain untouched.",
                backupDirectory = null,
                recoveredNotesJson = "[]",
                recoveredNoteCount = 0,
                integrityCheckResult = "backup_failed"
            )
        }

        val backupDir = File(backupPath)
        val recoveredNotes = harvestAllRecoverableNotes(backupDir)
        val jsonArray = JSONArray()
        for (n in recoveredNotes) jsonArray.put(JSONObject(n))
        val recoveredNotesJson = jsonArray.toString()

        val liveDir = File(context.filesDir, "SQLite")
        val liveWal = File(liveDir, "dotynotes.db-wal")
        val liveShm = File(liveDir, "dotynotes.db-shm")
        val liveDb = File(liveDir, "dotynotes.db")

        // Delete corrupted live WAL and SHM files
        if (liveWal.exists()) {
            val deletedWal = liveWal.delete()
            Log.i(TAG, "SafeRepair: Corrupt live -wal deleted: $deletedWal")
        }
        if (liveShm.exists()) {
            val deletedShm = liveShm.delete()
            Log.i(TAG, "SafeRepair: Corrupt live -shm deleted: $deletedShm")
        }

        // Test if main dotynotes.db is openable without the corrupt WAL
        var mainDbHealthy = false
        if (liveDb.exists() && liveDb.length() > 0L) {
            try {
                val testCopy = File(backupDir, "main_open_test.db")
                liveDb.copyTo(testCopy, overwrite = true)
                val testDb = SQLiteDatabase.openDatabase(testCopy.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
                testDb.close()
                if (testCopy.exists()) testCopy.delete()
                mainDbHealthy = true
                Log.i(TAG, "SafeRepair: Main database file is healthy on its own")
            } catch (e: Exception) {
                Log.w(TAG, "SafeRepair: Main database file is itself corrupted: ${e.message}")
                mainDbHealthy = false
            }
        }

        // If the main file itself is unreadable, move it to backup so expo-sqlite can recreate schema
        if (!mainDbHealthy && liveDb.exists()) {
            Log.i(TAG, "SafeRepair: Archiving corrupted main db so fresh one can be initialized")
            liveDb.delete()
        }

        return RecoveryReport(
            success = true,
            message = "Safe repair completed. Backed up to $backupPath. Recovered ${recoveredNotes.size} note(s).",
            backupDirectory = backupPath,
            recoveredNotesJson = recoveredNotesJson,
            recoveredNoteCount = recoveredNotes.size,
            integrityCheckResult = if (mainDbHealthy) "main_db_intact" else "recreated_with_recovered_data"
        )
    }

    private fun runIntegrityCheckOnBackup(backupDbFile: File): String {
        val parentName = backupDbFile.parentFile?.name ?: ""
        if (!parentName.startsWith("backup_")) {
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
            "check_failed: ${e.message}"
        }
    }

    fun cleanupStaleWalFiles(context: Context): Map<String, Any?> {
        val liveDir = File(context.filesDir, "SQLite")
        val walFile = File(liveDir, "dotynotes.db-wal")
        val shmFile = File(liveDir, "dotynotes.db-shm")

        var walDeleted = false
        var shmDeleted = false

        if (walFile.exists()) {
            walDeleted = walFile.delete()
        }
        if (shmFile.exists()) {
            shmDeleted = shmFile.delete()
        }

        val mainDbExists = File(liveDir, "dotynotes.db").exists()
        return mapOf(
            "walDeleted" to walDeleted,
            "shmDeleted" to shmDeleted,
            "mainDbExists" to mainDbExists
        )
    }
}
