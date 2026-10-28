import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

/**
 * Decodes common HTML entities into their readable characters.
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/**
 * Strips all HTML formatting tags, markdown syntax, and entity codes to produce
 * a clean, human-readable plain text string.
 *
 * Used for:
 * - Real-time note search matching
 * - Accessibility voice-over labels
 * - Scheduled notification previews
 */
export function stripRichText(content) {
  if (!content) return '';
  let str = String(content);

  // Normalize legacy checklist markdown
  str = str
    .replace(/- \[[ xX]\] /g, (m) => (m.includes(' ') ? '☐ ' : '☑ '))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>/gi, '\n');

  // Strip all HTML tags
  str = str.replace(/<[^>]+>/g, '');

  // Strip markdown formatting tokens
  str = str
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<![\w•])\*([^*\n]+)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<![\w•])_([^_\n]+)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1');

  // Decode entities and clean whitespace
  return decodeHtmlEntities(str).trim();
}

/**
 * Normalizes stored HTML, markdown, and entity-encoded note content into clean,
 * readable plain text suitable for Android/iOS local notifications.
 *
 * Guarantees:
 * 1. Strips all HTML tags (<b>, <i>, <u>, <s>, <span>, etc.) without leaving raw tag markers.
 * 2. Converts <br> and paragraph/div closures into sensible spaces.
 * 3. Decodes supported HTML entities (&amp;, &lt;, &gt;, &quot;, &#39;, &nbsp;).
 * 4. Preserves readable text, emojis, Unicode symbols, checklists (☐, ☑), and bullets (•).
 * 5. Normalizes excessive whitespace into a single space.
 * 6. Handles malformed legacy tags (e.g. unclosed <b>text<b> or dangling brackets) safely.
 * 7. Never mutates the original SQLite content.
 *
 * Example:
 * Input:  "<b>Meeting</b><br><i>Call Alex</i>"
 * Output: "Meeting Call Alex"
 */
export function normalizeNotificationText(raw) {
  if (raw == null) return '';
  let str = String(raw);

  // 1. Convert break and block boundary tags into spaces so text doesn't run together
  str = str
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<(p|div|li|h[1-6])[^>]*>/gi, '');

  // 2. Strip all remaining HTML tags
  str = str.replace(/<[^>]+>/g, '');

  // 3. Strip markdown bold, italic, underline, strike formatting markers
  str = str
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<![\w•])\*([^*\n]+)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<![\w•])_([^_\n]+)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1');

  // 4. Decode HTML entities
  str = decodeHtmlEntities(str);

  // 5. Normalize whitespace (collapse multiple spaces, tabs, newlines into a single space)
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

/**
 * Converts stored HTML/Unicode content into clean, human-friendly editor text.
 * Strips all literal HTML tags like <b> and <i>, converting them to clean markdown
 * tokens (**bold**, *italic*, _underline_, ~~strike~~) and Unicode checklists (☐, ☑).
 *
 * Guarantees that raw HTML tags like <b>ankit<b> never appear to the user.
 */
export function htmlToEditorText(raw) {
  if (!raw) return '';
  let text = String(raw);

  // 1. Normalize line breaks and containers
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>/gi, '\n')
    .replace(/<p[^>]*>|<div[^>]*>/gi, '');

  // 2. Normalize legacy checklist markdown
  text = text
    .replace(/- \[ \] /g, '☐ ')
    .replace(/- \[[xX]\] /g, '☑ ');

  // 3. Convert HTML formatting tags into clean markdown
  text = text
    .replace(/<\/?(b|strong)>/gi, '**')
    .replace(/<\/?(i|em)>/gi, '*')
    .replace(/<\/?(u)>/gi, '_')
    .replace(/<\/?(s|strike|del)>/gi, '~~');

  // 4. Strip any remaining unsupported HTML tags so zero raw tags ever appear
  text = text.replace(/<[^>]+>/g, '');

  // 5. Decode HTML entities AFTER stripping tags so literal <...> entities are preserved
  text = decodeHtmlEntities(text);

  // 6. Clean up redundant empty markdown tokens: ****, ____, etc.
  text = text
    .replace(/\*{6,}/g, '')
    .replace(/_{4,}/g, '')
    .replace(/~{4,}/g, '');

  return text;
}

