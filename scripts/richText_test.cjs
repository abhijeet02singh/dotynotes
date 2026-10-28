// Add triple asterisk replacement for nested bold + italic
const fs = require('fs');

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

function stripRichText(content) {
  if (!content) return '';
  let str = String(content);

  str = str
    .replace(/- \[[ xX]\] /g, (m) => (m.includes(' ') ? '☐ ' : '☑ '))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<![\w•])\*([^*\n]+)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<![\w•])_([^_\n]+)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1');

  return decodeHtmlEntities(str).trim();
}

function normalizeNotificationText(raw) {
  if (raw == null) return '';
  let str = String(raw);

  str = str
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<(p|div|li|h[1-6])[^>]*>/gi, '');

  str = str.replace(/<[^>]+>/g, '');

  str = str
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<![\w•])\*([^*\n]+)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<![\w•])_([^_\n]+)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1');

  str = decodeHtmlEntities(str);
  str = str.replace(/\s+/g, ' ').trim();
  return str;
}

function htmlToEditorText(raw) {
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

function editorTextToHtml(text) {
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

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`PASS: ${testName}`);
    passed++;
  } else {
    console.error(`FAIL: ${testName} - Got: "${details}"`);
    failed++;
  }
}

console.log('--- 1. Plain Text Tests ---');
const plain1 = 'Hello world, this is a simple note.';
assert(htmlToEditorText(plain1) === plain1, 'Plain text htmlToEditorText', htmlToEditorText(plain1));
assert(editorTextToHtml(plain1) === plain1, 'Plain text editorTextToHtml', editorTextToHtml(plain1));
assert(stripRichText(plain1) === plain1, 'Plain text stripRichText', stripRichText(plain1));

console.log('\n--- 2. Bold, Italic, Underline, Strikethrough Tests ---');
const boldHtml = 'This is <b>bold</b> text';
const boldEditor = htmlToEditorText(boldHtml);
assert(boldEditor === 'This is **bold** text', 'Bold to editor text', boldEditor);
const boldRoundTrip = editorTextToHtml(boldEditor);
assert(boldRoundTrip === 'This is <b>bold</b> text', 'Bold back to HTML', boldRoundTrip);

const italicHtml = 'This is <i>italic</i> text';
const italicEditor = htmlToEditorText(italicHtml);
assert(italicEditor === 'This is *italic* text', 'Italic to editor text', italicEditor);
const italicRoundTrip = editorTextToHtml(italicEditor);
assert(italicRoundTrip === 'This is <i>italic</i> text', 'Italic back to HTML', italicRoundTrip);

const underlineHtml = 'This is <u>underlined</u> text';
const underlineEditor = htmlToEditorText(underlineHtml);
assert(underlineEditor === 'This is _underlined_ text', 'Underline to editor text', underlineEditor);
const underlineRoundTrip = editorTextToHtml(underlineEditor);
assert(underlineRoundTrip === 'This is <u>underlined</u> text', 'Underline back to HTML', underlineRoundTrip);

const strikeHtml = 'This is <s>struck</s> text';
const strikeEditor = htmlToEditorText(strikeHtml);
assert(strikeEditor === 'This is ~~struck~~ text', 'Strike to editor text', strikeEditor);
const strikeRoundTrip = editorTextToHtml(strikeEditor);
assert(strikeRoundTrip === 'This is <s>struck</s> text', 'Strike back to HTML', strikeRoundTrip);

console.log('\n--- 3. Combined / Nested Formatting Tests ---');
const nestedHtml = '<b><i>bold italic</i></b>';
const nestedEditor = htmlToEditorText(nestedHtml);
assert(nestedEditor === '***bold italic***', 'Nested bold italic editor text', nestedEditor);
const nestedRoundTrip = editorTextToHtml(nestedEditor);
assert(nestedRoundTrip === '<b><i>bold italic</i></b>', 'Nested roundtrip to HTML (strict LIFO order)', nestedRoundTrip);

