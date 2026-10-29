package com.dotynotes.overlay

import android.app.AlertDialog
import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.Editable
import android.text.Spannable
import android.text.Spanned
import android.text.TextUtils
import android.text.TextWatcher
import android.text.style.StrikethroughSpan
import android.text.style.StyleSpan
import android.text.style.UnderlineSpan
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.*
import kotlin.math.max
import kotlin.math.min

/**
 * Modern Quick Pad and Responsive Rich-Text Sticky-Note Editor Overlay.
 *
 * Provides:
 * 1. Compact notes-only Quick Pad (Header, Prominent "+", and recent notes list).
 * 2. Fully Responsive Rich-Text Sticky Editor:
 *    - Real-time native span styling (Bold, Italic, Underline, Bullet, Checklist).
 *    - Active toolbar states indicating formatting at the current selection or cursor.
 *    - Interactive checkbox toggling (☐ <-> ☑) directly inside the editor with strikethrough.
 *    - Intelligent Enter key continuation for bullet points and checklist items.
 *    - Usable screen sizing, horizontal scrollbars for narrow screens, and keyboard awareness.
 * 3. Bidirectional real-time synchronization with DotyNotes repository using a clean,
 *    backward-compatible HTML/text serialization format that preserves plain-text notes.
 */
class QuickNotesOverlayView(
    context: Context,
    private val repository: OverlayNoteRepository,
    private val onClose: () -> Unit,
    private val onNoteSavedCallback: () -> Unit
) : FrameLayout(context) {

    data class Pastel(
        val id: String,
        val bg: String,
        val border: String,
        val text: String,
        val tagBg: String
    )

    companion object {
        val PASTELS = listOf(
            Pastel("blue", "#A8C7FA", "#8AB4F8", "#042A6B", "#C2E7FF"),
            Pastel("mint", "#A4E7C0", "#82D8A4", "#074820", "#C4EED0"),
            Pastel("pink", "#EEA0CA", "#E380B4", "#5B0E38", "#F8C2DB"),
            Pastel("yellow", "#F7CC78", "#EBB958", "#4E3000", "#FCE0A6"),
            Pastel("lavender", "#BFAFF8", "#A792F5", "#2A1468", "#DDD2FD"),
            Pastel("teal", "#87D4CA", "#6EC3B7", "#043E37", "#B3E8E0"),
            Pastel("sky", "#ADD3F5", "#91BEE7", "#08335C", "#CCE5FC")
        )

        fun getPastel(id: String?): Pastel {
            val key = id?.lowercase()?.trim()
            return when (key) {
                "blue" -> PASTELS[0]
                "mint", "green" -> PASTELS[1]
                "pink", "rose" -> PASTELS[2]
                "yellow", "peach", "orange" -> PASTELS[3]
                "lavender", "purple" -> PASTELS[4]
                "teal" -> PASTELS[5]
                "sky" -> PASTELS[6]
                else -> PASTELS.find { it.id.equals(key, ignoreCase = true) } ?: PASTELS[4]
            }
        }
    }

    /**
     * Custom EditText that notifies listeners whenever cursor position or selection changes,
     * enabling accurate real-time active states on the rich text formatting toolbar.
     */
    open class RichTextEditText(context: Context) : EditText(context) {
        var onSelectionChangedListener: ((selStart: Int, selEnd: Int) -> Unit)? = null

        override fun onSelectionChanged(selStart: Int, selEnd: Int) {
            super.onSelectionChanged(selStart, selEnd)
            onSelectionChangedListener?.invoke(selStart, selEnd)
        }
    }

    private val density = resources.displayMetrics.density

    // View Containers
    private val cardContainer: FrameLayout
    private val listView: LinearLayout
    private val editorView: LinearLayout

    // List View components
    private val recentNotesContainer: LinearLayout
    private val listTitle: TextView
    private val listCloseBtn: TextView
    private val newNoteBtn: LinearLayout
    private val sectionLabel: TextView

    private fun isSystemDark(): Boolean {
        val uiMode = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        return uiMode == Configuration.UI_MODE_NIGHT_YES
    }

    private fun getCurrentTheme(): OverlayTheme {
        return repository.getResolvedTheme(isSystemDark())
    }

    private fun isDarkTheme(): Boolean {
        return getCurrentTheme().isDark
    }

    private fun applyListTheme() {
        val theme = getCurrentTheme()
        listView.background = GradientDrawable().apply {
            setColor(theme.colors.surface)
            cornerRadius = 20 * density
            setStroke((1.5f * density).toInt(), theme.colors.border)
        }
        listTitle.setTextColor(if (theme.isDark) theme.colors.primaryLight else theme.colors.primary)
        listCloseBtn.setTextColor(theme.colors.textSecondary)
        listCloseBtn.background = GradientDrawable().apply {
            setColor(theme.colors.surfaceSecondary)
            cornerRadius = 15 * density
        }
        newNoteBtn.background = GradientDrawable().apply {
            setColor(theme.colors.primary)
            cornerRadius = 14 * density
        }
        sectionLabel.setTextColor(theme.colors.textSecondary)

        // Keep editor save button coordinated with active primary theme
        editorSaveBtn.background = GradientDrawable().apply {
            setColor(theme.colors.primary)
            cornerRadius = 12 * density
        }
    }

    // Editor View components
    private val editorHeaderTitle: TextView
    private val editorStatusBadge: TextView
    private val editorPinBtn: TextView
    private val editorTitleInput: EditText
    private val editorContentInput: RichTextEditText
    private val editorPaletteRow: LinearLayout
    private val editorDeleteBtn: TextView
    private val editorCompleteBtn: TextView
    private val editorSaveBtn: Button

    // Formatting Toolbar Buttons
    private val btnBold: TextView
    private val btnItalic: TextView
    private val btnUnderline: TextView
    private val btnChecklist: TextView
    private val btnBullet: TextView

    // Formatting Active States (for typing without active text selection)
    private var isBoldActive: Boolean = false
    private var isItalicActive: Boolean = false
    private var isUnderlineActive: Boolean = false
    private var isApplyingInternalTextChange: Boolean = false

    // Current Editor State
    private var editingNote: OverlayNoteRepository.OverlayNote? = null
    private var selectedColorId: String = "purple"
    private var isPinnedState: Boolean = false
    private var hasUnsavedChanges: Boolean = false
    private var isSaving: Boolean = false

    private val themeListener: () -> Unit = {
        post {
            applyListTheme()
            refreshRecentNotes()
            if (editorView.visibility == View.VISIBLE) {
                updatePinVisual()
                updateToolbarActiveStates()
            }
        }
        Unit
    }

    init {
        // Semi-transparent backdrop — tapping outside auto-saves and closes overlay
        setBackgroundColor(Color.parseColor("#40000000"))
        setOnClickListener {
            if (editorView.visibility == View.VISIBLE) {
                autoSaveEditor()
            }
            onClose()
        }

        // Central Card Container
        cardContainer = FrameLayout(context).apply {
            setOnClickListener { /* Consume clicks so taps inside card do not close backdrop */ }
        }

        val initialTheme = getCurrentTheme()

        // ==========================================
        // 1. LIST VIEW: Notes-only Quick Pad
        // ==========================================
        listView = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                setColor(initialTheme.colors.surface)
                cornerRadius = 20 * density
                setStroke((1.5f * density).toInt(), initialTheme.colors.border)
            }
            elevation = 16 * density
            val pad = (16 * density).toInt()
            setPadding(pad, (14 * density).toInt(), pad, pad)
        }

        // List Header Row
        val listHeader = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, (10 * density).toInt())
        }

        listTitle = TextView(context).apply {
            text = "DotyNotes Quick Pad"
            setTextColor(if (initialTheme.isDark) initialTheme.colors.primaryLight else initialTheme.colors.primary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        listCloseBtn = TextView(context).apply {
            text = "✕"
            setTextColor(initialTheme.colors.textSecondary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            val sz = (30 * density).toInt()
            layoutParams = LinearLayout.LayoutParams(sz, sz)
            background = GradientDrawable().apply {
                setColor(initialTheme.colors.surfaceSecondary)
                cornerRadius = 15 * density
            }
            setOnClickListener { onClose() }
        }

        listHeader.addView(listTitle)
        listHeader.addView(listCloseBtn)
        listView.addView(listHeader)

        // Prominent "+ New Sticky Note" Button
        newNoteBtn = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                setColor(initialTheme.colors.primary)
                cornerRadius = 14 * density
            }
            val h = (44 * density).toInt()
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, h).apply {
                setMargins(0, 0, 0, (12 * density).toInt())
            }
            setOnClickListener {
                openEditor(null) // Open editor in Create mode
            }

            val icon = TextView(context).apply {
                text = " "
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                setTextColor(Color.WHITE)
            }
            val label = TextView(context).apply {
                text = "New Sticky Note"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                setTextColor(Color.WHITE)
                typeface = Typeface.DEFAULT_BOLD
            }
            addView(icon)
            addView(label)
        }
        listView.addView(newNoteBtn)

        // Section label
        sectionLabel = TextView(context).apply {
            text = "RECENT NOTES"
            setTextColor(initialTheme.colors.textSecondary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, 0, 0, (6 * density).toInt())
        }
        listView.addView(sectionLabel)

        // Scrollable Notes Container
        val listScrollView = ScrollView(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (240 * density).toInt()
            )
            isFillViewport = true
        }
        recentNotesContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
        }
        listScrollView.addView(recentNotesContainer)
        listView.addView(listScrollView)

        // ==========================================
        // 2. EDITOR VIEW: Full Responsive Sticky-Note Editor
        // ==========================================
        editorView = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            elevation = 20 * density
            val pad = (16 * density).toInt()
            setPadding(pad, (12 * density).toInt(), pad, pad)
            visibility = View.GONE
        }

        // Editor Header Row
        val editorHeader = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, (8 * density).toInt())
        }

        // Back to notes button
        val editorBackBtn = TextView(context).apply {
            text = "← Notes"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.DEFAULT_BOLD
            val padH = (8 * density).toInt()
            val padV = (5 * density).toInt()
            setPadding(padH, padV, padH, padV)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#33FFFFFF"))
                cornerRadius = 10 * density
            }
            setOnClickListener {
                autoSaveEditor()
                showListView()
            }
        }
        editorHeader.addView(editorBackBtn)

        // Status indicator (Saved / Editing)
        editorStatusBadge = TextView(context).apply {
            text = "Saved ✓"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        editorHeader.addView(editorStatusBadge)

        // Pin Button
        editorPinBtn = TextView(context).apply {
            text = "📌"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            gravity = Gravity.CENTER
            val sz = (30 * density).toInt()
            layoutParams = LinearLayout.LayoutParams(sz, sz).apply {
                marginEnd = (6 * density).toInt()
            }
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#33FFFFFF"))
                cornerRadius = 15 * density
            }
            setOnClickListener {
                isPinnedState = !isPinnedState
                updatePinVisual()
                hasUnsavedChanges = true
                editorStatusBadge.text = "Draft"
            }
        }
        editorHeader.addView(editorPinBtn)

        // Close / Done button
        val editorDoneBtn = TextView(context).apply {
            text = "✓"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            val sz = (30 * density).toInt()
            layoutParams = LinearLayout.LayoutParams(sz, sz)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#33FFFFFF"))
                cornerRadius = 15 * density
            }
            setOnClickListener {
                saveCurrentNote()
                showListView()
            }
        }
        editorHeader.addView(editorDoneBtn)
        editorView.addView(editorHeader)

        // Note Title Label / Status
        editorHeaderTitle = TextView(context).apply {
            text = "Edit Note"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            setTextColor(Color.parseColor("#64748B"))
            visibility = View.GONE
        }
        editorView.addView(editorHeaderTitle)

        // Editable Note Title
        editorTitleInput = EditText(context).apply {
            hint = "Title..."
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            typeface = Typeface.DEFAULT_BOLD
            background = null
            setPadding(0, (6 * density).toInt(), 0, (6 * density).toInt())
            maxLines = 2
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                    hasUnsavedChanges = true
                    editorStatusBadge.text = "Editing..."
                }
                override fun afterTextChanged(s: Editable?) {}
            })
        }
        editorView.addView(editorTitleInput)

        // Divider
        val divider = View(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (1 * density).toInt()
            ).apply {
                setMargins(0, (2 * density).toInt(), 0, (6 * density).toInt())
            }
            setBackgroundColor(Color.parseColor("#22000000"))
        }
        editorView.addView(divider)

        // ==========================================
        // Responsive Formatting Toolbar (Horizontally Scrollable)
        // ==========================================
        val toolbarScroll = HorizontalScrollView(context).apply {
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, (6 * density).toInt())
            }
        }

        val formatToolbar = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, (2 * density).toInt())
        }

        fun createFormatBtn(symbol: String, contentDesc: String, action: () -> Unit): TextView {
            return TextView(context).apply {
                text = symbol
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                contentDescription = contentDesc
                val sz = (32 * density).toInt()
                layoutParams = LinearLayout.LayoutParams(sz, sz).apply {
                    marginEnd = (6 * density).toInt()
                }
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#33FFFFFF"))
                    cornerRadius = 8 * density
                    setStroke((1 * density).toInt(), Color.parseColor("#22000000"))
                }
                setOnClickListener { action() }
            }
        }

        btnBold = createFormatBtn("B", "Bold") { applyBoldFormat() }
        btnItalic = createFormatBtn("I", "Italic") { applyItalicFormat() }
        btnUnderline = createFormatBtn("U", "Underline") { applyUnderlineFormat() }
        btnChecklist = createFormatBtn("☑", "Checklist") { applyChecklistFormat() }
        btnBullet = createFormatBtn("•", "Bullet List") { applyBulletFormat() }

        formatToolbar.addView(btnBold)
        formatToolbar.addView(btnItalic)
        formatToolbar.addView(btnUnderline)
        formatToolbar.addView(btnChecklist)
        formatToolbar.addView(btnBullet)
        toolbarScroll.addView(formatToolbar)
        editorView.addView(toolbarScroll)

        // ==========================================
        // Editable Multiline Rich-Text Content Area
        // ==========================================
        val contentScroll = ScrollView(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
            isFillViewport = true
        }

        editorContentInput = RichTextEditText(context).apply {
            hint = "Write your thoughts here..."
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            background = null
            gravity = Gravity.TOP or Gravity.START
            setPadding(0, (4 * density).toInt(), 0, (8 * density).toInt())

            // Real-time toolbar active indicator on selection/cursor movement
            onSelectionChangedListener = { selStart, selEnd ->
                if (!isApplyingInternalTextChange) {
                    if (selStart == selEnd) {
                        syncActiveStylesFromCursor()
                    }
                    updateToolbarActiveStates()
                }
            }

            // Interactive Checkbox Touch Handler: Tapping ☐ or ☑ toggles the item directly!
            setOnTouchListener { _, event ->
                if (event.action == MotionEvent.ACTION_UP) {
                    val handled = handleCheckboxTap(event)
                    if (handled) return@setOnTouchListener true
                }
                false
            }

            addTextChangedListener(object : TextWatcher {
                private var lastTextLength: Int = 0

                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
                    lastTextLength = s?.length ?: 0
                }

                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                    if (isApplyingInternalTextChange) return

                    hasUnsavedChanges = true
                    editorStatusBadge.text = "Editing..."

                    // 1. Apply independent active styles strictly to newly typed characters
                    if (count > 0 && s is Spannable) {
                        val end = start + count
                        isApplyingInternalTextChange = true
                        try {
                            if (isBoldActive) {
                                addBoldRange(s, start, end)
                            } else {
                                removeBoldRange(s, start, end)
                            }

                            if (isItalicActive) {
                                addItalicRange(s, start, end)
                            } else {
                                removeItalicRange(s, start, end)
                            }

                            if (isUnderlineActive) {
                                addUnderlineRange(s, start, end)
                            } else {
                                removeUnderlineRange(s, start, end)
                            }
                        } finally {
                            isApplyingInternalTextChange = false
                        }
                    }

                    // 2. Intelligent newline continuation for lists
                    if (count == 1 && s != null && start < s.length && s[start] == '\n') {
                        handleNewlineListContinuation(start)
                    }

                    updateToolbarActiveStates()
                }

                override fun afterTextChanged(s: Editable?) {}
            })
        }
        contentScroll.addView(editorContentInput)
        editorView.addView(contentScroll)

        // ==========================================
        // Pastel Color Palette Row (Horizontally Scrollable)
        // ==========================================
        val paletteContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, (6 * density).toInt(), 0, (8 * density).toInt())
        }
        val paletteLabel = TextView(context).apply {
            text = "STICKY COLOR"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, 0, 0, (4 * density).toInt())
        }
        paletteContainer.addView(paletteLabel)

        val paletteScroll = HorizontalScrollView(context).apply {
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
        }
        editorPaletteRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        paletteScroll.addView(editorPaletteRow)
        paletteContainer.addView(paletteScroll)
        editorView.addView(paletteContainer)

        // ==========================================
        // Bottom Actions Row (Delete, Mark complete, Save)
        // ==========================================
        val bottomActionsRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, (4 * density).toInt(), 0, 0)
        }

        editorDeleteBtn = TextView(context).apply {
            text = " Delete"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#9D174D"))
            val padH = (10 * density).toInt()
            val padV = (8 * density).toInt()
            setPadding(padH, padV, padH, padV)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#FCE4F1"))
                cornerRadius = 10 * density
                setStroke((1 * density).toInt(), Color.parseColor("#FBCFE8"))
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                marginEnd = (8 * density).toInt()
            }
            setOnClickListener { confirmDeleteCurrentNote() }
        }
        bottomActionsRow.addView(editorDeleteBtn)

        editorCompleteBtn = TextView(context).apply {
            text = "✓ Complete"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            typeface = Typeface.DEFAULT_BOLD
            val padH = (10 * density).toInt()
            val padV = (8 * density).toInt()
            setPadding(padH, padV, padH, padV)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#33FFFFFF"))
                cornerRadius = 10 * density
                setStroke((1 * density).toInt(), Color.parseColor("#22000000"))
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                marginEnd = (8 * density).toInt()
            }
            setOnClickListener { toggleCompleteCurrentNote() }
        }
        bottomActionsRow.addView(editorCompleteBtn)

        editorSaveBtn = Button(context).apply {
            text = "Save Note "
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
            isAllCaps = false
            background = GradientDrawable().apply {
                setColor(initialTheme.colors.primary)
                cornerRadius = 12 * density
            }
            layoutParams = LinearLayout.LayoutParams(
                0,
                (42 * density).toInt(),
                1f
            )
            setOnClickListener {
                saveCurrentNote()
                showListView()
            }
        }
        bottomActionsRow.addView(editorSaveBtn)
        editorView.addView(bottomActionsRow)

        // Assemble into central container
        cardContainer.addView(listView)
        cardContainer.addView(editorView)

        // Initial Responsive Card Layout
        val cardLayoutParams = LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.CENTER
        }
        addView(cardContainer, cardLayoutParams)

        // Listen for repository cache and theme updates from React Native
        repository.setOnRecentNotesUpdatedListener {
            post { refreshRecentNotes() }
        }
        repository.addThemeUpdatedListener(themeListener)

        buildColorPalette()
        refreshRecentNotes()
        showListView()
        applyResponsiveLayout()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        repository.removeThemeUpdatedListener(themeListener)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        post { applyResponsiveLayout() }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        applyResponsiveLayout()
    }

    /**
     * Dynamically calculates card bounds based on usable screen metrics, keyboard insets,
     * and screen orientation, ensuring the editor remains fully accessible without clipping.
     */
    private fun applyResponsiveLayout() {
        val displayMetrics = resources.displayMetrics
        val screenW = displayMetrics.widthPixels
        val screenH = displayMetrics.heightPixels
        val isLandscape = resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

        val cardWidth = if (isLandscape) {
            min((540 * density).toInt(), (screenW * 0.90f).toInt())
        } else {
            min((380 * density).toInt(), (screenW * 0.94f).toInt())
        }

        val lp = (cardContainer.layoutParams as? LayoutParams) ?: LayoutParams(cardWidth, LayoutParams.WRAP_CONTENT)
        lp.width = cardWidth
        lp.gravity = Gravity.CENTER

        if (editorView.visibility == View.VISIBLE) {
            val maxEditorHeight = if (isLandscape) {
                min((380 * density).toInt(), (screenH * 0.88f).toInt())
            } else {
                min((540 * density).toInt(), (screenH * 0.84f).toInt())
            }
            lp.height = maxEditorHeight
        } else {
            lp.height = LayoutParams.WRAP_CONTENT
        }

        cardContainer.layoutParams = lp
        val minEditorHeight = if (isLandscape) (80 * density).toInt() else (120 * density).toInt()
        editorContentInput.minHeight = minEditorHeight
    }

    private fun showListView() {
        listView.visibility = View.VISIBLE
        editorView.visibility = View.GONE
        editingNote = null

        val lp = cardContainer.layoutParams
        lp.height = LayoutParams.WRAP_CONTENT
        cardContainer.layoutParams = lp

        refreshRecentNotes()
    }

    private fun openEditor(note: OverlayNoteRepository.OverlayNote?) {
        editingNote = note
        hasUnsavedChanges = false
        isBoldActive = false
        isItalicActive = false
        isUnderlineActive = false

        if (note != null) {
            // Edit Mode
            selectedColorId = note.colorSchemeId.ifEmpty { "purple" }
            isPinnedState = note.isPinned
            editorTitleInput.setText(note.title)

            // Parse rich text and restore native spans cleanly
            isApplyingInternalTextChange = true
            try {
                editorContentInput.setText(RichTextHelper.fromHtml(note.content))
            } finally {
                isApplyingInternalTextChange = false
            }

            editorDeleteBtn.visibility = View.VISIBLE
            editorCompleteBtn.visibility = View.VISIBLE
            editorCompleteBtn.text = if (note.isArchived) "Restore" else "✓ Complete"
            editorSaveBtn.text = "Update Note "
            editorStatusBadge.text = "Saved ✓"
        } else {
            // Create Mode
            selectedColorId = "purple"
            isPinnedState = false
            editorTitleInput.setText("")
            editorContentInput.setText("")
            editorDeleteBtn.visibility = View.GONE
            editorCompleteBtn.visibility = View.GONE
            editorSaveBtn.text = "Save Note "
            editorStatusBadge.text = "New Note"
        }

        applyPastelTheme(selectedColorId)
        updatePinVisual()
        buildColorPalette()

        listView.visibility = View.GONE
        editorView.visibility = View.VISIBLE

        applyResponsiveLayout()

        if (note == null) {
            editorTitleInput.requestFocus()
        } else {
            editorContentInput.requestFocus()
            editorContentInput.setSelection(editorContentInput.text.length)
        }

        updateToolbarActiveStates()
    }

    // ==========================================
    // Pastel Theme & Palette
    // ==========================================

    private fun applyPastelTheme(colorId: String) {
        selectedColorId = colorId
        val pastel = getPastel(colorId)

        editorView.background = GradientDrawable().apply {
            setColor(Color.parseColor(pastel.bg))
            cornerRadius = 20 * density
            setStroke((1.5f * density).toInt(), Color.parseColor(pastel.border))
        }

        val textColor = Color.parseColor(pastel.text)
        editorTitleInput.setTextColor(textColor)
        editorTitleInput.setHintTextColor(Color.argb(128, Color.red(textColor), Color.green(textColor), Color.blue(textColor)))

        editorContentInput.setTextColor(textColor)
        editorContentInput.setHintTextColor(Color.argb(128, Color.red(textColor), Color.green(textColor), Color.blue(textColor)))

        editorStatusBadge.setTextColor(Color.parseColor(pastel.text))
        updateToolbarActiveStates()
    }

    private fun buildColorPalette() {
        editorPaletteRow.removeAllViews()
        for (p in PASTELS) {
            val isSelected = p.id.equals(selectedColorId, ignoreCase = true)
            val swatch = FrameLayout(context).apply {
                val sz = (28 * density).toInt()
                layoutParams = LinearLayout.LayoutParams(sz, sz).apply {
                    marginEnd = (10 * density).toInt()
                }
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor(p.bg))
                    if (isSelected) {
                        setStroke((2.5f * density).toInt(), Color.parseColor(p.text))
                    } else {
                        setStroke((1 * density).toInt(), Color.parseColor(p.border))
                    }
                }
                setOnClickListener {
                    applyPastelTheme(p.id)
                    hasUnsavedChanges = true
                    buildColorPalette()
                }
            }

            if (isSelected) {
                val dot = View(context).apply {
                    val dotSz = (8 * density).toInt()
                    layoutParams = LayoutParams(dotSz, dotSz).apply {
                        gravity = Gravity.CENTER
                    }
                    background = GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(Color.parseColor(p.text))
                    }
                }
                swatch.addView(dot)
            }

            editorPaletteRow.addView(swatch)
        }
    }

    private fun updatePinVisual() {
        val theme = getCurrentTheme()
        if (isPinnedState) {
            editorPinBtn.background = GradientDrawable().apply {
                setColor(theme.colors.primarySoft)
                cornerRadius = 15 * density
                setStroke((1.5f * density).toInt(), theme.colors.primary)
            }
        } else {
            editorPinBtn.background = GradientDrawable().apply {
                setColor(Color.parseColor("#33FFFFFF"))
                cornerRadius = 15 * density
            }
        }
    }

    // ==========================================
    // Real-Time Rich Text Formatting Logic
    // ==========================================

    private fun setButtonActive(btn: TextView, isActive: Boolean) {
        val pastel = getPastel(selectedColorId)
        val theme = getCurrentTheme()
        if (isActive) {
            btn.background = GradientDrawable().apply {
                setColor(theme.colors.primarySoft)
                cornerRadius = 8 * density
                setStroke((2 * density).toInt(), theme.colors.primary)
            }
            btn.setTextColor(if (theme.isDark) theme.colors.primaryLight else theme.colors.primaryDark)
        } else {
            btn.background = GradientDrawable().apply {
                setColor(Color.parseColor("#33FFFFFF"))
                cornerRadius = 8 * density
                setStroke((1 * density).toInt(), Color.parseColor("#22000000"))
            }
            btn.setTextColor(Color.parseColor(pastel.text))
        }
    }

    /**
     * Inspects spans and lines at the current cursor or selection range,
     * highlighting the active formatting controls in real time.
     */
    private fun updateToolbarActiveStates() {
        val text = editorContentInput.text ?: return
        val start = editorContentInput.selectionStart
        val end = editorContentInput.selectionEnd
        if (start < 0) return

        val selStart = min(start, end)
        val selEnd = max(start, end)

        val isBold = if (selStart < selEnd) {
            isRangeEntirelyBold(text, selStart, selEnd)
        } else {
            isBoldActive
        }

        val isItalic = if (selStart < selEnd) {
            isRangeEntirelyItalic(text, selStart, selEnd)
        } else {
            isItalicActive
        }

        val isUnderline = if (selStart < selEnd) {
            isRangeEntirelyUnderline(text, selStart, selEnd)
        } else {
            isUnderlineActive
        }

        var isChecklist = false
        var isBullet = false
        val layout = editorContentInput.layout
        if (layout != null && text.isNotEmpty() && selStart <= text.length) {
            val offset = min(selStart, text.length - 1).coerceAtLeast(0)
            val line = layout.getLineForOffset(offset)
            val lineStart = layout.getLineStart(line)
            val lineEnd = layout.getLineEnd(line)
            if (lineStart < lineEnd) {
                val lineStr = text.substring(lineStart, lineEnd)
                isChecklist = lineStr.startsWith("☐ ") || lineStr.startsWith("☑ ")
                isBullet = lineStr.startsWith("• ")
            }
        }

        setButtonActive(btnBold, isBold)
        setButtonActive(btnItalic, isItalic)
        setButtonActive(btnUnderline, isUnderline)
        setButtonActive(btnChecklist, isChecklist)
        setButtonActive(btnBullet, isBullet)
    }

    private fun applyBoldFormat() {
        val text = editorContentInput.text ?: return
        val start = editorContentInput.selectionStart
        val end = editorContentInput.selectionEnd

        if (start < end && start >= 0) {
            val isEntirelyBold = isRangeEntirelyBold(text, start, end)
            isApplyingInternalTextChange = true
            try {
                if (isEntirelyBold) {
                    removeBoldRange(text, start, end)
                    isBoldActive = false
                } else {
                    addBoldRange(text, start, end)
                    isBoldActive = true
                }
            } finally {
                isApplyingInternalTextChange = false
            }
            editorContentInput.setSelection(start, end)
            hasUnsavedChanges = true
        } else if (start >= 0) {
            isBoldActive = !isBoldActive
        }
        updateToolbarActiveStates()
    }

    private fun applyItalicFormat() {
        val text = editorContentInput.text ?: return
        val start = editorContentInput.selectionStart
        val end = editorContentInput.selectionEnd

        if (start < end && start >= 0) {
            val isEntirelyItalic = isRangeEntirelyItalic(text, start, end)
            isApplyingInternalTextChange = true
            try {
                if (isEntirelyItalic) {
                    removeItalicRange(text, start, end)
                    isItalicActive = false
                } else {
                    addItalicRange(text, start, end)
                    isItalicActive = true
                }
            } finally {
                isApplyingInternalTextChange = false
            }
            editorContentInput.setSelection(start, end)
            hasUnsavedChanges = true
        } else if (start >= 0) {
            isItalicActive = !isItalicActive
        }
        updateToolbarActiveStates()
    }

    private fun applyUnderlineFormat() {
        val text = editorContentInput.text ?: return
        val start = editorContentInput.selectionStart
        val end = editorContentInput.selectionEnd

        if (start < end && start >= 0) {
            val isEntirelyUnderline = isRangeEntirelyUnderline(text, start, end)
            isApplyingInternalTextChange = true
            try {
                if (isEntirelyUnderline) {
                    removeUnderlineRange(text, start, end)
                    isUnderlineActive = false
                } else {
                    addUnderlineRange(text, start, end)
                    isUnderlineActive = true
                }
            } finally {
                isApplyingInternalTextChange = false
            }
            editorContentInput.setSelection(start, end)
            hasUnsavedChanges = true
        } else if (start >= 0) {
            isUnderlineActive = !isUnderlineActive
        }
        updateToolbarActiveStates()
    }

    private fun applyChecklistFormat() {
        val text = editorContentInput.text ?: return
        val cursor = editorContentInput.selectionStart.coerceAtLeast(0)

        val layout = editorContentInput.layout
        val line = if (layout != null && text.isNotEmpty()) {
            layout.getLineForOffset(min(cursor, text.length - 1).coerceAtLeast(0))
        } else 0

        val lineStart = if (layout != null) layout.getLineStart(line) else 0
        val lineEnd = if (layout != null) layout.getLineEnd(line) else text.length
        val lineStr = text.substring(lineStart, lineEnd)

        isApplyingInternalTextChange = true
        try {
            when {
                lineStr.startsWith("☐ ") -> {
                    // Toggle to checked
                    text.replace(lineStart, lineStart + 1, "☑")
                    val strikeStart = (lineStart + 2).coerceAtMost(lineEnd)
                    if (strikeStart < lineEnd) {
                        text.setSpan(StrikethroughSpan(), strikeStart, lineEnd, Spanned.SPAN_EXCLUSIVE_INCLUSIVE)
                    }
                }
                lineStr.startsWith("☑ ") -> {
                    // Remove checklist
                    text.delete(lineStart, lineStart + 2)
                    val strikes = text.getSpans(lineStart, lineEnd - 2, StrikethroughSpan::class.java)
                    for (s in strikes) text.removeSpan(s)
                }
                lineStr.startsWith("• ") -> {
                    // Replace bullet with checklist
                    text.replace(lineStart, lineStart + 2, "☐ ")
                }
                else -> {
                    // Add unchecked checklist
                    text.insert(lineStart, "☐ ")
                }
            }
            hasUnsavedChanges = true
        } finally {
            isApplyingInternalTextChange = false
        }
        updateToolbarActiveStates()
    }

    private fun applyBulletFormat() {
        val text = editorContentInput.text ?: return
        val cursor = editorContentInput.selectionStart.coerceAtLeast(0)

        val layout = editorContentInput.layout
        val line = if (layout != null && text.isNotEmpty()) {
            layout.getLineForOffset(min(cursor, text.length - 1).coerceAtLeast(0))
        } else 0

        val lineStart = if (layout != null) layout.getLineStart(line) else 0
        val lineEnd = if (layout != null) layout.getLineEnd(line) else text.length
        val lineStr = text.substring(lineStart, lineEnd)

        isApplyingInternalTextChange = true
        try {
            when {
                lineStr.startsWith("• ") -> {
                    // Remove bullet
                    text.delete(lineStart, lineStart + 2)
                }
                lineStr.startsWith("☐ ") || lineStr.startsWith("☑ ") -> {
                    // Replace checkbox with bullet
                    text.replace(lineStart, lineStart + 2, "• ")
                    val strikes = text.getSpans(lineStart, lineEnd, StrikethroughSpan::class.java)
                    for (s in strikes) text.removeSpan(s)
                }
                else -> {
                    // Add bullet
                    text.insert(lineStart, "• ")
                }
            }
            hasUnsavedChanges = true
        } finally {
            isApplyingInternalTextChange = false
        }
        updateToolbarActiveStates()
    }

    /**
     * Directly toggles checkboxes (☐ <-> ☑) and their strikethrough styling when tapped on screen.
     */
    private fun handleCheckboxTap(event: MotionEvent): Boolean {
        val text = editorContentInput.text ?: return false
        val layout = editorContentInput.layout ?: return false

        val x = event.x - editorContentInput.totalPaddingLeft + editorContentInput.scrollX
        val y = event.y - editorContentInput.totalPaddingTop + editorContentInput.scrollY
        if (x < 0 || y < 0) return false

        val line = layout.getLineForVertical(y.toInt())
        val offset = layout.getOffsetForHorizontal(line, x)
        val lineStart = layout.getLineStart(line)
        val lineEnd = layout.getLineEnd(line)

        if (lineStart >= text.length || offset > lineStart + 3) {
            return false
        }

        val lineStr = text.substring(lineStart, lineEnd)
        isApplyingInternalTextChange = true
        try {
            if (lineStr.startsWith("☐ ")) {
                text.replace(lineStart, lineStart + 1, "☑")
                val strikeStart = (lineStart + 2).coerceAtMost(lineEnd)
                if (strikeStart < lineEnd) {
                    text.setSpan(StrikethroughSpan(), strikeStart, lineEnd, Spanned.SPAN_EXCLUSIVE_INCLUSIVE)
                }
                hasUnsavedChanges = true
                updateToolbarActiveStates()
                return true
            } else if (lineStr.startsWith("☑ ")) {
                text.replace(lineStart, lineStart + 1, "☐")
                val strikes = text.getSpans(lineStart, lineEnd, StrikethroughSpan::class.java)
                for (s in strikes) text.removeSpan(s)
                hasUnsavedChanges = true
                updateToolbarActiveStates()
                return true
            }
        } finally {
            isApplyingInternalTextChange = false
        }
        return false
    }

    // ==========================================
    // Range Helpers (Preserve Style Independence)
    // ==========================================

    private fun isRangeEntirelyBold(text: Spannable, start: Int, end: Int): Boolean {
        val boldSpans = text.getSpans(start, end, StyleSpan::class.java).filter {
            it.style == Typeface.BOLD || it.style == Typeface.BOLD_ITALIC
        }
        return boldSpans.any { text.getSpanStart(it) <= start && text.getSpanEnd(it) >= end }
    }

    private fun isRangeEntirelyItalic(text: Spannable, start: Int, end: Int): Boolean {
        val italicSpans = text.getSpans(start, end, StyleSpan::class.java).filter {
            it.style == Typeface.ITALIC || it.style == Typeface.BOLD_ITALIC
        }
        return italicSpans.any { text.getSpanStart(it) <= start && text.getSpanEnd(it) >= end }
    }

    private fun isRangeEntirelyUnderline(text: Spannable, start: Int, end: Int): Boolean {
        val underlineSpans = text.getSpans(start, end, UnderlineSpan::class.java)
        return underlineSpans.any { text.getSpanStart(it) <= start && text.getSpanEnd(it) >= end }
    }

    private fun addBoldRange(text: Spannable, start: Int, end: Int) {
        removeBoldRange(text, start, end)
        text.setSpan(StyleSpan(Typeface.BOLD), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }

    private fun removeBoldRange(text: Spannable, start: Int, end: Int) {
        val spans = text.getSpans(start, end, StyleSpan::class.java).filter {
            it.style == Typeface.BOLD || it.style == Typeface.BOLD_ITALIC
        }
        for (span in spans) {
            val sStart = text.getSpanStart(span)
            val sEnd = text.getSpanEnd(span)
            val wasBoldItalic = span.style == Typeface.BOLD_ITALIC
            text.removeSpan(span)

            if (wasBoldItalic) {
                text.setSpan(StyleSpan(Typeface.ITALIC), sStart, sEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
            if (sStart < start) {
                text.setSpan(StyleSpan(Typeface.BOLD), sStart, start, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
            if (sEnd > end) {
                text.setSpan(StyleSpan(Typeface.BOLD), end, sEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
        }
    }

    private fun addItalicRange(text: Spannable, start: Int, end: Int) {
        removeItalicRange(text, start, end)
        text.setSpan(StyleSpan(Typeface.ITALIC), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }

    private fun removeItalicRange(text: Spannable, start: Int, end: Int) {
        val spans = text.getSpans(start, end, StyleSpan::class.java).filter {
            it.style == Typeface.ITALIC || it.style == Typeface.BOLD_ITALIC
        }
        for (span in spans) {
            val sStart = text.getSpanStart(span)
            val sEnd = text.getSpanEnd(span)
            val wasBoldItalic = span.style == Typeface.BOLD_ITALIC
            text.removeSpan(span)

            if (wasBoldItalic) {
                text.setSpan(StyleSpan(Typeface.BOLD), sStart, sEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
            if (sStart < start) {
                text.setSpan(StyleSpan(Typeface.ITALIC), sStart, start, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
            if (sEnd > end) {
                text.setSpan(StyleSpan(Typeface.ITALIC), end, sEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
        }
    }

    private fun addUnderlineRange(text: Spannable, start: Int, end: Int) {
        removeUnderlineRange(text, start, end)
        text.setSpan(UnderlineSpan(), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }

    private fun removeUnderlineRange(text: Spannable, start: Int, end: Int) {
        val spans = text.getSpans(start, end, UnderlineSpan::class.java)
        for (span in spans) {
            val sStart = text.getSpanStart(span)
            val sEnd = text.getSpanEnd(span)
            text.removeSpan(span)
            if (sStart < start) {
                text.setSpan(UnderlineSpan(), sStart, start, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
            if (sEnd > end) {
                text.setSpan(UnderlineSpan(), end, sEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
        }
    }

    private fun syncActiveStylesFromCursor() {
        val text = editorContentInput.text ?: return
        val cursor = editorContentInput.selectionStart
        if (cursor > 0 && cursor <= text.length) {
            val check = cursor - 1
            isBoldActive = text.getSpans(check, check + 1, StyleSpan::class.java).any {
                it.style == Typeface.BOLD || it.style == Typeface.BOLD_ITALIC
            }
            isItalicActive = text.getSpans(check, check + 1, StyleSpan::class.java).any {
                it.style == Typeface.ITALIC || it.style == Typeface.BOLD_ITALIC
            }
            isUnderlineActive = text.getSpans(check, check + 1, UnderlineSpan::class.java).isNotEmpty()
        } else if (cursor == 0 && text.isNotEmpty()) {
            isBoldActive = text.getSpans(0, 1, StyleSpan::class.java).any {
                it.style == Typeface.BOLD || it.style == Typeface.BOLD_ITALIC
            }
            isItalicActive = text.getSpans(0, 1, StyleSpan::class.java).any {
                it.style == Typeface.ITALIC || it.style == Typeface.BOLD_ITALIC
            }
            isUnderlineActive = text.getSpans(0, 1, UnderlineSpan::class.java).isNotEmpty()
        }
    }

    /**
     * Continues checklist or bullet prefixes on Enter, and terminates empty items cleanly.
     */
    private fun handleNewlineListContinuation(newlineIndex: Int) {
        val text = editorContentInput.text ?: return
        if (newlineIndex <= 0) return

        // Find the start of the previous line (before the newline)
        val prevLineEnd = newlineIndex
        val prevLineBreak = text.lastIndexOf('\n', prevLineEnd - 1)
        val prevLineStart = if (prevLineBreak != -1) prevLineBreak + 1 else 0
        val prevLineText = text.substring(prevLineStart, prevLineEnd)

        isApplyingInternalTextChange = true
        try {
            when {
                prevLineText.startsWith("☐ ") || prevLineText.startsWith("☑ ") -> {
                    if (prevLineText.length <= 2 || prevLineText.substring(2).trim().isEmpty()) {
                        // Empty checklist item: remove from previous line and do not continue list
                        text.delete(prevLineStart, prevLineEnd)
                    } else {
                        // Continue checklist on new line
                        text.insert(newlineIndex + 1, "☐ ")
                        editorContentInput.setSelection(newlineIndex + 3)
                    }
                }
                prevLineText.startsWith("• ") -> {
                    if (prevLineText.length <= 2 || prevLineText.substring(2).trim().isEmpty()) {
                        // Empty bullet item: remove from previous line
                        text.delete(prevLineStart, prevLineEnd)
                    } else {
                        // Continue bullet on new line
                        text.insert(newlineIndex + 1, "• ")
                        editorContentInput.setSelection(newlineIndex + 3)
                    }
                }
            }
        } finally {
            isApplyingInternalTextChange = false
        }
    }

    // ==========================================
    // Save / Update / Delete / Complete Flows
    // ==========================================

    private fun saveCurrentNote(): Boolean {
        if (isSaving) return false

        val title = editorTitleInput.text.toString().trim()
        val content = RichTextHelper.toHtml(editorContentInput.text).trim()

        if (title.isEmpty() && content.isEmpty()) {
            return false
        }

        isSaving = true
        try {
            val note = editingNote
            if (note != null) {
                // Update existing note
                val success = repository.updateQuickNote(
                    id = note.id,
                    title = title,
                    content = content,
                    colorSchemeId = selectedColorId,
                    isPinned = isPinnedState
                )
                if (success) {
                    hasUnsavedChanges = false
                    editorStatusBadge.text = "Saved ✓"
                    Toast.makeText(context, "Note updated!", Toast.LENGTH_SHORT).show()
                    onNoteSavedCallback()
                    return true
                }
            } else {
                // Create new note
                val created = repository.saveQuickNote(
                    title = title,
                    content = content,
                    colorSchemeId = selectedColorId,
                    isPinned = isPinnedState
                )
                if (created != null) {
                    hasUnsavedChanges = false
                    editorStatusBadge.text = "Saved ✓"
                    Toast.makeText(context, "Note saved to DotyNotes!", Toast.LENGTH_SHORT).show()
                    onNoteSavedCallback()
                    return true
                }
            }
        } finally {
            isSaving = false
        }
        return false
    }

    private fun autoSaveEditor() {
        if (hasUnsavedChanges) {
            saveCurrentNote()
        }
    }

    private fun confirmDeleteCurrentNote() {
        val note = editingNote ?: return
        AlertDialog.Builder(context)
            .setTitle("Delete Note")
            .setMessage("Are you sure you want to permanently delete this note?")
            .setPositiveButton("Delete") { _, _ ->
                val deleted = repository.deleteQuickNote(note.id)
                if (deleted) {
                    Toast.makeText(context, "Note deleted", Toast.LENGTH_SHORT).show()
                    onNoteSavedCallback()
                    showListView()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun toggleCompleteCurrentNote() {
        val note = editingNote ?: return
        val toggled = repository.toggleArchiveQuickNote(note.id)
        if (toggled) {
            val msg = if (note.isArchived) "Note restored" else "Note marked complete!"
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            onNoteSavedCallback()
            showListView()
        }
    }

    // ==========================================
    // Recent Notes List Populator
    // ==========================================

    fun refreshRecentNotes() {
        applyListTheme()
        val theme = getCurrentTheme()
        recentNotesContainer.removeAllViews()
        val recentNotes = repository.getRecentNotes(25)

        if (recentNotes.isEmpty()) {
            val emptyLayout = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(0, (24 * density).toInt(), 0, (24 * density).toInt())
            }
            val emptyEmoji = TextView(context).apply {
                text = "📝"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
                gravity = Gravity.CENTER
            }
            val emptyTitle = TextView(context).apply {
                text = "No saved notes yet"
                setTextColor(theme.colors.textPrimary)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setPadding(0, (6 * density).toInt(), 0, 0)
            }
            val emptySub = TextView(context).apply {
                text = "Tap + New Sticky Note to write your thoughts."
                setTextColor(theme.colors.textSecondary)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                gravity = Gravity.CENTER
                setPadding(0, (2 * density).toInt(), 0, 0)
            }
            emptyLayout.addView(emptyEmoji)
            emptyLayout.addView(emptyTitle)
            emptyLayout.addView(emptySub)
            recentNotesContainer.addView(emptyLayout)
            return
        }

        for (note in recentNotes) {
            val pastel = getPastel(note.colorSchemeId)
            val noteCard = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                background = GradientDrawable().apply {
                    setColor(Color.parseColor(pastel.bg))
                    cornerRadius = 12 * density
                    setStroke((1 * density).toInt(), Color.parseColor(pastel.border))
                }
                val padH = (12 * density).toInt()
                val padV = (10 * density).toInt()
                setPadding(padH, padV, padH, padV)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, (8 * density).toInt())
                }
                // Tapping card opens the full sticky-note editor!
                setOnClickListener {
                    openEditor(note)
                }
            }

            // Top Row: Tag / Pin + Title
            val topRow = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, 0, 0, (4 * density).toInt())
            }

            val noteTitle = TextView(context).apply {
                text = if (note.isPinned) "📌 ${note.title}" else note.title
                setTextColor(Color.parseColor(pastel.text))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                typeface = Typeface.DEFAULT_BOLD
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            topRow.addView(noteTitle)

            if (note.tag.isNotEmpty()) {
                val tagBadge = TextView(context).apply {
                    text = note.tag
                    setTextColor(Color.parseColor(pastel.text))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
                    typeface = Typeface.DEFAULT_BOLD
                    val bPadH = (6 * density).toInt()
                    val bPadV = (2 * density).toInt()
                    setPadding(bPadH, bPadV, bPadH, bPadV)
                    background = GradientDrawable().apply {
                        setColor(Color.parseColor(pastel.tagBg))
                        cornerRadius = 6 * density
                    }
                }
                topRow.addView(tagBadge)
            }
            noteCard.addView(topRow)

            // Content snippet parsed with rich text spans
            if (note.content.isNotEmpty()) {
                val noteSnippet = TextView(context).apply {
                    text = RichTextHelper.fromHtml(note.content)
                    setTextColor(Color.parseColor("#475569"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                    maxLines = 2
                    ellipsize = TextUtils.TruncateAt.END
                }
                noteCard.addView(noteSnippet)
            }

            recentNotesContainer.addView(noteCard)
        }
    }
}
