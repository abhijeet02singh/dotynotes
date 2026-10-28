package com.dotynotes.overlay

import android.graphics.Typeface
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.StrikethroughSpan
import android.text.style.StyleSpan
import android.text.style.UnderlineSpan
import java.util.Stack
import java.util.regex.Pattern

/**
 * Robust, backward-compatible rich-text serializer and parser for DotyNotes.
 *
 * Supported Formatting:
 * - Bold: <b>...</b> <-> StyleSpan(Typeface.BOLD)
 * - Italic: <i>...</i> <-> StyleSpan(Typeface.ITALIC)
 * - Underline: <u>...</u> <-> UnderlineSpan()
 * - Strikethrough: <s>...</s> <-> StrikethroughSpan()
 * - Checklist items: Unicode '☐ ' (unchecked) and '☑ ' (checked, with strikethrough)
 * - Bullet items: Unicode '• '
 *
 * Key Invariants:
 * - Pure plain-text notes have zero tags and serialize as plain text.
 * - Legacy markdown (**bold**, *italic*, - [ ], - [x]) is transparently normalized.
 * - Unknown or container tags (<p>, <span>, <div>, <br>) are handled or stripped,
 *   preventing literal HTML tags from ever appearing to the user.
 * - Strict LIFO tag closing guarantees valid, non-duplicated HTML on repeated saves.
 */
object RichTextHelper {

    private data class SpanRange(
        val tag: String,
        val start: Int,
        val end: Int
    )

    private data class OpenTag(
        val tag: String,
        val startIndex: Int
    )

    private fun decodeHtmlEntities(raw: String): String {
        return raw
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&apos;", "'")
    }

    /**
     * Converts a Spanned (or CharSequence) into a clean, backward-compatible HTML/text string.
     * If the input contains no formatting spans, returns text.toString() directly.
     */
    fun toHtml(text: CharSequence?): String {
        if (text == null) return ""
        val spanned = text as? Spanned ?: return text.toString()
        if (spanned.length == 0) return ""

        val styleSpans = spanned.getSpans(0, spanned.length, StyleSpan::class.java)
        val underlineSpans = spanned.getSpans(0, spanned.length, UnderlineSpan::class.java)
        val strikeSpans = spanned.getSpans(0, spanned.length, StrikethroughSpan::class.java)

        if (styleSpans.isEmpty() && underlineSpans.isEmpty() && strikeSpans.isEmpty()) {
            return spanned.toString()
        }

        // Collect all active formatting ranges
        val ranges = mutableListOf<SpanRange>()

        for (span in styleSpans) {
            val start = spanned.getSpanStart(span).coerceAtLeast(0)
            val end = spanned.getSpanEnd(span).coerceAtMost(spanned.length)
            if (start < end) {
                when (span.style) {
                    Typeface.BOLD -> ranges.add(SpanRange("b", start, end))
                    Typeface.ITALIC -> ranges.add(SpanRange("i", start, end))
                    Typeface.BOLD_ITALIC -> {
                        ranges.add(SpanRange("b", start, end))
                        ranges.add(SpanRange("i", start, end))
                    }
                }
            }
        }

        for (span in underlineSpans) {
            val start = spanned.getSpanStart(span).coerceAtLeast(0)
            val end = spanned.getSpanEnd(span).coerceAtMost(spanned.length)
            if (start < end) {
                ranges.add(SpanRange("u", start, end))
            }
        }

        for (span in strikeSpans) {
            val start = spanned.getSpanStart(span).coerceAtLeast(0)
            val end = spanned.getSpanEnd(span).coerceAtMost(spanned.length)
            if (start < end) {
                ranges.add(SpanRange("s", start, end))
            }
        }

        // Deduplicate overlapping duplicate ranges for the same tag
        val uniqueRanges = ranges.distinct()

        // Organize opening and closing events
        // Spans opening at the same index: longer spans open first
        // Spans closing at the same index: shorter spans close first (LIFO order)
        val opensByIndex = HashMap<Int, MutableList<SpanRange>>()
        val closesByIndex = HashMap<Int, MutableList<SpanRange>>()

        for (r in uniqueRanges) {
            opensByIndex.getOrPut(r.start) { mutableListOf() }.add(r)
            closesByIndex.getOrPut(r.end) { mutableListOf() }.add(r)
        }

        val sb = StringBuilder()
        val activeStack = Stack<SpanRange>()

        for (i in 0 until spanned.length) {
            // Process closes at index i
            closesByIndex[i]?.let { toClose ->
                // Sort by span length ascending for proper LIFO closing
                toClose.sortBy { it.end - it.start }
                for (r in toClose) {
                    if (activeStack.contains(r)) {
                        val tempPopped = mutableListOf<SpanRange>()
                        while (!activeStack.isEmpty()) {
                            val top = activeStack.pop()
                            sb.append("</").append(top.tag).append(">")
                            if (top == r) break
                            tempPopped.add(top)
                        }
                        // Re-open outer spans that were popped
                        for (reopen in tempPopped.reversed()) {
                            sb.append("<").append(reopen.tag).append(">")
                            activeStack.push(reopen)
                        }
                    }
                }
            }

            // Process opens at index i
            opensByIndex[i]?.let { toOpen ->
                // Sort by span length descending so larger scopes open first
                toOpen.sortByDescending { it.end - it.start }
                for (r in toOpen) {
                    sb.append("<").append(r.tag).append(">")
                    activeStack.push(r)
                }
            }

            sb.append(spanned[i])
        }

        // Final closes at the end of text
        closesByIndex[spanned.length]?.let { toClose ->
            toClose.sortBy { it.end - it.start }
            for (r in toClose) {
                if (activeStack.contains(r)) {
                    val tempPopped = mutableListOf<SpanRange>()
                    while (!activeStack.isEmpty()) {
                        val top = activeStack.pop()
                        sb.append("</").append(top.tag).append(">")
                        if (top == r) break
                        tempPopped.add(top)
                    }
                    for (reopen in tempPopped.reversed()) {
                        sb.append("<").append(reopen.tag).append(">")
                        activeStack.push(reopen)
                    }
                }
            }
        }

        while (!activeStack.isEmpty()) {
            val top = activeStack.pop()
            sb.append("</").append(top.tag).append(">")
        }

        return sb.toString()
    }