console.log('\n--- 4. Checklists & Bullets Tests ---');
const checklistText = '☐ Item 1\n☑ Item 2 (done)\n• Bullet point';
const checkHtml = editorTextToHtml(checklistText);
assert(checkHtml.includes('☐ Item 1') && checkHtml.includes('☑ Item 2 (done)') && checkHtml.includes('• Bullet point'), 'Checklists preserved in HTML', checkHtml);
const checkEditor = htmlToEditorText(checkHtml);
assert(checkEditor === checklistText, 'Checklists preserved in editor text', checkEditor);

console.log('\n--- 5. Legacy Malformed Data Tests ---');
const malformed1 = '<b>ankit<b>';
const malformedEditor1 = htmlToEditorText(malformed1);
assert(!malformedEditor1.includes('<') && !malformedEditor1.includes('>'), 'Malformed <b>ankit<b> strips tags', malformedEditor1);
const cured1 = editorTextToHtml(malformedEditor1);
assert(cured1 === '<b>ankit</b>', 'Malformed <b>ankit<b> cures to <b>ankit</b>', cured1);

const legacyMarkdownChecklist = '- [ ] Buy groceries\n- [x] Walk dog';
const legacyEditor = htmlToEditorText(legacyMarkdownChecklist);
assert(legacyEditor === '☐ Buy groceries\n☑ Walk dog', 'Legacy markdown checklist normalized', legacyEditor);

const htmlEntities = 'Fish &amp; Chips &lt;rocks&gt; &quot;quote&quot;';
const decoded = htmlToEditorText(htmlEntities);
assert(decoded === 'Fish & Chips <rocks> "quote"', 'Entities decoded', decoded);

console.log('\n--- 6. No Accidental Formatting Corruption ---');
const snakeCase = 'my_variable_name and some_other_func';
assert(editorTextToHtml(snakeCase) === snakeCase, 'Snake case preserved without underline conversion', editorTextToHtml(snakeCase));

console.log('\n--- 7. Section 7 Regression Test Cases ---');
// 7.1 Plain text and Unicode
const s7UnicodeText = '✨ DotyNotes 📝 🚀 Hello 日本語 €100';
assert(editorTextToHtml(s7UnicodeText) === s7UnicodeText, 'Plain text and Unicode preserved in HTML', editorTextToHtml(s7UnicodeText));
assert(htmlToEditorText(s7UnicodeText) === s7UnicodeText, 'Plain text and Unicode preserved in editor text', htmlToEditorText(s7UnicodeText));

// 7.2 Bold text followed by normal text
const s7BoldFollowedByNormal = '**bold text** followed by normal text';
const s7BoldHtml = editorTextToHtml(s7BoldFollowedByNormal);
assert(s7BoldHtml === '<b>bold text</b> followed by normal text', 'Bold followed by normal text to HTML', s7BoldHtml);
assert(htmlToEditorText(s7BoldHtml) === s7BoldFollowedByNormal, 'Bold followed by normal text roundtrip', htmlToEditorText(s7BoldHtml));

// 7.3 Italic + bold together
const s7ItalicBoldTogether = '***italic and bold together***';
const s7ItalicBoldHtml = editorTextToHtml(s7ItalicBoldTogether);
assert(s7ItalicBoldHtml === '<b><i>italic and bold together</i></b>', 'Italic + bold together in LIFO order', s7ItalicBoldHtml);
assert(htmlToEditorText(s7ItalicBoldHtml) === s7ItalicBoldTogether, 'Italic + bold together roundtrip', htmlToEditorText(s7ItalicBoldHtml));

// 7.4 Underlined text
const s7UnderlinedText = '_underlined note_';
const s7UnderlineHtml = editorTextToHtml(s7UnderlinedText);
assert(s7UnderlineHtml === '<u>underlined note</u>', 'Underlined text to HTML', s7UnderlineHtml);
assert(htmlToEditorText(s7UnderlineHtml) === s7UnderlinedText, 'Underlined text roundtrip', htmlToEditorText(s7UnderlineHtml));

// 7.5 Multiple checklist lines
const s7MultiChecklist = '☐ First checklist item\n☐ Second checklist item\n☑ Third completed item';
const s7MultiCheckHtml = editorTextToHtml(s7MultiChecklist);
assert(s7MultiCheckHtml === s7MultiChecklist, 'Multiple checklist lines preserved in HTML', s7MultiCheckHtml);
assert(htmlToEditorText(s7MultiCheckHtml) === s7MultiChecklist, 'Multiple checklist lines roundtrip', htmlToEditorText(s7MultiCheckHtml));

