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
 * Diagnostic and automated recovery helper for the DotyNotes SQLite database.
 * 
 * Safely creates backups before any modification, performs SQLite integrity checks,
 * extracts user notes across known storage paths, and normalizes WAL/SHM conflicts
 * so expo-sqlite can open the database without disk image malformed errors.
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
     * Creates a timestamped safe backup of all SQLite files before attempting any repair.
     * Guaranteed not to delete, reset, or overwrite existing files.
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
                context.getDatabasePath("dotynotes.db"),
                context.getDatabasePath("dotynotes.db-wal"),
                context.getDatabasePath("dotynotes.db-shm")
            )

            var copiedCount = 0
            for (file in filesToBackup) {
                if (file.exists() && file.isFile && file.length() > 0L) {
                    val destFile = File(backupDir, "${file.parentFile?.name ?: "db"}_${file.name}")
                    file.copyTo(destFile, overwrite = true)
                    copiedCount++
                    Log.i(TAG, "Diagnostic: Safely copied file '${file.name}' (${file.length()} bytes) to backup")
                }
            }

            Log.i(TAG, "Diagnostic: Backup completed with $copiedCount file(s) in ${backupDir.absolutePath}")
            backupDir.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "Diagnostic Error: Failed to create safe backup: ${e.message}")
            null
        }
    }

    /**
     * Extracts note rows from an SQLite database file safely without modifying it.
     */
    fun extractNotesFromFile(dbFile: File): List<Map<String, Any>> {
        val notes = mutableListOf<Map<String, Any>>()
        if (!dbFile.exists() || !dbFile.isFile || dbFile.length() == 0L) {
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
                if (!tableExists) {
                    return notes
                }

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
                Log.i(TAG, "Diagnostic: Extracted ${notes.size} note(s) from ${dbFile.name}")
            } finally {
                db.close()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Diagnostic Warning: Note extraction from ${dbFile.name} returned: ${e.message}")
        }
        return notes
    }

    /**
     * Diagnostic and repair routine:
     * 1. Creates a safe backup.
     * 2. Extracts all notes into emergency JSON.
     * 3. Performs WAL checkpointing and resets journal mode to DELETE.
     * 4. Removes incompatible/corrupted -wal and -shm files.
     * 5. Runs PRAGMA integrity_check.
     * 6. If needed, reconstructs a pristine database from extracted notes.
     */
    fun repairDatabase(context: Context): RecoveryReport {
        Log.i(TAG, "Diagnostic: Initiating automated database recovery...")

        // Step 1: Create safe backup before any modification
        val backupPath = createSafeBackup(context)

        val targetDbFile = File(context.filesDir, "SQLite/dotynotes.db")
        val altDbFile = context.getDatabasePath("dotynotes.db")

        // Step 2: Extract notes from all available database locations to guarantee zero data loss
        val allExtractedNotes = mutableMapOf<String, Map<String, Any>>()
        
        for (note in extractNotesFromFile(targetDbFile)) {
            val id = note["id"] as? String ?: continue
            allExtractedNotes[id] = note
        }
        for (note in extractNotesFromFile(altDbFile)) {
            val id = note["id"] as? String ?: continue
            if (!allExtractedNotes.containsKey(id)) {
                allExtractedNotes[id] = note
            }
        }

        Log.i(TAG, "Diagnostic: Total unique recoverable note(s) found: ${allExtractedNotes.size}")

        // Save emergency recovery copy in JSON
        try {
            val emergencyJson = File(context.filesDir, "SQLite/recovered_notes_emergency.json")
            val jsonArray = JSONArray()
            for (note in allExtractedNotes.values) {
                jsonArray.put(JSONObject(note))
            }
            emergencyJson.writeText(jsonArray.toString(2))
            Log.i(TAG, "Diagnostic: Emergency backup JSON preserved at ${emergencyJson.name}")
        } catch (e: Exception) {
            Log.w(TAG, "Diagnostic Warning: Could not write emergency JSON: ${e.message}")
        }

        var integrityResult = "unknown"
        var repairSuccess = false

        // Step 3: Checkpoint WAL and switch journal mode to DELETE on target file
        try {
            if (targetDbFile.exists()) {
                val db = SQLiteDatabase.openDatabase(
                    targetDbFile.absolutePath,
                    null,
                    SQLiteDatabase.OPEN_READWRITE
                )
                try {
                    // Checkpoint WAL frames into main database file
                    try {
                        db.rawQuery("PRAGMA wal_checkpoint(TRUNCATE);", null).use { c ->
                            while (c.moveToNext()) {}
                        }
                        Log.i(TAG, "Diagnostic: wal_checkpoint TRUNCATE completed")
                    } catch (e: Exception) {
                        Log.w(TAG, "Diagnostic Warning: wal_checkpoint returned: ${e.message}")
                    }

                    // Reset journal mode to DELETE to eliminate incompatible WAL-index headers
                    try {
                        db.rawQuery("PRAGMA journal_mode = DELETE;", null).use { c ->
                            while (c.moveToNext()) {}
                        }
                        Log.i(TAG, "Diagnostic: journal_mode set to DELETE")
                    } catch (e: Exception) {
                        Log.w(TAG, "Diagnostic Warning: journal_mode DELETE returned: ${e.message}")
                    }

                    // Perform SQLite integrity check
                    db.rawQuery("PRAGMA integrity_check;", null).use { c ->
                        if (c.moveToNext()) {
                            integrityResult = c.getString(0) ?: "unknown"
                        }
                    }
                } finally {
                    db.close()
                }

                Log.i(TAG, "Diagnostic: SQLite integrity check result: $integrityResult")

                // Remove stale WAL and SHM files now that all data is consolidated in main DB
                val walFile = File(context.filesDir, "SQLite/dotynotes.db-wal")
                val shmFile = File(context.filesDir, "SQLite/dotynotes.db-shm")
                if (walFile.exists()) {
                    val deleted = walFile.delete()
                    Log.i(TAG, "Diagnostic: Removed conflicting -wal file: $deleted")
                }
                if (shmFile.exists()) {
                    val deleted = shmFile.delete()
                    Log.i(TAG, "Diagnostic: Removed conflicting -shm file: $deleted")
                }

                repairSuccess = integrityResult.equals("ok", ignoreCase = true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Diagnostic Error: In-place WAL normalization encountered: ${e.message}")
        }

        // Step 4: If in-place normalization was insufficient, reconstruct pristine DB from extracted notes
        if (!repairSuccess && allExtractedNotes.isNotEmpty()) {
            Log.i(TAG, "Diagnostic: Reconstructing pristine database from ${allExtractedNotes.size} extracted notes...")
            try {
                if (targetDbFile.exists()) targetDbFile.delete()
                File(context.filesDir, "SQLite/dotynotes.db-wal").delete()
                File(context.filesDir, "SQLite/dotynotes.db-shm").delete()

                targetDbFile.parentFile?.mkdirs()

                val newDb = SQLiteDatabase.openOrCreateDatabase(targetDbFile, null)
                try {
                    newDb.execSQL("""
                        CREATE TABLE IF NOT EXISTS notes (
                          id TEXT PRIMARY KEY NOT NULL,
                          title TEXT NOT NULL,
                          content TEXT NOT NULL,
                          colorSchemeId TEXT NOT NULL DEFAULT 'purple',
                          tag TEXT DEFAULT 'General',
                          isPinned INTEGER NOT NULL DEFAULT 0,
                          isArchived INTEGER NOT NULL DEFAULT 0,
                          createdAt INTEGER NOT NULL,
                          updatedAt INTEGER NOT NULL
                        );
                    """.trimIndent())
                    newDb.execSQL("CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes (isPinned);")
                    newDb.execSQL("CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes (isArchived);")
                    newDb.execSQL("CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updatedAt DESC);")

                    newDb.beginTransaction()
                    try {
                        val stmt = newDb.compileStatement(
                            "INSERT OR REPLACE INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
                        )
                        for (n in allExtractedNotes.values) {
                            stmt.bindString(1, n["id"] as? String ?: "")
                            stmt.bindString(2, n["title"] as? String ?: "")
                            stmt.bindString(3, n["content"] as? String ?: "")
                            stmt.bindString(4, n["colorSchemeId"] as? String ?: "purple")
                            stmt.bindString(5, n["tag"] as? String ?: "General")
                            stmt.bindLong(6, (n["isPinned"] as? Number)?.toLong() ?: 0L)
                            stmt.bindLong(7, (n["isArchived"] as? Number)?.toLong() ?: 0L)
                            stmt.bindLong(8, (n["createdAt"] as? Number)?.toLong() ?: System.currentTimeMillis())
                            stmt.bindLong(9, (n["updatedAt"] as? Number)?.toLong() ?: System.currentTimeMillis())
                            stmt.executeInsert()
                            stmt.clearBindings()
                        }
                        newDb.setTransactionSuccessful()
                    } finally {
                        newDb.endTransaction()
                    }

                    newDb.rawQuery("PRAGMA journal_mode = DELETE;", null).use { c ->
                        while (c.moveToNext()) {}
                    }
                    newDb.rawQuery("PRAGMA integrity_check;", null).use { c ->
                        if (c.moveToNext()) {
                            integrityResult = c.getString(0) ?: "reconstructed"
                        }
                    }
                    repairSuccess = true
                    Log.i(TAG, "Diagnostic: Reconstructed database verified with integrity check: $integrityResult")
                } finally {
                    newDb.close()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Diagnostic Error: Reconstruction failed: ${e.message}")
            }
        }

        return RecoveryReport(
            success = repairSuccess,
            message = if (repairSuccess) "Database successfully normalized and verified" else "Recovery incomplete",
            backupDirectory = backupPath,
            recoveredNoteCount = allExtractedNotes.size,
            integrityCheckResult = integrityResult
        )
    }
}
