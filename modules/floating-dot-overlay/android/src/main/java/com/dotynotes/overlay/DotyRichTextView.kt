package com.dotynotes.overlay

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.text.Editable
import android.text.Spannable
import android.text.Spanned
import android.text.TextWatcher
import android.text.style.StrikethroughSpan
import android.text.style.StyleSpan
import android.text.style.UnderlineSpan
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ScrollView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlin.math.max
import kotlin.math.min

/**
 * Reusable Native Android Rich-Text Editor View for DotyNotes.
 *
 * Implements true inline Spannable formatting:
 * - Completely independent Bold, Italic, and Underline formatting.
 * - SPAN_EXCLUSIVE_EXCLUSIVE based boundaries preventing cross-style contamination.
 * - Safe initialization preventing InvocationTargetException.
 * - Interactive checklist toggles (☐ <-> ☑) with strikethrough.
 * - Intelligent list continuation on Enter.
 * - Active formatting state dispatch for toolbar synchronization.
 * - Bidirectional canonical HTML serialization via RichTextHelper.
 * - Native ScrollView wrapping with smooth vertical scrolling for long content (stack traces).
 * - Instant, reliable keyboard opening on tap.
 */
class DotyRichTextView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

    class RichEditText(context: Context) : EditText(context) {
        var hostView: DotyRichTextView? = null
        var isReady: Boolean = false

        override fun onSelectionChanged(selStart: Int, selEnd: Int) {
            super.onSelectionChanged(selStart, selEnd)
            hostView?.onEditorSelectionChanged(selStart, selEnd)
        }
    }

    val onContentChange by EventDispatcher<Map<String, Any?>>()
    val onActiveStylesChange by EventDispatcher<Map<String, Any?>>()

    var scrollView: ScrollView? = null
        private set

    var editText: RichEditText? = null
        private set

    private var isBoldActive: Boolean = false
    private var isItalicActive: Boolean = false
    private var isUnderlineActive: Boolean = false
    private var isApplyingInternalChange: Boolean = false
    private var lastActionId: Int = -1
    private var currentHtml: String = ""

    init {
        orientation = VERTICAL
        val density = resources.displayMetrics.density

        val sv = ScrollView(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            isFillViewport = true
            isVerticalScrollBarEnabled = true
            scrollBarStyle = View.SCROLLBARS_INSIDE_INSET
            overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS

            setOnTouchListener { _, _ ->
                // Disallow parent React Native views from intercepting vertical scroll gestures
                parent?.requestDisallowInterceptTouchEvent(true)
                false
            }
        }

        val et = RichEditText(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
            background = null
            gravity = Gravity.TOP or Gravity.START
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setPadding(0, (4 * density).toInt(), 0, (8 * density).toInt())
            hint = "Write your thoughts here..."
            isFocusable = true
            isFocusableInTouchMode = true

            setOnTouchListener { _, event ->
                // Prevent outer React Native hierarchy from stealing touches while allowing the inner ScrollView to scroll
                parent?.parent?.requestDisallowInterceptTouchEvent(true)

                if (event.action == MotionEvent.ACTION_UP) {
                    if (handleCheckboxTap(event)) return@setOnTouchListener true
                }
                false
            }

            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}

                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                    if (isApplyingInternalChange) return

                    // Apply independent active styles strictly to newly typed characters
                    if (count > 0 && s is Spannable) {
                        val end = start + count
                        isApplyingInternalChange = true
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
                            isApplyingInternalChange = false
                        }
                    }

                    // Intelligent Enter-key list continuation
                    if (count == 1 && s != null && start < s.length && s[start] == '\n') {
                        handleNewlineListContinuation(start)
                    }

                    notifyContentChanged()
                    notifyActiveStyles()
                }

                override fun afterTextChanged(s: Editable?) {}
            })
        }

        sv.setOnClickListener {
            et.requestFocus()
            val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.showSoftInput(et, InputMethodManager.SHOW_IMPLICIT)
        }

        sv.addView(et)
        addView(sv)
        et.hostView = this
        et.isReady = true
        editText = et
        scrollView = sv
    }

    override val shouldUseAndroidLayout: Boolean = true

    internal fun onEditorSelectionChanged(selStart: Int, selEnd: Int) {
        val et = editText ?: return
        if (!et.isReady || isApplyingInternalChange) return
        try {
            if (selStart == selEnd) {
                syncActiveStylesFromCursor()
            }
            notifyActiveStyles()
        } catch (e: Throwable) {
            // Guard against callbacks during teardown
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        editText?.let {
            it.isReady = true
            notifyActiveStyles()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        editText?.isReady = false
    }

    fun setHtmlContent(html: String?) {
        val safeHtml = html ?: ""
        val et = editText ?: return
        if (safeHtml == currentHtml && et.text.isNotEmpty()) return

        currentHtml = safeHtml
        isApplyingInternalChange = true
        try {
            val spanned = RichTextHelper.fromHtml(safeHtml)
            et.setText(spanned)
            et.setSelection(et.text.length)
        } catch (e: Throwable) {
            et.setText(safeHtml)
        } finally {
            isApplyingInternalChange = false
        }
        syncActiveStylesFromCursor()
        notifyActiveStyles()
    }

    fun setPlaceholderText(placeholder: String?) {
        editText?.hint = placeholder ?: "Write your thoughts here..."
    }

    fun setTextColorHex(hex: String?) {
        if (hex.isNullOrEmpty()) return
        try {
            val color = Color.parseColor(hex)
            editText?.setTextColor(color)
            editText?.setHintTextColor(Color.argb(100, Color.red(color), Color.green(color), Color.blue(color)))
        } catch (e: Exception) {
            // fallback
        }
    }

    fun setEditorFontSize(sp: Float?) {
        if (sp != null && sp > 0) {
            editText?.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
        }
    }

    fun handleAction(action: Map<String, Any?>?) {
        if (action == null) return
        val type = action["type"] as? String ?: return
        val id = (action["id"] as? Number)?.toInt() ?: 0
        if (id == lastActionId) return
        lastActionId = id

        when (type) {
            "toggleBold" -> applyBoldFormat()
            "toggleItalic" -> applyItalicFormat()
            "toggleUnderline" -> applyUnderlineFormat()
            "toggleChecklist" -> applyChecklistFormat()
            "toggleBullet" -> applyBulletFormat()
            "completeAll" -> completeAllChecklistItems()
        }
    }

    // ==========================================
    // Independent Formatting Actions
    // ==========================================

    fun applyBoldFormat() {
        val et = editText ?: return
        val text = et.text ?: return
        val start = et.selectionStart
        val end = et.selectionEnd

        if (start < end && start >= 0) {
            val isEntirelyBold = isRangeEntirelyBold(text, start, end)
            isApplyingInternalChange = true
            try {
                if (isEntirelyBold) {
                    removeBoldRange(text, start, end)
                    isBoldActive = false
                } else {
                    addBoldRange(text, start, end)
                    isBoldActive = true
                }
            } finally {
                isApplyingInternalChange = false
            }
            et.setSelection(start, end)
            notifyContentChanged()
        } else if (start >= 0) {
            isBoldActive = !isBoldActive
        }
        notifyActiveStyles()
    }

    fun applyItalicFormat() {
        val et = editText ?: return
        val text = et.text ?: return
        val start = et.selectionStart
        val end = et.selectionEnd

        if (start < end && start >= 0) {
            val isEntirelyItalic = isRangeEntirelyItalic(text, start, end)
            isApplyingInternalChange = true
            try {
                if (isEntirelyItalic) {
                    removeItalicRange(text, start, end)
                    isItalicActive = false
                } else {
                    addItalicRange(text, start, end)
                    isItalicActive = true
                }
            } finally {
                isApplyingInternalChange = false
            }
            et.setSelection(start, end)
            notifyContentChanged()
        } else if (start >= 0) {
            isItalicActive = !isItalicActive
        }
        notifyActiveStyles()
    }

    fun applyUnderlineFormat() {
        val et = editText ?: return
        val text = et.text ?: return
        val start = et.selectionStart
        val end = et.selectionEnd

        if (start < end && start >= 0) {
            val isEntirelyUnderline = isRangeEntirelyUnderline(text, start, end)
            isApplyingInternalChange = true
            try {
                if (isEntirelyUnderline) {
                    removeUnderlineRange(text, start, end)
                    isUnderlineActive = false
                } else {
                    addUnderlineRange(text, start, end)
                    isUnderlineActive = true
                }
            } finally {
                isApplyingInternalChange = false
            }
            et.setSelection(start, end)
            notifyContentChanged()
        } else if (start >= 0) {
            isUnderlineActive = !isUnderlineActive
        }
        notifyActiveStyles()
    }

    fun applyChecklistFormat() {
        val et = editText ?: return
        val text = et.text ?: return
        val cursor = et.selectionStart.coerceAtLeast(0)

        val layout = et.layout
        val line = if (layout != null && text.isNotEmpty()) {
            layout.getLineForOffset(min(cursor, text.length - 1).coerceAtLeast(0))
        } else 0

        val lineStart = if (layout != null) layout.getLineStart(line) else 0
        val lineEnd = if (layout != null) layout.getLineEnd(line) else text.length
        val lineStr = text.substring(lineStart, lineEnd)

        isApplyingInternalChange = true
        try {
            when {
                lineStr.startsWith("☐ ") -> {
                    text.replace(lineStart, lineStart + 1, "☑")
                    val strikeStart = (lineStart + 2).coerceAtMost(lineEnd)
                    if (strikeStart < lineEnd) {
                        text.setSpan(StrikethroughSpan(), strikeStart, lineEnd, Spanned.SPAN_EXCLUSIVE_INCLUSIVE)
                    }
                }
                lineStr.startsWith("☑ ") -> {
                    text.delete(lineStart, lineStart + 2)
                    val strikes = text.getSpans(lineStart, lineEnd - 2, StrikethroughSpan::class.java)
                    for (s in strikes) text.removeSpan(s)
                }
                lineStr.startsWith("• ") -> {
                    text.replace(lineStart, lineStart + 2, "☐ ")
                }
                else -> {
                    text.insert(lineStart, "☐ ")
                }
            }
        } finally {
            isApplyingInternalChange = false
        }
        notifyContentChanged()
        notifyActiveStyles()
    }

    fun applyBulletFormat() {
        val et = editText ?: return
        val text = et.text ?: return
        val cursor = et.selectionStart.coerceAtLeast(0)

        val layout = et.layout
        val line = if (layout != null && text.isNotEmpty()) {
            layout.getLineForOffset(min(cursor, text.length - 1).coerceAtLeast(0))
        } else 0

        val lineStart = if (layout != null) layout.getLineStart(line) else 0
        val lineEnd = if (layout != null) layout.getLineEnd(line) else text.length
        val lineStr = text.substring(lineStart, lineEnd)

        isApplyingInternalChange = true
        try {
            when {
                lineStr.startsWith("• ") -> {
                    text.delete(lineStart, lineStart + 2)
                }
                lineStr.startsWith("☐ ") || lineStr.startsWith("☑ ") -> {
                    text.replace(lineStart, lineStart + 2, "• ")
                    val strikes = text.getSpans(lineStart, lineEnd, StrikethroughSpan::class.java)
                    for (s in strikes) text.removeSpan(s)
                }
                else -> {
                    text.insert(lineStart, "• ")
                }
            }
        } finally {
            isApplyingInternalChange = false
        }
        notifyContentChanged()
        notifyActiveStyles()
    }

    fun completeAllChecklistItems() {
        val et = editText ?: return
        val text = et.text ?: return
        isApplyingInternalChange = true
        try {
            var idx = 0
            while (idx < text.length) {
                val next = text.indexOf("☐ ", idx)
                if (next == -1) break
                text.replace(next, next + 1, "☑")
                val lineEnd = text.indexOf('\n', next).let { if (it == -1) text.length else it }
                text.setSpan(StrikethroughSpan(), next + 2, lineEnd, Spanned.SPAN_EXCLUSIVE_INCLUSIVE)
                idx = next + 2
            }
        } finally {
            isApplyingInternalChange = false
        }
        notifyContentChanged()
        notifyActiveStyles()
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
        val et = editText ?: return
        val text = et.text ?: return
        val cursor = et.selectionStart
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

    private fun handleCheckboxTap(event: MotionEvent): Boolean {
        val et = editText ?: return false
        val text = et.text ?: return false
        val layout = et.layout ?: return false

        val x = event.x - et.totalPaddingLeft + et.scrollX
        val y = event.y - et.totalPaddingTop + et.scrollY
        if (x < 0 || y < 0) return false

        val line = layout.getLineForVertical(y.toInt())
        val offset = layout.getOffsetForHorizontal(line, x)
        val lineStart = layout.getLineStart(line)
        val lineEnd = layout.getLineEnd(line)

        if (lineStart >= text.length || offset > lineStart + 3) {
            return false
        }

        val lineStr = text.substring(lineStart, lineEnd)
        isApplyingInternalChange = true
        try {
            if (lineStr.startsWith("☐ ")) {
                text.replace(lineStart, lineStart + 1, "☑")
                val strikeStart = (lineStart + 2).coerceAtMost(lineEnd)
                if (strikeStart < lineEnd) {
                    text.setSpan(StrikethroughSpan(), strikeStart, lineEnd, Spanned.SPAN_EXCLUSIVE_INCLUSIVE)
                }
                notifyContentChanged()
                notifyActiveStyles()
                return true
            } else if (lineStr.startsWith("☑ ")) {
                text.replace(lineStart, lineStart + 1, "☐")
                val strikes = text.getSpans(lineStart, lineEnd, StrikethroughSpan::class.java)
                for (s in strikes) text.removeSpan(s)
                notifyContentChanged()
                notifyActiveStyles()
                return true
            }
        } finally {
            isApplyingInternalChange = false
        }
        return false
    }

    private fun handleNewlineListContinuation(newlineIndex: Int) {
        val et = editText ?: return
        val text = et.text ?: return
        if (newlineIndex <= 0) return

        val prevLineEnd = newlineIndex
        val prevLineBreak = text.lastIndexOf('\n', prevLineEnd - 1)
        val prevLineStart = if (prevLineBreak != -1) prevLineBreak + 1 else 0
        val prevLineText = text.substring(prevLineStart, prevLineEnd)

        isApplyingInternalChange = true
        try {
            when {
                prevLineText.startsWith("☐ ") || prevLineText.startsWith("☑ ") -> {
                    if (prevLineText.length <= 2 || prevLineText.substring(2).trim().isEmpty()) {
                        text.delete(prevLineStart, prevLineEnd)
                    } else {
                        text.insert(newlineIndex + 1, "☐ ")
                        et.setSelection(newlineIndex + 3)
                    }
                }
                prevLineText.startsWith("• ") -> {
                    if (prevLineText.length <= 2 || prevLineText.substring(2).trim().isEmpty()) {
                        text.delete(prevLineStart, prevLineEnd)
                    } else {
                        text.insert(newlineIndex + 1, "• ")
                        et.setSelection(newlineIndex + 3)
                    }
                }
            }
        } finally {
            isApplyingInternalChange = false
        }
    }

    private fun notifyContentChanged() {
        val et = editText ?: return
        val text = et.text ?: return
        val html = RichTextHelper.toHtml(text)
        currentHtml = html
        val plain = text.toString()
        try {
            onContentChange(mapOf("html" to html, "plainText" to plain))
        } catch (e: Throwable) {
            // Suppress if not attached or listener not ready
        }
    }

    private fun notifyActiveStyles() {
        val et = editText ?: return
        val text = et.text ?: return
        val start = et.selectionStart
        val end = et.selectionEnd
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
        val layout = et.layout
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

        try {
            onActiveStylesChange(mapOf(
                "isBold" to isBold,
                "isItalic" to isItalic,
                "isUnderline" to isUnderline,
                "isChecklist" to isChecklist,
                "isBullet" to isBullet
            ))
        } catch (e: Throwable) {
            // Suppress if not attached or listener not ready
        }
    }
}