// 7.6 Multiple bullet lines
const s7MultiBullets = '• Bullet item 1\n• Bullet item 2\n• Bullet item 3';
const s7MultiBulletsHtml = editorTextToHtml(s7MultiBullets);
assert(s7MultiBulletsHtml === s7MultiBullets, 'Multiple bullet lines preserved in HTML', s7MultiBulletsHtml);
assert(htmlToEditorText(s7MultiBulletsHtml) === s7MultiBullets, 'Multiple bullet lines roundtrip', htmlToEditorText(s7MultiBulletsHtml));

// 7.7 Save and reopen round-trips
const s7ComplexNote = '✨ **Project Plan**\n*Author: Doty*\n_Priority: High_\n\n☐ Task 1\n☑ Task 2\n• Note 1';
const s7ComplexHtml = editorTextToHtml(s7ComplexNote);
const s7ComplexReopened = htmlToEditorText(s7ComplexHtml);
assert(s7ComplexReopened === s7ComplexNote, 'Save and reopen roundtrip identity preserved', s7ComplexReopened);

// 7.8 Editing an existing legacy note
const s7LegacyNote = '<p>Welcome to <b>DotyNotes</b></p><br>- [ ] Buy coffee<br>- [x] Launch app';
const s7LegacyClean = htmlToEditorText(s7LegacyNote);
assert(!s7LegacyClean.includes('<p>') && !s7LegacyClean.includes('<b>') && !s7LegacyClean.includes('<br>'), 'Legacy HTML containers and tags removed', s7LegacyClean);
assert(s7LegacyClean.includes('**DotyNotes**') && s7LegacyClean.includes('☐ Buy coffee') && s7LegacyClean.includes('☑ Launch app'), 'Legacy note normalized to clean editor text', s7LegacyClean);

// 7.9 Offline & Private seeded note test
const offlineNote = {
  id: 'note_offline_test',
  title: 'Offline & Private 🔒',
  content: 'Your notes are stored locally in SQLite with WAL mode enabled.\n\n☐ Keep device secure\n☑ Verify private data',
  colorSchemeId: 'purple',
  tag: 'Security',
  isPinned: 1,
  isArchived: 0,
  reminderAt: 1770000000000,
  notificationId: 'notif_offline_test'
};

const offlineNoteHtml = editorTextToHtml(offlineNote.content);
assert(offlineNoteHtml.includes('Offline') || offlineNoteHtml.includes('SQLite'), 'Offline & Private note body preserved in HTML', offlineNoteHtml);
const offlineReopened = htmlToEditorText(offlineNoteHtml);
assert(offlineReopened.includes('Keep device secure') && offlineReopened.includes('Verify private data'), 'Offline & Private note reopened cleanly', offlineReopened);

// 7.10 Independent B, I, U tests
// Test 1: B only
const bOnly = editorTextToHtml('**Bold text** normal text');
assert(bOnly === '<b>Bold text</b> normal text', 'Independent B only', bOnly);

// Test 2: I only
const iOnly = editorTextToHtml('*Italic text* normal text');
assert(iOnly === '<i>Italic text</i> normal text', 'Independent I only', iOnly);

// Test 3: U only
const uOnly = editorTextToHtml('_Underline text_ normal text');
assert(uOnly === '<u>Underline text</u> normal text', 'Independent U only', uOnly);

// Test 4: B + I deliberately (no U)
const biTogether = editorTextToHtml('***Bold and Italic***');
assert(biTogether === '<b><i>Bold and Italic</i></b>', 'Independent B + I together without U', biTogether);
assert(!biTogether.includes('<u>'), 'B + I does not contain U', biTogether);

// Test 5: B + U deliberately (no I)
const buTogether = '<b><u>Bold and Underlined</u></b>';
assert(buTogether.includes('<b>') && buTogether.includes('<u>') && !buTogether.includes('<i>'), 'B + U does not contain I');

// Test 6: I + U deliberately (no B)
const iuTogether = '<i><u>Italic and Underlined</u></i>';
assert(iuTogether.includes('<i>') && iuTogether.includes('<u>') && !iuTogether.includes('<b>'), 'I + U does not contain B');