/**
 * Converts editor text containing markdown tokens and Unicode checklists
 * into standard, safe, non-duplicated HTML tags compatible with FloatingDotOverlay (RichTextHelper.kt).
 *
 * Example:
 * "**Hello**" -> "<b>Hello</b>"
 * "*World*" -> "<i>World</i>"
 * "_Note_" -> "<u>Note</u>"
 * "~~Done~~" -> "<s>Done</s>"
 */
export function editorTextToHtml(text) {
  if (!text) return '';
  let str = String(text).trim();

  // 1. Normalize legacy markdown checklists to Unicode symbols
  str = str
    .replace(/- \[ \] /g, '☐ ')
    .replace(/- \[[xX]\] /g, '☑ ');

  // 2. Convert nested bold+italic ***text*** -> <b><i>text</i></b> (strict LIFO order)
  str = str.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');

  // 3. Convert markdown bold **text** -> <b>text</b>
  str = str.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  // 4. Convert markdown italic *text* -> <i>text</i> (not adjacent to words or bullets)
  str = str.replace(/(?<![\w•])\*([^*\n]+)\*/g, '<i>$1</i>');

  // 5. Convert markdown underline _text_ -> <u>text</u>
  str = str.replace(/(?<![\w•])_([^_\n]+)_(?![\w])/g, '<u>$1</u>');

  // 6. Convert markdown strikethrough ~~text~~ -> <s>text</s>
  str = str.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // 7. Clean up empty HTML tags
  str = str
    .replace(/<b><\/b>/gi, '')
    .replace(/<i><\/i>/gi, '')
    .replace(/<u><\/u>/gi, '')
    .replace(/<s><\/s>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n');

  return str;
}

/**
 * Parses and renders rich-text note content for React Native views.
 *
 * Supported Formatting:
 * - <b> / <strong> / **...** -> Bold
 * - <i> / <em> / *...* -> Italic
 * - <u> / _..._ -> Underline
 * - <s> / <strike> / <del> / ~~...~~ -> Strikethrough
 * - Checklist items: '☐ ' (unchecked) and '☑ ' (checked, with strikethrough)
 * - Bullet items: '• '
 *
 * Features:
 * - Safely handles nested and repeated tags (e.g. <b><i>text</i></b>)
 * - Converts legacy markdown notes transparently without corrupting content
 * - Strips any unsupported/container HTML tags (<p>, <span>, <div>) so no raw tags ever appear
 * - Backward-compatible: plain text with no tags returns standard clean text
 * - Supports interactive checklist tap toggle via options.onToggleChecklist(lineIndex)
 */
export function renderRichText(content, baseStyle = {}, textProps = {}, options = {}) {
  if (!content) return null;
  let raw = String(content);

  // 1. Decode entities
  raw = decodeHtmlEntities(raw);

  // 2. Normalize break and paragraph tags to newlines
  raw = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>/gi, '\n')
    .replace(/<p[^>]*>|<div[^>]*>/gi, '');

  // 3. Normalize legacy markdown syntax & convert markdown tokens to HTML tags
  raw = raw
    .replace(/- \[ \] /g, '☐ ')
    .replace(/- \[[xX]\] /g, '☑ ')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(?<![\w•])\*([^*\n]+)\*/g, '<i>$1</i>')
    .replace(/(?<![\w•])_([^_\n]+)_(?![\w])/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Fast path for plain text with no tags or checklist/bullet symbols
  const hasFormatting = /<[a-zA-Z\/][^>]*>/.test(raw) ||
    raw.includes('☐ ') || raw.includes('☑ ') || raw.includes('• ');

  if (!hasFormatting) {
    return (
      <Text style={baseStyle} {...textProps}>
        {raw}
      </Text>
    );
  }

  // Process text line by line to support checklists and bullets
  const lines = raw.split('\n');

  const renderedLines = lines.map((line, lineIndex) => {
    let linePrefix = null;
    let isLineChecked = false;
    let remaining = line;

    if (remaining.startsWith('☑ ')) {
      isLineChecked = true;
      linePrefix = '☑ ';
      remaining = remaining.slice(2);
    } else if (remaining.startsWith('☐ ')) {
      linePrefix = '☐ ';
      remaining = remaining.slice(2);
    } else if (remaining.startsWith('• ')) {
      linePrefix = '• ';
      remaining = remaining.slice(2);
    }

    // Tokenize line by HTML-like tags: captures <tag> and </tag>
    const tokens = remaining.split(/(<\/?[a-zA-Z0-9]+[^>]*>)/g);

    // Active style state stacks for nested tag support
    let boldDepth = 0;
    let italicDepth = 0;
    let underlineDepth = 0;
    let strikeDepth = isLineChecked ? 1 : 0;

    const lineElements = [];

    if (linePrefix) {
      if (options.onToggleChecklist && (linePrefix === '☐ ' || linePrefix === '☑ ')) {
        lineElements.push(
          <TouchableOpacity
            key={`prefix-btn-${lineIndex}`}
            onPress={() => options.onToggleChecklist(lineIndex)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ paddingRight: 4 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isLineChecked }}
            accessibilityLabel={isLineChecked ? 'Checked item, tap to uncheck' : 'Unchecked item, tap to check'}
          >
            <Text
              style={[
                baseStyle,
                isLineChecked ? { opacity: 0.65 } : { fontWeight: '700' },
              ]}
            >
              {linePrefix}
            </Text>
          </TouchableOpacity>
        );
      } else {
        lineElements.push(
          <Text
            key={`prefix-${lineIndex}`}
            style={[
              baseStyle,
              isLineChecked ? { opacity: 0.65 } : { fontWeight: '700' },
            ]}
          >
            {linePrefix}
          </Text>
        );
      }
    }

    tokens.forEach((token, tokenIdx) => {
      if (!token) return;

      // Check if token is a tag
      const tagMatch = token.match(/^<(\/)?([a-zA-Z0-9]+)[^>]*>$/);
      if (tagMatch) {
        const isClosing = Boolean(tagMatch[1]);
        const tagName = tagMatch[2].toLowerCase();

        switch (tagName) {
          case 'b':
          case 'strong':
            boldDepth = isClosing ? Math.max(0, boldDepth - 1) : boldDepth + 1;
            break;
          case 'i':
          case 'em':
            italicDepth = isClosing ? Math.max(0, italicDepth - 1) : italicDepth + 1;
            break;
          case 'u':
            underlineDepth = isClosing ? Math.max(0, underlineDepth - 1) : underlineDepth + 1;
            break;
          case 's':
          case 'strike':
          case 'del':
            strikeDepth = isClosing ? (isLineChecked ? 1 : Math.max(0, strikeDepth - 1)) : strikeDepth + 1;
            break;
          default:
            // Any other tag is silently stripped and NEVER rendered as text!
            break;
        }
        return;
      }

      // Plain text token with active styles applied
      const tokenStyle = [baseStyle];

      if (boldDepth > 0) {
        tokenStyle.push({ fontWeight: 'bold' });
      }
      if (italicDepth > 0) {
        tokenStyle.push({ fontStyle: 'italic' });
      }

      const isUnderlined = underlineDepth > 0;
      const isStruck = strikeDepth > 0;

      if (isUnderlined && isStruck) {
        tokenStyle.push({ textDecorationLine: 'underline line-through', opacity: isLineChecked ? 0.65 : 1 });
      } else if (isUnderlined) {
        tokenStyle.push({ textDecorationLine: 'underline' });
      } else if (isStruck) {
        tokenStyle.push({ textDecorationLine: 'line-through', opacity: isLineChecked ? 0.65 : 0.85 });
      }

      lineElements.push(
        <Text key={`tok-${lineIndex}-${tokenIdx}`} style={tokenStyle}>
          {token}
        </Text>
      );
    });

    return (
      <Text key={`line-${lineIndex}`} style={baseStyle}>
        {lineElements}
        {lineIndex < lines.length - 1 ? '\n' : ''}
      </Text>
    );
  });

  return (
    <Text style={baseStyle} {...textProps}>
      {renderedLines}
    </Text>
  );
}
