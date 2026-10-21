package com.dotynotes.overlay

import android.content.Context

/**
 * Legacy compatibility bridge for OverlayDatabaseHelper.
 * 
 * Delegates directly to OverlayNoteRepository to ensure that the native overlay
 * never independently opens the SQLite database file with incompatible binary locks.
 */
class OverlayDatabaseHelper(context: Context) {

    private val repository = OverlayNoteRepository.getInstance(context)

    fun getRecentNotes(limit: Int = 4): List<OverlayNoteRepository.OverlayNote> {
        return repository.getRecentNotes(limit)
    }

    fun insertQuickNote(title: String, content: String): Boolean {
        return repository.saveQuickNote(title, content)
    }
}