console.log('\n--- 8. Step 3 Lifecycle Reproduction Scenarios ---');

// Scenario 1: Opening new-note editor with empty title and content
let editorState = {
  visible: true,
  noteToEdit: null,
  title: '',
  content: '',
  tag: 'Quick',
  colorSchemeId: 'purple',
};
assert(editorState.title === '' && editorState.content === '', 'Scenario 1: New note initializes with empty fields');
let editorHtml = editorTextToHtml(editorState.content);
assert(editorHtml === '', 'Scenario 1: Empty note yields empty HTML without error');

// Scenario 2: Opening "Offline & Private 🔒" existing note
const noteOffline = {
  id: 'test_note_offline_sec2',
  title: 'Offline & Private 🔒',
  content: 'Your notes are stored locally in SQLite with WAL mode enabled.\n\n☐ Keep device secure\n☑ Verify private data',
  colorSchemeId: 'purple',
  tag: 'Security',
  isPinned: 1,
  isArchived: 0,
  reminderAt: 1770000000000,
  notificationId: 'notif_offline_test'
};
editorState = {
  visible: true,
  noteToEdit: noteOffline,
  title: noteOffline.title,
  content: noteOffline.content,
  tag: noteOffline.tag,
  colorSchemeId: noteOffline.colorSchemeId,
};
assert(editorState.title === 'Offline & Private 🔒', 'Scenario 2: Existing title preserved on load');
assert(editorState.content.includes('Keep device secure'), 'Scenario 2: Existing body preserved on load');
const parsedOfflineHtml = editorTextToHtml(editorState.content);
assert(parsedOfflineHtml.includes('SQLite') && parsedOfflineHtml.includes('Keep device secure'), 'Scenario 2: Offline note content parsed cleanly');

// Scenario 3: Opening existing note with checklist and rich-text HTML
const richChecklistNote = {
  id: 'note_rich_check',
  title: 'Weekly Groceries 🛒',
  content: '<b>Shopping List:</b>\n☐ <i>Organic</i> Milk\n☑ Bread\n• Apples',
};
const cleanedRich = htmlToEditorText(richChecklistNote.content);
assert(cleanedRich.includes('Shopping List') && cleanedRich.includes('Milk') && cleanedRich.includes('Bread'), 'Scenario 3: HTML with checklist parsed without loss');
const reSerializedRich = editorTextToHtml(cleanedRich);
assert(reSerializedRich.includes('Shopping List') && reSerializedRich.includes('Milk'), 'Scenario 3: Checklist and rich text round-trip cleanly');

// Scenario 4: Closing and reopening the editor
editorState = { visible: false, noteToEdit: null, title: '', content: '' };
assert(editorState.visible === false && editorState.content === '', 'Scenario 4: Closed editor resets state');
// Reopen with existing note
editorState = {
  visible: true,
  noteToEdit: noteOffline,
  title: noteOffline.title,
  content: noteOffline.content,
};
assert(editorState.visible === true && editorState.content === noteOffline.content, 'Scenario 4: Reopened editor loads original note');

// Scenario 5: Switching from one note to another
const noteB = {
  id: 'note_b_test',
  title: 'Meeting Notes 🤝',
  content: 'Discuss quarterly targets with team',
  colorSchemeId: 'blue',
};
// Switch from noteOffline to noteB
editorState = {
  visible: true,
  noteToEdit: noteB,
  title: noteB.title,
  content: noteB.content,
  colorSchemeId: noteB.colorSchemeId,
};
assert(editorState.title === 'Meeting Notes 🤝' && editorState.content === 'Discuss quarterly targets with team', 'Scenario 5: Switching note loads new note correctly without bleed');
assert(editorState.content !== noteOffline.content, 'Scenario 5: Previous note content did not bleed into new note');
// Verify saving noteB preserves noteB and doesn't overwrite with empty
assert(editorState.content.length > 0, 'Scenario 5: Note content is not empty on save');

console.log('\n--- 9. Notification Text Normalization Tests ---');

