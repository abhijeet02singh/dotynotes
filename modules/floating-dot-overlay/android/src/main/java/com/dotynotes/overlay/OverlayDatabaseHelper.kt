package com.dotynotes.overlay

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import java.io.File

/**
 * Shared SQLite Database Helper for the Native Android Floating Overlay.
 * 
 * Safely accesses the exact same database file ('dotynotes.db') initialized by expo-sqlite.
 * Enables Write-Ahead Logging (WAL) for safe, concurrent reads and writes between
 * the React Native UI and the background floating overlay.
 */
class OverlayDatabaseHelper(private val context: Context) {

    data class OverlayNote(
        val id: String,
        val title: String,
        val content: String,
        val colorSchemeId: String,
        val tag: String,
        val isPinned: Boolean,
        val isArchived: Boolean,
        val updatedAt: Long
    )

    /**
     * Resolves the exact SQLite database file used by expo-sqlite.
     * Checks both standard context.getDatabasePath("dotynotes.db") and legacy path.
     */
    fun getDatabaseFile(): File {
        val standardPath = context.getDatabasePath("dotynotes.db")
        if (standardPath.exists()) {
            return standardPath
        }

        val legacyPath = File(context.filesDir, "SQLite/dotynotes.db")
        if (legacyPath.exists()) {
            return legacyPath
        }

        // Default to standard path and ensure parent directories exist
        standardPath.parentFile?.mkdirs()
        return standardPath
    }

    /**
     * Opens the SQLite database with WAL mode enabled.
     */
    fun openDatabase(): SQLiteDatabase? {
        return try {
            val dbFile = getDatabaseFile()
            SQLiteDatabase.openDatabase(
                dbFile.absolutePath,
                null,
                SQLiteDatabase.OPEN_READWRITE or SQLiteDatabase.CREATE_IF_NECESSARY
            ).apply {
                enableWriteAheadLogging()
                // Ensure schema matches src/services/notesDb.js
                execSQL("""
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
                execSQL("CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes (isPinned);")
                execSQL("CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes (isArchived);")
                execSQL("CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updatedAt DESC);")
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Fetches recent unarchived notes from SQLite ordered by pin status and latest update.
     */
    fun getRecentNotes(limit: Int = 5): List<OverlayNote> {
        val notes = mutableListOf<OverlayNote>()
        val db = openDatabase() ?: return notes
        try {
            val cursor = db.rawQuery(
                "SELECT id, title, content, colorSchemeId, tag, isPinned, isArchived, updatedAt " +
                "FROM notes WHERE isArchived = 0 ORDER BY isPinned DESC, updatedAt DESC LIMIT ?",
                arrayOf(limit.toString())
            )
            cursor.use { c ->
                val idIdx = c.getColumnIndex("id")
                val titleIdx = c.getColumnIndex("title")
                val contentIdx = c.getColumnIndex("content")
                val colorIdx = c.getColumnIndex("colorSchemeId")
                val tagIdx = c.getColumnIndex("tag")
                val pinIdx = c.getColumnIndex("isPinned")
                val archIdx = c.getColumnIndex("isArchived")
                val updatedIdx = c.getColumnIndex("updatedAt")

                while (c.moveToNext()) {
                    notes.add(
                        OverlayNote(
                            id = if (idIdx >= 0) c.getString(idIdx) ?: "" else "",
                            title = if (titleIdx >= 0) c.getString(titleIdx) ?: "" else "",
                            content = if (contentIdx >= 0) c.getString(contentIdx) ?: "" else "",
                            colorSchemeId = if (colorIdx >= 0) c.getString(colorIdx) ?: "purple" else "purple",
                            tag = if (tagIdx >= 0) c.getString(tagIdx) ?: "General" else "General",
                            isPinned = if (pinIdx >= 0) c.getInt(pinIdx) == 1 else false,
                            isArchived = if (archIdx >= 0) c.getInt(archIdx) == 1 else false,
                            updatedAt = if (updatedIdx >= 0) c.getLong(updatedIdx) else System.currentTimeMillis()
                        )
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            db.close()
        }
        return notes
    }

    /**
     * Inserts a new quick note from the floating overlay into the SQLite database.
     */
    fun insertQuickNote(title: String, content: String): Boolean {
        val db = openDatabase() ?: return false
        return try {
            val now = System.currentTimeMillis()
            val id = "note_${now}_${(1000..9999).random()}"
            val values = ContentValues().apply {
                put("id", id)
                put("title", title.trim().ifEmpty { "Floating Quick Note" })
                put("content", content.trim())
                put("colorSchemeId", "purple")
                put("tag", "Floating")
                put("isPinned", 0)
                put("isArchived", 0)
                put("createdAt", now)
                put("updatedAt", now)
            }
            val rowId = db.insert("notes", null, values)
            rowId != -1L
        } catch (e: Exception) {
            e.printStackTrace()
            false
        } finally {
            db.close()
        }
    }
}
