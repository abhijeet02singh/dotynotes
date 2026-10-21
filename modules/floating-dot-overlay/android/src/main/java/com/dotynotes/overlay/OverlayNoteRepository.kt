package com.dotynotes.overlay

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Single Reliable Native Note Repository for the Floating Dot Overlay.
 * 
 * Replaces direct, conflicting SQLite access in the native overlay.
 * Uses a memory cache backed by isolated JSON files to eliminate incompatible
 * WAL/SHM file locking with expo-sqlite.
 */
class OverlayNoteRepository private constructor(private val context: Context) {

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

    private val recentCacheFile = File(context.filesDir, "overlay_recent_notes.json")
    private val pendingNotesFile = File(context.filesDir, "pending_overlay_notes.json")
    private val inMemoryRecentNotes = mutableListOf<OverlayNote>()
    private var onNoteSavedListener: ((String) -> Unit)? = null

    init {
        loadRecentNotesFromDisk()
    }

    companion object {
        private const val TAG = "DotyNotesOverlayRepo"

        @Volatile
        private var instance: OverlayNoteRepository? = null

        fun getInstance(context: Context): OverlayNoteRepository {
            return instance ?: synchronized(this) {
                instance ?: OverlayNoteRepository(context.applicationContext).also { instance = it }
            }
        }
    }

    fun setOnNoteSavedListener(listener: ((String) -> Unit)?) {
        this.onNoteSavedListener = listener
    }

    @Synchronized
    private fun loadRecentNotesFromDisk() {
        inMemoryRecentNotes.clear()
        if (recentCacheFile.exists() && recentCacheFile.isFile) {
            try {
                val jsonStr = recentCacheFile.readText()
                val array = JSONArray(jsonStr)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    inMemoryRecentNotes.add(parseNoteObject(obj))
                }
            } catch (e: Exception) {
                Log.w(TAG, "Diagnostic Warning: Could not parse recent notes cache: ${e.message}")
            }
        }
    }

    private fun parseNoteObject(obj: JSONObject): OverlayNote {
        return OverlayNote(
            id = obj.optString("id", ""),
            title = obj.optString("title", ""),
            content = obj.optString("content", ""),
            colorSchemeId = obj.optString("colorSchemeId", "purple"),
            tag = obj.optString("tag", "General"),
            isPinned = obj.optBoolean("isPinned", false),
            isArchived = obj.optBoolean("isArchived", false),
            updatedAt = obj.optLong("updatedAt", System.currentTimeMillis())
        )
    }

    /**
     * Updates the cached recent notes provided by the main React Native application.
     */
    @Synchronized
    fun syncRecentNotes(notesJson: String) {
        try {
            val array = JSONArray(notesJson)
            inMemoryRecentNotes.clear()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                inMemoryRecentNotes.add(parseNoteObject(obj))
            }
            recentCacheFile.writeText(notesJson)
            Log.i(TAG, "Diagnostic: Synced ${inMemoryRecentNotes.size} recent note(s) to overlay cache")
        } catch (e: Exception) {
            Log.w(TAG, "Diagnostic Error: Failed to sync recent notes: ${e.message}")
        }
    }

    /**
     * Gets recent notes for display in the Quick Pad overlay.
     * Merges in-memory recent notes with any newly captured pending notes.
     */
    @Synchronized
    fun getRecentNotes(limit: Int = 4): List<OverlayNote> {
        val pending = getPendingNotes()
        val combined = mutableListOf<OverlayNote>()
        
        // Put pending notes on top so user sees their newly saved notes immediately
        combined.addAll(pending)
        
        val existingIds = pending.map { it.id }.toSet()
        for (note in inMemoryRecentNotes) {
            if (!existingIds.contains(note.id)) {
                combined.add(note)
            }
        }

        return combined.take(limit)
    }

    /**
     * Captures a quick note from the floating overlay.
     * Persists to pending file and notifies active listeners.
     */
    @Synchronized
    fun saveQuickNote(title: String, content: String): Boolean {
        return try {
            val now = System.currentTimeMillis()
            val id = "note_${now}_${(1000..9999).random()}"
            val newNote = OverlayNote(
                id = id,
                title = title.trim().ifEmpty { "Quick Note" },
                content = content.trim(),
                colorSchemeId = "purple",
                tag = "Floating",
                isPinned = false,
                isArchived = false,
                updatedAt = now
            )

            // Append to pending notes
            val pendingArray = if (pendingNotesFile.exists()) {
                try {
                    JSONArray(pendingNotesFile.readText())
                } catch (e: Exception) {
                    JSONArray()
                }
            } else {
                JSONArray()
            }

            val noteObj = JSONObject().apply {
                put("id", newNote.id)
                put("title", newNote.title)
                put("content", newNote.content)
                put("colorSchemeId", newNote.colorSchemeId)
                put("tag", newNote.tag)
                put("isPinned", 0)
                put("isArchived", 0)
                put("createdAt", now)
                put("updatedAt", now)
            }

            pendingArray.put(noteObj)
            pendingNotesFile.writeText(pendingArray.toString(2))
            Log.i(TAG, "Diagnostic: Quick note captured in overlay staging queue (${pendingArray.length()} pending)")

            // Notify listener (e.g. FloatingDotModule event to React Native)
            onNoteSavedListener?.invoke(noteObj.toString())
            true
        } catch (e: Exception) {
            Log.e(TAG, "Diagnostic Error: Failed to save quick note: ${e.message}")
            false
        }
    }

    @Synchronized
    private fun getPendingNotes(): List<OverlayNote> {
        val list = mutableListOf<OverlayNote>()
        if (pendingNotesFile.exists() && pendingNotesFile.isFile) {
            try {
                val array = JSONArray(pendingNotesFile.readText())
                for (i in 0 until array.length()) {
                    list.add(parseNoteObject(array.getJSONObject(i)))
                }
            } catch (e: Exception) {
                Log.w(TAG, "Diagnostic Warning: Could not read pending notes: ${e.message}")
            }
        }
        return list
    }

    @Synchronized
    fun getPendingNotesJson(): String {
        return if (pendingNotesFile.exists() && pendingNotesFile.isFile) {
            try {
                pendingNotesFile.readText()
            } catch (e: Exception) {
                "[]"
            }
        } else {
            "[]"
        }
    }

    @Synchronized
    fun clearPendingNotes() {
        if (pendingNotesFile.exists()) {
            pendingNotesFile.delete()
            Log.i(TAG, "Diagnostic: Cleared pending notes staging file after SQLite sync")
        }
    }
}