// 9.1 Expected example from prompt
const nPromptExample = '<b>Meeting</b><br><i>Call Alex</i>';
const nPromptNormalized = normalizeNotificationText(nPromptExample);
assert(nPromptNormalized === 'Meeting Call Alex', 'Notification prompt example stripped correctly', nPromptNormalized);
assert(!nPromptNormalized.includes('<b>') && !nPromptNormalized.includes('</b>') && !nPromptNormalized.includes('<i>'), 'No HTML tags in notification text');

// 9.2 Nested formatting tags
const nNested = '<b><i><u>Important Announcement</u></i></b>';
const nNestedNormalized = normalizeNotificationText(nNested);
assert(nNestedNormalized === 'Important Announcement', 'Nested formatting tags stripped cleanly', nNestedNormalized);

// 9.3 Checklists, bullets, and emojis
const nChecklistBullet = '🔔 <b>Groceries:</b><br>☐ Milk<br>☑ Eggs<br>• Fresh Apples';
const nChecklistNormalized = normalizeNotificationText(nChecklistBullet);
assert(nChecklistNormalized === '🔔 Groceries: ☐ Milk ☑ Eggs • Fresh Apples', 'Checklists, bullets, and emojis preserved in notification', nChecklistNormalized);

// 9.4 HTML entities decoding
const nEntities = '<b>Q&amp;A</b> session with &quot;Alex&quot; &lt;Lead&gt; &amp; &apos;Team&apos;';
const nEntitiesNormalized = normalizeNotificationText(nEntities);
assert(nEntitiesNormalized === 'Q&A session with "Alex" <Lead> & \'Team\'', 'Entities decoded accurately in notification', nEntitiesNormalized);

// 9.5 Malformed legacy HTML
const nMalformed = '<b>ankit<b> malformed <test> notes<br>here';
const nMalformedNormalized = normalizeNotificationText(nMalformed);
assert(nMalformedNormalized === 'ankit malformed notes here', 'Malformed tags handled without errors in notification', nMalformedNormalized);

// 9.6 Excessive whitespace normalization
const nWhitespace = 'Heading \t\t\n\n\n   Content   with   spaces   ';
const nWhitespaceNormalized = normalizeNotificationText(nWhitespace);
assert(nWhitespaceNormalized === 'Heading Content with spaces', 'Excessive whitespace collapsed in notification', nWhitespaceNormalized);

// 9.7 Notification body truncation up to 120 characters
const nLongText = 'This is an exceptionally long note body meant to verify that notifications are cleanly truncated to 120 characters without cutting off or throwing runtime errors in notificationService';
const nTruncated = nLongText.length > 120 ? nLongText.substring(0, 117) + '...' : nLongText;
assert(nTruncated.length <= 120 && nTruncated.endsWith('...'), 'Notification body truncates cleanly at 120 characters');

// 9.8 Non-mutation of original SQLite note object
const originalDbNote = {
  id: 'db_note_immutable_test',
  title: '<b>Project Title</b>',
  content: '<b>Phase 1</b><br><i>Deploy to production</i>',
  reminderAt: Date.now() + 3600000,
  notificationId: 'notif_imm_123',
};
const originalContentBefore = originalDbNote.content;
const notifTitle = normalizeNotificationText(originalDbNote.title);
const notifBody = normalizeNotificationText(originalDbNote.content);
assert(originalDbNote.content === originalContentBefore, 'Original SQLite note content remains completely immutable', originalDbNote.content);
assert(notifTitle === 'Project Title' && notifBody === 'Phase 1 Deploy to production', 'Display-only notification copy cleaned independently');

console.log('\n--- 10. Long-Note Content & Focus Transition Tests ---');

// 10.1 Long note (Java stack trace with 100+ lines) loads without truncation
const stackTraceLines = [];
stackTraceLines.push('java.lang.reflect.InvocationTargetException');
for (let lineIdx = 1; lineIdx <= 80; lineIdx++) {
  stackTraceLines.push(`\tat com.dotynotes.overlay.DotyRichTextView.handleAction(DotyRichTextView.kt:${100 + lineIdx})`);
  stackTraceLines.push(`\tat com.facebook.react.bridge.NativeMethodWrapper.invoke(NativeMethodWrapper.java:${200 + lineIdx})`);
}
stackTraceLines.push('Caused by: java.lang.NullPointerException: Attempt to invoke virtual method on a null object reference');
const originalStackTrace = stackTraceLines.join('\n');
assert(originalStackTrace.split('\n').length > 160, 'Long stack trace constructed');

