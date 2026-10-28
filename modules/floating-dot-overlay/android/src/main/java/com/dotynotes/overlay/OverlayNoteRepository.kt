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
 * Uses an in-memory cache backed by isolated JSON staging files to eliminate
 * WAL/SHM file locking and binary incompatibility with expo-sqlite.
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
        val createdAt: Long,
        val updatedAt: Long
    ) {
        fun toJsonObject(): JSONObject = JSONObject().apply {
            put("id", id)
            put("title", title)
            put("content", content)
            put("colorSchemeId", colorSchemeId)
            put("tag", tag)
            put("isPinned", if (isPinned) 1 else 0)
            put("isArchived", if (isArchived) 1 else 0)
            put("createdAt", createdAt)
            put("updatedAt", updatedAt)
        }
    }

    private val recentCacheFile = File(context.filesDir, "overlay_recent_notes.json")
    private val pendingNotesFile = File(context.filesDir, "pending_overlay_notes.json")
    private val pendingDeletionsFile = File(context.filesDir, "pending_overlay_deletions.json")

    private val inMemoryRecentNotes = mutableListOf<OverlayNote>()
    private var onMutationListener: ((type: String, data: String) -> Unit)? = null
    private var onRecentNotesUpdatedListener: (() -> Unit)? = null

    private val prefs = context.getSharedPreferences("dotynotes_overlay_theme_prefs", Context.MODE_PRIVATE)
    private val themeUpdatedListeners = java.util.concurrent.CopyOnWriteArrayList<() -> Unit>()

    @Volatile
    private var overlayColorTheme: String = "purple"

    @Volatile
    private var overlayTheme: String = "system"

    init {
        loadRecentNotesFromDisk()
        overlayColorTheme = prefs.getString("saved_color_theme", "purple") ?: "purple"
        val savedPayload = prefs.getString("saved_theme_payload", null)
        overlayTheme = if (!savedPayload.isNullOrBlank()) {
            savedPayload
        } else {
            prefs.getString("saved_appearance_mode", "system") ?: "system"
        }
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

    fun setOnMutationListener(listener: ((type: String, data: String) -> Unit)?) {
        this.onMutationListener = listener
    }

    // Keep legacy alias for FloatingDotModule compatibility
    fun setOnNoteSavedListener(listener: ((String) -> Unit)?) {
        this.onMutationListener = if (listener != null) {
            { _, data -> listener(data) }
        } else null
    }

    fun setOnRecentNotesUpdatedListener(listener: (() -> Unit)?) {
        this.onRecentNotesUpdatedListener = listener
    }

    fun addThemeUpdatedListener(listener: () -> Unit) {
        if (!themeUpdatedListeners.contains(listener)) {
            themeUpdatedListeners.add(listener)
        }
    }

    fun removeThemeUpdatedListener(listener: () -> Unit) {
        themeUpdatedListeners.remove(listener)
    }

    fun setOnThemeUpdatedListener(listener: (() -> Unit)?) {
        if (listener != null) {
            addThemeUpdatedListener(listener)
        }
    }

    fun setOverlayTheme(theme: String) {
        this.overlayTheme = theme
        val trimmed = theme.trim()

        // Extract colorTheme and appearanceMode if present
        var extractedColor = overlayColorTheme
        var extractedMode = "system"

        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                val json = JSONObject(trimmed)
                if (json.has("colorTheme")) {
                    extractedColor = json.getString("colorTheme").lowercase()
                }
                if (json.has("appearanceMode")) {
                    extractedMode = json.getString("appearanceMode").lowercase()
                }
            } catch (_: Exception) {}
        } else if (trimmed.contains(":")) {
            val parts = trimmed.split(":")
            extractedMode = parts[0].lowercase()
            extractedColor = parts[1].lowercase()
        } else {
            when (trimmed.lowercase()) {
                "dark" -> extractedMode = "dark"
                "light" -> extractedMode = "light"
                "system" -> extractedMode = "system"
                "purple", "sky", "orange", "mint", "pink", "periwinkle", "green" -> {
                    extractedColor = trimmed.lowercase()
                }
            }
        }

        this.overlayColorTheme = extractedColor

        try {
            prefs.edit()
                .putString("saved_theme_payload", theme)
                .putString("saved_color_theme", extractedColor)
                .putString("saved_appearance_mode", extractedMode)
                .apply()
        } catch (e: Exception) {
            Log.w(TAG, "Could not persist overlay theme to SharedPreferences: ${e.message}")
        }

        for (listener in themeUpdatedListeners) {
            try {
                listener.invoke()
            } catch (e: Exception) {
                Log.w(TAG, "Theme listener error: ${e.message}")
            }
        }
        onRecentNotesUpdatedListener?.invoke()
    }

    fun getOverlayTheme(): String = overlayTheme

    fun getOverlayColorTheme(): String = overlayColorTheme

    fun getResolvedTheme(isSystemDark: Boolean): OverlayTheme {
        return OverlayTheme.resolveTheme(overlayTheme, isSystemDark, overlayColorTheme)
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
        val now = System.currentTimeMillis()
        val isPinned = if (obj.has("isPinned")) {
            val v = obj.get("isPinned")
            if (v is Boolean) v else obj.optInt("isPinned", 0) == 1
        } else false

        val isArchived = if (obj.has("isArchived")) {
            val v = obj.get("isArchived")
            if (v is Boolean) v else obj.optInt("isArchived", 0) == 1
        } else false

        return OverlayNote(
            id = obj.optString("id", "note_$now"),
            title = obj.optString("title", "Quick Note"),
            content = obj.optString("content", ""),
            colorSchemeId = obj.optString("colorSchemeId", "purple"),
            tag = obj.optString("tag", "General"),
            isPinned = isPinned,
            isArchived = isArchived,
            createdAt = obj.optLong("createdAt", now),
            updatedAt = obj.optLong("updatedAt", now)
        )
    }

    /**
     * Updates the cached recent notes provided by the authoritative React Native SQLite store.
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
            Log.i(TAG, "Synced ${inMemoryRecentNotes.size} note(s) from app to overlay cache")
            onRecentNotesUpdatedListener?.invoke()
        } catch (e: Exception) {
            Log.w(TAG, "Failed syncing recent notes: ${e.message}")
        }
    }

    /**
     * Gets combined notes for the Quick Pad display:
     * Pending notes on top, then synced recent notes (excluding any pending deletions).
     */
    @Synchronized
    fun getRecentNotes(limit: Int = 5): List<OverlayNote> {
        val pending = getPendingNotes()
        val deletions = getPendingDeletionIds()

        val combined = mutableListOf<OverlayNote>()
        val seenIds = mutableSetOf<String>()

        // 1. Pending created/updated notes on top
        for (p in pending) {
            if (!deletions.contains(p.id)) {
                combined.add(p)
                seenIds.add(p.id)
            }
        }

        // 2. Synced notes from main app
        for (note in inMemoryRecentNotes) {
            if (!seenIds.contains(note.id) && !deletions.contains(note.id) && !note.isArchived) {
                combined.add(note)
                seenIds.add(note.id)
            }
        }

        return combined.take(limit)
    }

    /**
     * Saves a new quick note from the floating overlay.
     */
    @Synchronized
    fun saveQuickNote(
        title: String,
        content: String,
        colorSchemeId: String = "purple",
        tag: String = "Floating",
        isPinned: Boolean = false,
        isArchived: Boolean = false
    ): OverlayNote? {
        return try {
            val now = System.currentTimeMillis()
            val id = "note_${now}_${(1000..9999).random()}"
            val newNote = OverlayNote(
                id = id,
                title = title.trim().ifEmpty { "Quick Note" },
                content = content.trim(),
                colorSchemeId = colorSchemeId.ifEmpty { "purple" },
                tag = tag.ifEmpty { "Floating" },
                isPinned = isPinned,
                isArchived = isArchived,
                createdAt = now,
                updatedAt = now
            )

            // Add to pending notes
            val pendingArray = loadJsonArray(pendingNotesFile)
            pendingArray.put(newNote.toJsonObject())
            pendingNotesFile.writeText(pendingArray.toString(2))

            // Update in-memory recent
            inMemoryRecentNotes.add(0, newNote)
            saveInMemoryRecentToDisk()

            Log.i(TAG, "Quick note captured: ${newNote.id}")
            onMutationListener?.invoke("CREATE", newNote.toJsonObject().toString())
            onRecentNotesUpdatedListener?.invoke()
            newNote
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save quick note: ${e.message}")
            null
        }
    }

    /**
     * Updates an existing note from the floating overlay.
     */
    @Synchronized
    fun updateQuickNote(
        id: String,
        title: String,
        content: String,
        colorSchemeId: String? = null,
        tag: String? = null,
        isPinned: Boolean? = null,
        isArchived: Boolean? = null
    ): Boolean {
        return try {
            val now = System.currentTimeMillis()
            val existing = inMemoryRecentNotes.find { it.id == id }
                ?: getPendingNotes().find { it.id == id }

            val updatedNote = OverlayNote(
                id = id,
                title = title.trim().ifEmpty { "Quick Note" },
                content = content.trim(),
                colorSchemeId = colorSchemeId ?: existing?.colorSchemeId ?: "purple",
                tag = tag ?: existing?.tag ?: "Floating",
                isPinned = isPinned ?: existing?.isPinned ?: false,
                isArchived = isArchived ?: existing?.isArchived ?: false,
                createdAt = existing?.createdAt ?: now,
                updatedAt = now
            )

            // Update pending notes file
            val pendingArray = loadJsonArray(pendingNotesFile)
            var replaced = false
            for (i in 0 until pendingArray.length()) {
                val obj = pendingArray.getJSONObject(i)
                if (obj.optString("id") == id) {
                    pendingArray.put(i, updatedNote.toJsonObject())
                    replaced = true
                    break
                }
            }
            if (!replaced) {
                pendingArray.put(updatedNote.toJsonObject())
            }
            pendingNotesFile.writeText(pendingArray.toString(2))

            // Update in-memory list
            val idx = inMemoryRecentNotes.indexOfFirst { it.id == id }
            if (idx >= 0) {
                inMemoryRecentNotes[idx] = updatedNote
            } else {
                inMemoryRecentNotes.add(0, updatedNote)
            }
            saveInMemoryRecentToDisk()

            Log.i(TAG, "Quick note updated: $id")
            onMutationListener?.invoke("UPDATE", updatedNote.toJsonObject().toString())
            onRecentNotesUpdatedListener?.invoke()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update quick note: ${e.message}")
            false
        }
    }

    /**
     * Toggles the archive / completed status of a note from the floating overlay.
     */
    @Synchronized
    fun toggleArchiveQuickNote(id: String): Boolean {
        return try {
            val note = inMemoryRecentNotes.find { it.id == id }
                ?: getPendingNotes().find { it.id == id }
                ?: return false

            val updatedNote = note.copy(
                isArchived = !note.isArchived,
                updatedAt = System.currentTimeMillis()
            )

            val idx = inMemoryRecentNotes.indexOfFirst { it.id == id }
            if (idx >= 0) {
                inMemoryRecentNotes[idx] = updatedNote
            } else {
                inMemoryRecentNotes.add(0, updatedNote)
            }
            saveInMemoryRecentToDisk()

            val pendingArray = loadJsonArray(pendingNotesFile)
            var replaced = false
            for (i in 0 until pendingArray.length()) {
                val obj = pendingArray.getJSONObject(i)
                if (obj.optString("id") == id) {
                    pendingArray.put(i, updatedNote.toJsonObject())
                    replaced = true
                    break
                }
            }
            if (!replaced) {
                pendingArray.put(updatedNote.toJsonObject())
            }
            pendingNotesFile.writeText(pendingArray.toString(2))

            Log.i(TAG, "Toggled archive for note: $id, now archived: ${updatedNote.isArchived}")
            onMutationListener?.invoke("ARCHIVE", updatedNote.toJsonObject().toString())
            onRecentNotesUpdatedListener?.invoke()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed toggling archive for quick note: ${e.message}")
            false
        }
    }

    /**
     * Toggles the pin status of a note from the floating overlay.
     */
    @Synchronized
    fun togglePinQuickNote(id: String): Boolean {
        return try {
            val note = inMemoryRecentNotes.find { it.id == id }
                ?: getPendingNotes().find { it.id == id }
                ?: return false

            val updatedNote = note.copy(
                isPinned = !note.isPinned,
                updatedAt = System.currentTimeMillis()
            )

            // Update in-memory
            val idx = inMemoryRecentNotes.indexOfFirst { it.id == id }
            if (idx >= 0) {
                inMemoryRecentNotes[idx] = updatedNote
            } else {
                inMemoryRecentNotes.add(0, updatedNote)
            }
            saveInMemoryRecentToDisk()

            // Update pending notes
            val pendingArray = loadJsonArray(pendingNotesFile)
            var replaced = false
            for (i in 0 until pendingArray.length()) {
                val obj = pendingArray.getJSONObject(i)
                if (obj.optString("id") == id) {
                    pendingArray.put(i, updatedNote.toJsonObject())
                    replaced = true
                    break
                }
            }
            if (!replaced) {
                pendingArray.put(updatedNote.toJsonObject())
            }
            pendingNotesFile.writeText(pendingArray.toString(2))

            Log.i(TAG, "Toggled pin for note: $id, now pinned: ${updatedNote.isPinned}")
            onMutationListener?.invoke("PIN", updatedNote.toJsonObject().toString())
            onRecentNotesUpdatedListener?.invoke()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed toggling pin for quick note: ${e.message}")
            false
        }
    }

    /**
     * Deletes a note from the floating overlay.
     */
    @Synchronized
    fun deleteQuickNote(id: String): Boolean {
        return try {
            // Remove from in-memory
            inMemoryRecentNotes.removeAll { it.id == id }
            saveInMemoryRecentToDisk()

            // Remove from pending notes if present
            val pendingArray = loadJsonArray(pendingNotesFile)
            val newPending = JSONArray()
            for (i in 0 until pendingArray.length()) {
                val obj = pendingArray.getJSONObject(i)
                if (obj.optString("id") != id) {
                    newPending.put(obj)
                }
            }
            pendingNotesFile.writeText(newPending.toString(2))

            // Record into pending deletions
            val deletionsArray = loadJsonArray(pendingDeletionsFile)
            var alreadyPresent = false
            for (i in 0 until deletionsArray.length()) {
                if (deletionsArray.getString(i) == id) {
                    alreadyPresent = true
                    break
                }
            }
            if (!alreadyPresent) {
                deletionsArray.put(id)
                pendingDeletionsFile.writeText(deletionsArray.toString(2))
            }

            Log.i(TAG, "Quick note queued for deletion: $id")
            onMutationListener?.invoke("DELETE", id)
            onRecentNotesUpdatedListener?.invoke()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete quick note: ${e.message}")
            false
        }
    }

    @Synchronized
    private fun saveInMemoryRecentToDisk() {
        try {
            val arr = JSONArray()
            for (n in inMemoryRecentNotes) {
                arr.put(n.toJsonObject())
            }
            recentCacheFile.writeText(arr.toString(2))
        } catch (e: Exception) {
            Log.w(TAG, "Failed saving recent cache: ${e.message}")
        }
    }

    private fun loadJsonArray(file: File): JSONArray {
        if (!file.exists() || !file.isFile) return JSONArray()
        return try {
            val content = file.readText().trim()
            if (content.isEmpty()) JSONArray() else JSONArray(content)
        } catch (e: Exception) {
            JSONArray()
        }
    }

    @Synchronized
    private fun getPendingNotes(): List<OverlayNote> {
        val list = mutableListOf<OverlayNote>()
        val array = loadJsonArray(pendingNotesFile)
        for (i in 0 until array.length()) {
            list.add(parseNoteObject(array.getJSONObject(i)))
        }
        return list
    }

    @Synchronized
    fun getPendingDeletionIds(): Set<String> {
        val set = mutableSetOf<String>()
        val array = loadJsonArray(pendingDeletionsFile)
        for (i in 0 until array.length()) {
            set.add(array.getString(i))
        }
        return set
    }

    @Synchronized
    fun getPendingNotesJson(): String {
        return if (pendingNotesFile.exists() && pendingNotesFile.isFile) {
            pendingNotesFile.readText()
        } else "[]"
    }

    @Synchronized
    fun getPendingMutationsJson(): String {
        val result = JSONObject()
        result.put("notes", loadJsonArray(pendingNotesFile))
        result.put("deletions", loadJsonArray(pendingDeletionsFile))
        return result.toString()
    }

    @Synchronized
    fun clearPendingNotes() {
        if (pendingNotesFile.exists()) {
            pendingNotesFile.delete()
        }
    }

    @Synchronized
    fun clearPendingMutations() {
        if (pendingNotesFile.exists()) {
            pendingNotesFile.delete()
        }
        if (pendingDeletionsFile.exists()) {
            pendingDeletionsFile.delete()
        }
        Log.i(TAG, "Cleared all overlay pending staging queues")
    }
}
