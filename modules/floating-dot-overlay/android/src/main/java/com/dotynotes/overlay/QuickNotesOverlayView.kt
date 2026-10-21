package com.dotynotes.overlay

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.*

/**
 * Compact Quick Notes Panel for System-Level Floating Overlay.
 * 
 * Provides an in-overlay editor to quickly type and save notes directly to
 * the shared 'dotynotes.db' SQLite database, plus a list of recent notes.
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

        // --- 4. Save Button ---
        val saveBtn = Button(context).apply {
            text = "Save Note 💾"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.DEFAULT_BOLD
            isAllCaps = false
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#6D28D9"))
                cornerRadius = 20 * density
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (40 * density).toInt()
            )
            setOnClickListener {
                val title = titleInput.text.toString().trim()
                val content = contentInput.text.toString().trim()
                if (title.isNotEmpty() || content.isNotEmpty()) {
                    val success = repository.saveQuickNote(title, content)
                    if (success) {
                        Toast.makeText(context, "Note saved to DotyNotes!", Toast.LENGTH_SHORT).show()
                        titleInput.setText("")
                        contentInput.setText("")
                        refreshRecentNotes()
                        onNoteSavedCallback()
                    } else {
                        Toast.makeText(context, "Failed to save note", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(context, "Please enter some text", Toast.LENGTH_SHORT).show()
                }
            }
        }
        card.addView(saveBtn)

        // --- 5. Divider & Recent Notes Title ---
        val sectionLabel = TextView(context).apply {
            text = "RECENT NOTES"
            setTextColor(Color.parseColor("#94A3B8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, (12 * density).toInt(), 0, (6 * density).toInt())
        }
        card.addView(sectionLabel)

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
            (300 * density).toInt(),
            LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.CENTER
        }
        addView(card, cardParams)

        // Populate notes on first view
        refreshRecentNotes()
    }

    fun refreshRecentNotes() {
        recentNotesContainer.removeAllViews()
        val recentNotes = repository.getRecentNotes(4)

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
                orientation = LinearLayout.VERTICAL
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#F3E8FF")) // Light lilac/purple pastel
                    cornerRadius = 6 * density
                    setStroke((1 * density).toInt(), Color.parseColor("#DDD6FE"))
                }
                setPadding((8 * density).toInt(), (6 * density).toInt(), (8 * density).toInt(), (6 * density).toInt())
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, (6 * density).toInt())
                }
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

            noteCard.addView(noteTitle)
            if (note.content.isNotEmpty()) {
                noteCard.addView(noteSnippet)
            }
            recentNotesContainer.addView(noteCard)
        }
    }
}