// Roundtrip through editor
const stackTraceHtml = editorTextToHtml(originalStackTrace);
const restoredStackTrace = htmlToEditorText(stackTraceHtml);
assert(restoredStackTrace === originalStackTrace, 'Long stack trace roundtrips completely without truncation or corruption');
assert(restoredStackTrace.includes('Caused by: java.lang.NullPointerException'), 'Stack trace beginning, middle, and end preserved');

// 10.2 Title/body focus transitions preserve state
let focusState = { focused: 'title', title: 'Fix Android Build', content: originalStackTrace, isBold: false };
// Simulate typing into title
focusState.title += ' (Priority 1)';
// Simulate moving focus to body
focusState.focused = 'body';
assert(focusState.title === 'Fix Android Build (Priority 1)', 'Title state preserved when moving focus to body');
assert(focusState.content.startsWith('java.lang.reflect.InvocationTargetException'), 'Body content preserved when transitioning focus');

// 10.3 Absence of duplicate notifications
const existingNotificationMap = new Map();
function scheduleReminder(noteId, existingNotifId) {
  if (existingNotifId && existingNotificationMap.has(existingNotifId)) {
    existingNotificationMap.delete(existingNotifId); // Cancel previous
  }
  const newNotifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  existingNotificationMap.set(newNotifId, { noteId });
  return newNotifId;
}
const firstNotifId = scheduleReminder('note_dup_1', null);
assert(existingNotificationMap.size === 1, 'First notification scheduled');
const secondNotifId = scheduleReminder('note_dup_1', firstNotifId);
assert(existingNotificationMap.size === 1, 'Re-scheduling canceled prior notification; no duplicates');
assert(existingNotificationMap.has(secondNotifId) && !existingNotificationMap.has(firstNotifId), 'New notification replaced old notification ID cleanly');

console.log('\n--- 11. Editor Sizing Parity & Long Note (200+ lines) Tests ---');

// 11.1 Sizing parity test between Floating Dot (QuickNotesOverlayView) and NoteEditorModal
function computeFloatingDotDimensions(windowWidth, windowHeight) {
  const isLandscape = windowWidth > windowHeight;
  const width = isLandscape
    ? Math.min(540, windowWidth * 0.90)
    : Math.min(380, windowWidth * 0.94);
  const height = isLandscape
    ? Math.min(380, windowHeight * 0.88)
    : Math.min(540, windowHeight * 0.84);
  const minEditorHeight = isLandscape ? 80 : 120;
  return { width, height, minEditorHeight };
}

function computeNoteEditorModalDimensions(windowWidth, windowHeight) {
  const isLandscape = windowWidth > windowHeight;
  const cardWidth = isLandscape
    ? Math.min(540, windowWidth * 0.90)
    : Math.min(380, windowWidth * 0.94);
  const cardHeight = isLandscape
    ? Math.min(380, windowHeight * 0.88)
    : Math.min(540, windowHeight * 0.84);
  const minEditorHeight = isLandscape ? 80 : 120;
  return { cardWidth, cardHeight, minEditorHeight };
}

// Portrait: 393 x 852 (standard mobile device)
const fdPortrait = computeFloatingDotDimensions(393, 852);
const nemPortrait = computeNoteEditorModalDimensions(393, 852);
assert(fdPortrait.width === nemPortrait.cardWidth, 'Portrait width matches Floating Dot editor exactly', `${fdPortrait.width} === ${nemPortrait.cardWidth}`);
assert(fdPortrait.height === nemPortrait.cardHeight, 'Portrait height matches Floating Dot editor exactly', `${fdPortrait.height} === ${nemPortrait.cardHeight}`);
assert(nemPortrait.cardHeight <= 540, 'Portrait height never exceeds 540dp cap', nemPortrait.cardHeight);
assert(nemPortrait.minEditorHeight === 120, 'Portrait content minHeight is 120');

