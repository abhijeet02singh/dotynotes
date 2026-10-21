package com.dotynotes.overlay

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.*

/**
 * Compact Quick Notes Panel for System-Level Floating Overlay.
 * 
 * Provides an in-overlay editor to quickly type, edit, and delete notes connected
 * to the shared DotyNotes repository, with full real-time synchronization.
 */
class QuickNotesOverlayView(
    context: Context,
    private val repository: OverlayNoteRepository,
    private val onClose: () -> Unit,
    private val onNoteSavedCallback: () -> Unit
) : FrameLayout(context) {

    private val density = resources.displayMetrics.density
    private val recentNotesContainer: LinearLayout
    private val titleInput: EditText
    private val contentInput: EditText
    private val saveBtn: Button
    private val cancelEditBtn: TextView
    private var editingNoteId: String? = null

    init {
        // Main Card Container
        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#FFFFFF"))
                cornerRadius = 16 * density
                setStroke((1.5f * density).toInt(), Color.parseColor("#E2E8F0"))
            }
            elevation = 16 * density
            setPadding((16 * density).toInt(), (14 * density).toInt(), (16 * density).toInt(), (16 * density).toInt())
        }

        // --- 1. Header Row ---
        val headerRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, (10 * density).toInt())
        }

        val titleView = TextView(context).apply {
            text = "DotyNotes Quick Pad"
            setTextColor(Color.parseColor("#6D28D9"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val closeBtn = TextView(context).apply {
            text = "✕"
            setTextColor(Color.parseColor("#64748B"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            val btnSize = (32 * density).toInt()
            layoutParams = LinearLayout.LayoutParams(btnSize, btnSize)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#F1F5F9"))
                cornerRadius = 16 * density
            }
            setOnClickListener { onClose() }
        }

        headerRow.addView(titleView)
        headerRow.addView(closeBtn)
        card.addView(headerRow)

        // --- 2. Title Input ---
        titleInput = EditText(context).apply {
            hint = "Note Title..."
            setHintTextColor(Color.parseColor("#94A3B8"))
            setTextColor(Color.parseColor("#0F172A"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding((10 * density).toInt(), (8 * density).toInt(), (10 * density).toInt(), (8 * density).toInt())
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#F8FAFC"))
                cornerRadius = 8 * density
                setStroke((1 * density).toInt(), Color.parseColor("#E2E8F0"))
            }
            maxLines = 1
            setSingleLine(true)
        }
        card.addView(titleInput)

        // Spacer
        card.addView(View(context).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (6 * density).toInt())
        })

        // --- 3. Content Input ---
        contentInput = EditText(context).apply {
            hint = "Type your quick note here..."
            setHintTextColor(Color.parseColor("#94A3B8"))
            setTextColor(Color.parseColor("#0F172A"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding((10 * density).toInt(), (8 * density).toInt(), (10 * density).toInt(), (8 * density).toInt())
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#F8FAFC"))
                cornerRadius = 8 * density
                setStroke((1 * density).toInt(), Color.parseColor("#E2E8F0"))
            }
            minLines = 2
            maxLines = 4
            gravity = Gravity.TOP or Gravity.START
        }
        card.addView(contentInput)

        // Spacer
        card.addView(View(context).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (8 * density).toInt())
        })

        // --- 4. Buttons Row (Save/Update + Cancel) ---
        val buttonsRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        saveBtn = Button(context).apply {
            text = "Save Note 💾"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.DEFAULT_BOLD
            isAllCaps = false
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#6D28D9"))
                cornerRadius = 20 * density
            }
            layoutParams = LinearLayout.LayoutParams(0, (40 * density).toInt(), 1f)
            setOnClickListener { handleSaveOrUpdate() }
        }

        cancelEditBtn = TextView(context).apply {
            text = "Cancel"
            setTextColor(Color.parseColor("#64748B"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            visibility = View.GONE
            val padH = (12 * density).toInt()
            setPadding(padH, 0, padH, 0)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, (40 * density).toInt())
            setOnClickListener { resetEditorState() }
        }

        buttonsRow.addView(saveBtn)
        buttonsRow.addView(cancelEditBtn)
        card.addView(buttonsRow)

        // --- 5. Divider & Recent Notes Header ---
        val sectionHeaderRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, (12 * density).toInt(), 0, (6 * density).toInt())
        }

        val sectionLabel = TextView(context).apply {
            text = "RECENT NOTES (TAP TO EDIT)"
            setTextColor(Color.parseColor("#94A3B8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        sectionHeaderRow.addView(sectionLabel)
        card.addView(sectionHeaderRow)

        // --- 6. Recent Notes Scroll Area ---
        val scrollView = ScrollView(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (140 * density).toInt()
            )
        }
        recentNotesContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
        }
        scrollView.addView(recentNotesContainer)
        card.addView(scrollView)

        // Add card to Root Frame
        val cardParams = LayoutParams(
            (310 * density).toInt(),
            LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.CENTER
        }
        addView(card, cardParams)

        // Listen for cache updates from React Native or other actions
        repository.setOnRecentNotesUpdatedListener {
            post { refreshRecentNotes() }
        }

        refreshRecentNotes()
    }

    private fun handleSaveOrUpdate() {
        val title = titleInput.text.toString().trim()
        val content = contentInput.text.toString().trim()

        if (title.isEmpty() && content.isEmpty()) {
            Toast.makeText(context, "Please enter some text", Toast.LENGTH_SHORT).show()
            return
        }

        val currentEditId = editingNoteId
        if (currentEditId != null) {
            val success = repository.updateQuickNote(currentEditId, title, content)
            if (success) {
                Toast.makeText(context, "Note updated!", Toast.LENGTH_SHORT).show()
                resetEditorState()
                refreshRecentNotes()
                onNoteSavedCallback()
            } else {
                Toast.makeText(context, "Failed to update note", Toast.LENGTH_SHORT).show()
            }
        } else {
            val savedNote = repository.saveQuickNote(title, content)
            if (savedNote != null) {
                Toast.makeText(context, "Note saved to DotyNotes!", Toast.LENGTH_SHORT).show()
                resetEditorState()
                refreshRecentNotes()
                onNoteSavedCallback()
            } else {
                Toast.makeText(context, "Failed to save note", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun startEditingNote(note: OverlayNoteRepository.OverlayNote) {
        editingNoteId = note.id
        titleInput.setText(note.title)
        contentInput.setText(note.content)
        titleInput.requestFocus()
        titleInput.setSelection(titleInput.text.length)

        saveBtn.text = "Update Note ✏️"
        (saveBtn.background as? GradientDrawable)?.setColor(Color.parseColor("#4338CA"))
        cancelEditBtn.visibility = View.VISIBLE
    }

    private fun resetEditorState() {
        editingNoteId = null
        titleInput.setText("")
        contentInput.setText("")
        titleInput.clearFocus()
        contentInput.clearFocus()

        saveBtn.text = "Save Note 💾"
        (saveBtn.background as? GradientDrawable)?.setColor(Color.parseColor("#6D28D9"))
        cancelEditBtn.visibility = View.GONE
    }

    fun refreshRecentNotes() {
        recentNotesContainer.removeAllViews()
        val recentNotes = repository.getRecentNotes(5)

        if (recentNotes.isEmpty()) {
            val emptyText = TextView(context).apply {
                text = "No saved notes yet"
                setTextColor(Color.parseColor("#94A3B8"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                setPadding(0, (8 * density).toInt(), 0, 0)
            }
            recentNotesContainer.addView(emptyText)
            return
        }

        for (note in recentNotes) {
            val noteCard = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#F3E8FF")) // Light lilac/purple pastel
                    cornerRadius = 8 * density
                    setStroke((1 * density).toInt(), Color.parseColor("#DDD6FE"))
                }
                setPadding((10 * density).toInt(), (8 * density).toInt(), (8 * density).toInt(), (8 * density).toInt())
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, (6 * density).toInt())
                }
                // Tap card to edit
                setOnClickListener {
                    startEditingNote(note)
                }
            }

            // Left side text (Title + Content)
            val textLayout = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val noteTitle = TextView(context).apply {
                text = if (note.isPinned) "📌 ${note.title}" else note.title
                setTextColor(Color.parseColor("#581C87"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                typeface = Typeface.DEFAULT_BOLD
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
            }

            val noteSnippet = TextView(context).apply {
                text = note.content
                setTextColor(Color.parseColor("#475569"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                maxLines = 2
                ellipsize = TextUtils.TruncateAt.END
            }

            textLayout.addView(noteTitle)
            if (note.content.isNotEmpty()) {
                textLayout.addView(noteSnippet)
            }
            noteCard.addView(textLayout)

            // Right side delete button
            val deleteBtn = TextView(context).apply {
                text = "🗑"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                gravity = Gravity.CENTER
                val btnSize = (28 * density).toInt()
                layoutParams = LinearLayout.LayoutParams(btnSize, btnSize)
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#FEE2E2"))
                    cornerRadius = 14 * density
                }
                setOnClickListener {
                    val success = repository.deleteQuickNote(note.id)
                    if (success) {
                        Toast.makeText(context, "Note deleted", Toast.LENGTH_SHORT).show()
                        if (editingNoteId == note.id) {
                            resetEditorState()
                        }
                        refreshRecentNotes()
                        onNoteSavedCallback()
                    }
                }
            }
            noteCard.addView(deleteBtn)

            recentNotesContainer.addView(noteCard)
        }
    }
}