    /**
     * Parses stored content into a SpannableStringBuilder with native Android spans applied.
     * Strips all formatting tags from visible text and normalizes legacy checklist/bullet syntax.
     */
    fun fromHtml(raw: String?): SpannableStringBuilder {
        if (raw.isNullOrEmpty()) {
            return SpannableStringBuilder("")
        }

        // 1. Decode entities
        var text = decodeHtmlEntities(raw)

        // 2. Normalize break and container tags
        text = text
            .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), "\n")
            .replace(Regex("</p>|</div\\s*>", RegexOption.IGNORE_CASE), "\n")
            .replace(Regex("<p[^>]*>|<div[^>]*>", RegexOption.IGNORE_CASE), "")

        // 3. Normalize legacy markdown
        text = text
            .replace("- [ ] ", "☐ ")
            .replace("- [x] ", "☑ ")
            .replace("- [X] ", "☑ ")
            .replace(Regex("\\*\\*(.+?)\\*\\*"), "<b>$1</b>")
            .replace(Regex("(?<![\\w•])\\*([^*\\n]+)\\*"), "<i>$1</i>")

        // 4. Parse supported formatting tags into native spans
        val ssb = SpannableStringBuilder()
        val tagStack = Stack<OpenTag>()

        var i = 0
        val len = text.length
        while (i < len) {
            if (text[i] == '<') {
                val closeBracket = text.indexOf('>', i)
                if (closeBracket != -1) {
                    val tagInner = text.substring(i + 1, closeBracket).trim()
                    val isClosing = tagInner.startsWith("/")
                    val rawTagName = if (isClosing) tagInner.substring(1).trim() else tagInner.split(" ", "\t").first().trim()
                    val tagName = rawTagName.lowercase()

                    when (tagName) {
                        "b", "strong" -> {
                            handleTag(ssb, tagStack, "b", isClosing)
                            i = closeBracket + 1
                            continue
                        }
                        "i", "em" -> {
                            handleTag(ssb, tagStack, "i", isClosing)
                            i = closeBracket + 1
                            continue
                        }
                        "u" -> {
                            handleTag(ssb, tagStack, "u", isClosing)
                            i = closeBracket + 1
                            continue
                        }
                        "s", "strike", "del" -> {
                            handleTag(ssb, tagStack, "s", isClosing)
                            i = closeBracket + 1
                            continue
                        }
                        else -> {
                            // Any unsupported HTML tag is SILENTLY STRIPPED and never emitted into visible text!
                            i = closeBracket + 1
                            continue
                        }
                    }
                }
            }
            ssb.append(text[i])
            i++
        }

        // Close any dangling unclosed tags
        while (!tagStack.isEmpty()) {
            val open = tagStack.pop()
            val start = open.startIndex
            val end = ssb.length
            if (start < end) {
                applySpanByTag(ssb, open.tag, start, end)
            }
        }

        // 5. Ensure checked checklist lines (starting with ☑ ) carry StrikethroughSpan
        val lines = ssb.split(Pattern.compile("\n"))
        var lineStart = 0
        for (line in lines) {
            val lineLength = line.length
            val lineEnd = lineStart + lineLength
            if (line.startsWith("☑ ")) {
                val strikeStart = (lineStart + 2).coerceAtMost(lineEnd)
                if (strikeStart < lineEnd) {
                    ssb.setSpan(
                        StrikethroughSpan(),
                        strikeStart,
                        lineEnd,
                        Spanned.SPAN_EXCLUSIVE_INCLUSIVE
                    )
                }
            }
            lineStart = lineEnd + 1
        }

        return ssb
    }

    private fun handleTag(
        ssb: SpannableStringBuilder,
        tagStack: Stack<OpenTag>,
        tag: String,
        isClosing: Boolean
    ) {
        if (!isClosing) {
            tagStack.push(OpenTag(tag, ssb.length))
        } else {
            var foundIdx = -1
            for (idx in tagStack.indices.reversed()) {
                if (tagStack[idx].tag == tag) {
                    foundIdx = idx
                    break
                }
            }
            if (foundIdx != -1) {
                val open = tagStack.removeAt(foundIdx)
                val start = open.startIndex
                val end = ssb.length
                if (start < end) {
                    applySpanByTag(ssb, open.tag, start, end)
                }
            }
        }
    }

    private fun applySpanByTag(ssb: SpannableStringBuilder, tag: String, start: Int, end: Int) {
        when (tag) {
            "b" -> ssb.setSpan(StyleSpan(Typeface.BOLD), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            "i" -> ssb.setSpan(StyleSpan(Typeface.ITALIC), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            "u" -> ssb.setSpan(UnderlineSpan(), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            "s" -> ssb.setSpan(StrikethroughSpan(), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
    }
}