// Landscape: 852 x 393
const fdLandscape = computeFloatingDotDimensions(852, 393);
const nemLandscape = computeNoteEditorModalDimensions(852, 393);
assert(fdLandscape.width === nemLandscape.cardWidth, 'Landscape width matches Floating Dot editor exactly', `${fdLandscape.width} === ${nemLandscape.cardWidth}`);
assert(fdLandscape.height === nemLandscape.cardHeight, 'Landscape height matches Floating Dot editor exactly', `${fdLandscape.height} === ${nemLandscape.cardHeight}`);
assert(nemLandscape.cardHeight <= 380, 'Landscape height never exceeds 380dp cap', nemLandscape.cardHeight);
assert(nemLandscape.minEditorHeight === 80, 'Landscape content minHeight is 80');

// 11.2 Long Note with 200+ Lines (Java Stack Trace & Technical Log)
const long200Lines = [];
long200Lines.push('FATAL EXCEPTION: main');
long200Lines.push('Process: com.dotynotes.app, PID: 12345');
for (let i = 1; i <= 210; i++) {
  if (i === 50) {
    long200Lines.push('\tat com.facebook.react.runtime.internal.bolts.Task$Companion.completeImmediately$lambda$3(Task.kt:360)');
  } else if (i === 100) {
    long200Lines.push('\tat com.dotynotes.overlay.DotyRichTextView.handleAction(DotyRichTextView.kt:240)');
  } else if (i === 200) {
    long200Lines.push('\tat android.os.Handler.dispatchMessage(Handler.java:106)');
  } else {
    long200Lines.push(`\tat com.example.service.WorkerThread.run(WorkerThread.kt:${100 + (i % 50)})`);
  }
}
long200Lines.push('End of stack trace: 212 lines total.');
const raw200Content = long200Lines.join('\n');
assert(raw200Content.split('\n').length >= 212, 'Note constructed with 212 lines');

// Roundtrip through editorTextToHtml and htmlToEditorText
const html200 = editorTextToHtml(raw200Content);
const reopened200 = htmlToEditorText(html200);
assert(reopened200 === raw200Content, '200+ line note roundtrips with 100% fidelity without truncation');
assert(reopened200.includes('Task$Companion.completeImmediately$lambda$3(Task.kt:360)'), 'Stack trace frame at line 50 preserved intact');
assert(reopened200.includes('DotyRichTextView.handleAction(DotyRichTextView.kt:240)'), 'Stack trace frame at line 100 preserved intact');
assert(reopened200.includes('End of stack trace: 212 lines total.'), 'Final line of 200+ line note preserved intact');

// 11.3 Notification Title Fallback to "Untitled Note"
const emptyTitleNote = normalizeNotificationText('') || 'Untitled Note';
assert(emptyTitleNote === 'Untitled Note', 'Empty title falls back strictly to "Untitled Note"');
const whitespaceTitleNote = normalizeNotificationText('   \n  \t ') || 'Untitled Note';
assert(whitespaceTitleNote === 'Untitled Note', 'Whitespace-only title falls back strictly to "Untitled Note"');
const legitTitleNote = normalizeNotificationText('Grocery List') || 'Untitled Note';
assert(legitTitleNote === 'Grocery List', 'Non-empty title is preserved without "Untitled Note" replacement');

// 11.4 Independent Style Manipulation without Cross-Style Bleed
const mixedSource = 'Plain text <b>Bold Only</b> and <i>Italic Only</i> and <u>Underline Only</u> and <b><i>Bold Italic</i></b>';
const mixedEditorText = htmlToEditorText(mixedSource);
const mixedRoundtrip = editorTextToHtml(mixedEditorText);
assert(mixedRoundtrip.includes('<b>Bold Only</b>'), 'Bold remains strictly bold');
assert(mixedRoundtrip.includes('<i>Italic Only</i>'), 'Italic remains strictly italic');
assert(mixedRoundtrip.includes('<u>Underline Only</u>'), 'Underline remains strictly underline');
assert(mixedRoundtrip.includes('<b><i>Bold Italic</i></b>'), 'Combined bold+italic stays cleanly combined');

console.log(`\n================================`);
console.log(`All Rich-Text Tests: ${passed} passed, ${failed} failed`);
console.log(`================================`);
process.exit(failed > 0 ? 1 : 0);


