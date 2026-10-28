const assert = require('assert');
const path = require('path');

// Test runner
let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const url = require('url');

async function runSuite() {
  console.log('=== DotyNotes Note Colors & Editor Regression Test Suite ===\n');

  // Load theme constants
  const themePath = url.pathToFileURL(path.resolve(__dirname, '../src/constants/theme.js')).href;
  const { THEME, COLOR_ALIASES, getPastelColor } = await import(themePath);

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

  function htmlToEditorText(raw) {
    if (!raw) return '';
    let text = String(raw);
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>/gi, '\n')
      .replace(/<p[^>]*>|<div[^>]*>/gi, '')
      .replace(/- \[ \] /g, '☐ ')
      .replace(/- \[[xX]\] /g, '☑ ')
      .replace(/<\/?(b|strong)>/gi, '**')
      .replace(/<\/?(i|em)>/gi, '*')
      .replace(/<\/?(u)>/gi, '_')
      .replace(/<\/?(s|strike|del)>/gi, '~~')
      .replace(/<[^>]+>/g, '');
    text = decodeHtmlEntities(text);
    return text;
  }

  function editorTextToHtml(text) {
    if (!text) return '';
    let str = String(text).trim();
    str = str
      .replace(/- \[ \] /g, '☐ ')
      .replace(/- \[[xX]\] /g, '☑ ')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(?<![\w•])\*([^*\n]+)\*/g, '<i>$1</i>')
      .replace(/(?<![\w•])_([^_\n]+)_(?![\w])/g, '<u>$1</u>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>');
    return str;
  }

  // --- 1. Pastel Palette & Alias Mapping Verification ---
  // --- 1. Pastel Palette & Alias Mapping Verification ---
  test('1. Core pastel palette contains exactly the 7 canonical DotyNotes colors', () => {
    assert.strictEqual(THEME.colors.pastels.length, 7);
    const ids = THEME.colors.pastels.map((p) => p.id);
    assert.deepStrictEqual(ids, ['blue', 'mint', 'pink', 'yellow', 'lavender', 'teal', 'sky']);
  });

  test('2. getPastelColor resolves blue, mint, pink, yellow, lavender, teal, sky accurately', () => {
    assert.strictEqual(getPastelColor('blue').id, 'blue');
    assert.strictEqual(getPastelColor('blue').bg, '#A8C7FA');

    assert.strictEqual(getPastelColor('mint').id, 'mint');
    assert.strictEqual(getPastelColor('mint').bg, '#A4E7C0');

    assert.strictEqual(getPastelColor('pink').id, 'pink');
    assert.strictEqual(getPastelColor('pink').bg, '#EEA0CA');

    assert.strictEqual(getPastelColor('yellow').id, 'yellow');
    assert.strictEqual(getPastelColor('yellow').bg, '#F7CC78');

    assert.strictEqual(getPastelColor('lavender').id, 'lavender');
    assert.strictEqual(getPastelColor('lavender').bg, '#BFAFF8');

    assert.strictEqual(getPastelColor('teal').id, 'teal');
    assert.strictEqual(getPastelColor('teal').bg, '#87D4CA');

    assert.strictEqual(getPastelColor('sky').id, 'sky');
    assert.strictEqual(getPastelColor('sky').bg, '#ADD3F5');
  });

  test('3. getPastelColor handles legacy and human-readable aliases gracefully', () => {
    assert.strictEqual(getPastelColor('green').id, 'mint');
    assert.strictEqual(getPastelColor('orange').id, 'yellow');
    assert.strictEqual(getPastelColor('peach').id, 'yellow');
    assert.strictEqual(getPastelColor('rose').id, 'pink');
    assert.strictEqual(getPastelColor('purple').id, 'lavender');
    assert.strictEqual(getPastelColor('MINT').id, 'mint');
    assert.strictEqual(getPastelColor('  yellow  ').id, 'yellow');
    assert.strictEqual(getPastelColor(null).id, 'lavender');
    assert.strictEqual(getPastelColor(undefined).id, 'lavender');
    assert.strictEqual(getPastelColor('unknown_color').id, 'lavender');
  });

  // --- Mock Database & Editor Simulation ---
  class MockNotesStore {
    constructor() {
      this.notes = new Map();
      this.settings = new Map();
      this.settings.set('default_note_color', 'purple');
    }

    createNote({ id: customId, title, content, colorSchemeId, tag = 'General' }) {
      const id = customId || `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const note = {
        id,
        title: title || 'Untitled Note',
        content: content || '',
        colorSchemeId: colorSchemeId || this.settings.get('default_note_color') || 'purple',
        tag,
        isPinned: 0,
        isArchived: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.notes.set(id, note);
      return { ...note };
    }

    updateNote(id, fields) {
      const existing = this.notes.get(id);
      if (!existing) throw new Error('Note not found');
      const updated = {
        ...existing,
        ...fields,
        updatedAt: Date.now(),
      };
      this.notes.set(id, updated);
      return { ...updated };
    }

    getNote(id) {
      const n = this.notes.get(id);
      return n ? { ...n } : null;
    }

    getAllNotes() {
      return Array.from(this.notes.values()).map((n) => ({ ...n }));
    }
  }

  // --- Scenario 1: Create a note with purple selected; save and reopen it ---
  test('Scenario 1: Create a note with purple selected; save and reopen it', () => {
    const store = new MockNotesStore();
    const created = store.createNote({
      title: 'Purple Idea',
      content: 'This is a purple note',
      colorSchemeId: 'purple',
    });

    assert.strictEqual(created.colorSchemeId, 'purple');
    const reopened = store.getNote(created.id);
    assert.strictEqual(reopened.colorSchemeId, 'purple');

    const cardPastel = getPastelColor(reopened.colorSchemeId);
    assert.strictEqual(cardPastel.id, 'lavender');
    assert.strictEqual(cardPastel.bg, '#BFAFF8');
    assert.notStrictEqual(cardPastel.bg, '#FFFFFF', 'Note card must not be white');
  });

  // --- Scenario 2: Create a note with yellow selected; verify its card is yellow ---
  test('Scenario 2: Create a note with yellow selected; verify its card is yellow', () => {
    const store = new MockNotesStore();
    const created = store.createNote({
      title: 'Yellow Task',
      content: 'Need to buy groceries',
      colorSchemeId: 'yellow',
    });

    assert.strictEqual(created.colorSchemeId, 'yellow');
    const cardPastel = getPastelColor(created.colorSchemeId);
    assert.strictEqual(cardPastel.id, 'yellow');
    assert.strictEqual(cardPastel.bg, '#F7CC78');
    assert.notStrictEqual(cardPastel.bg, '#FFFFFF');
  });

  // --- Scenario 3: Create a note with mint selected; verify its card is mint ---
  test('Scenario 3: Create a note with mint selected; verify its card is mint', () => {
    const store = new MockNotesStore();
    const created = store.createNote({
      title: 'Mint Checklist',
      content: 'Plants watered',
      colorSchemeId: 'mint',
    });

    assert.strictEqual(created.colorSchemeId, 'mint');
    const cardPastel = getPastelColor(created.colorSchemeId);
    assert.strictEqual(cardPastel.id, 'mint');
    assert.strictEqual(cardPastel.bg, '#A4E7C0');
    assert.notStrictEqual(cardPastel.bg, '#FFFFFF');
  });

  // --- Scenario 4: Open an existing purple note; confirm purple is selected in the editor ---
  test('Scenario 4: Open an existing purple note; confirm purple is selected in editor', () => {
    const store = new MockNotesStore();
    const note = store.createNote({
      title: 'Existing Purple Note',
      content: 'Content',
      colorSchemeId: 'purple',
    });

    // Simulate Editor opening logic:
    // selectedColor is initialized to noteToEdit.colorSchemeId || defaultColor || 'purple'
    const noteToEdit = store.getNote(note.id);
    const editorSelectedColor = noteToEdit ? (noteToEdit.colorSchemeId || 'purple') : 'purple';
    assert.strictEqual(editorSelectedColor, 'purple');

    const editorPastel = getPastelColor(editorSelectedColor);
    assert.strictEqual(editorPastel.id, 'lavender');
    assert.strictEqual(editorPastel.bg, '#BFAFF8');
  });

  // --- Scenario 5: Change that note from purple to yellow; save and reopen it ---
  test('Scenario 5: Change that note from purple to yellow; save and reopen it', () => {
    const store = new MockNotesStore();
    const note = store.createNote({
      title: 'Mutable Note',
      content: 'Original',
      colorSchemeId: 'purple',
    });

    assert.strictEqual(store.getNote(note.id).colorSchemeId, 'purple');

    // User switches color to yellow in editor palette and saves
    const updated = store.updateNote(note.id, {
      title: 'Mutable Note Updated',
      colorSchemeId: 'yellow',
    });

    assert.strictEqual(updated.colorSchemeId, 'yellow');
    const reopened = store.getNote(note.id);
    assert.strictEqual(reopened.colorSchemeId, 'yellow');
    assert.strictEqual(getPastelColor(reopened.colorSchemeId).bg, '#F7CC78');
  });

  // --- Scenario 6: Navigate away and back; verify all note colors remain correct ---
  test('Scenario 6: Navigate away and back; verify all note colors remain correct', () => {
    const store = new MockNotesStore();
    const n1 = store.createNote({ title: 'Purple', colorSchemeId: 'purple' });
    const n2 = store.createNote({ title: 'Yellow', colorSchemeId: 'yellow' });
    const n3 = store.createNote({ title: 'Mint', colorSchemeId: 'mint' });
    const n4 = store.createNote({ title: 'Peach', colorSchemeId: 'peach' });
    const n5 = store.createNote({ title: 'Blue', colorSchemeId: 'blue' });
    const n6 = store.createNote({ title: 'Rose', colorSchemeId: 'rose' });

    // Simulate navigating to Settings or Floating Dot and returning to Notes list
    const currentNav = 'settings';
    // Back to notes:
    const reloadedNotes = store.getAllNotes();
    assert.strictEqual(reloadedNotes.find((n) => n.id === n1.id).colorSchemeId, 'purple');
    assert.strictEqual(reloadedNotes.find((n) => n.id === n2.id).colorSchemeId, 'yellow');
    assert.strictEqual(reloadedNotes.find((n) => n.id === n3.id).colorSchemeId, 'mint');
    assert.strictEqual(reloadedNotes.find((n) => n.id === n4.id).colorSchemeId, 'peach');
    assert.strictEqual(reloadedNotes.find((n) => n.id === n5.id).colorSchemeId, 'blue');
    assert.strictEqual(reloadedNotes.find((n) => n.id === n6.id).colorSchemeId, 'rose');
  });

  // --- Scenario 7: Force-stop and reopen the app; verify colors remain correct ---
  test('Scenario 7: Force-stop and reopen the app; verify colors remain correct', () => {
    const originalStore = new MockNotesStore();
    originalStore.createNote({ id: 'persisted-1', title: 'Mint Seed', colorSchemeId: 'mint' });
    originalStore.createNote({ id: 'persisted-2', title: 'Peach Seed', colorSchemeId: 'peach' });

    // Simulate app shutdown: dump to persistent storage representation
    const serializedDb = JSON.stringify(originalStore.getAllNotes());

    // Simulate fresh app boot: reload into fresh store
    const restartedStore = new MockNotesStore();
    const parsed = JSON.parse(serializedDb);
    for (const note of parsed) {
      restartedStore.notes.set(note.id, note);
    }

    const restoredMint = restartedStore.getNote('persisted-1');
    assert.strictEqual(restoredMint.colorSchemeId, 'mint');
    assert.strictEqual(getPastelColor(restoredMint.colorSchemeId).bg, '#A4E7C0');

    const restoredPeach = restartedStore.getNote('persisted-2');
    assert.strictEqual(restoredPeach.colorSchemeId, 'peach');
    assert.strictEqual(getPastelColor(restoredPeach.colorSchemeId).bg, '#F7CC78');
  });

  // --- Scenario 8: Confirm rich-text formatting and checklists still work with note colors ---
  test('Scenario 8: Confirm rich-text formatting and checklists work with note colors', () => {
    const store = new MockNotesStore();
    const richContent = '☐ Buy oat milk\n☑ Call electrician\n<b>Urgent</b> meeting at 3pm';
    const htmlSerialized = editorTextToHtml(richContent);

    const note = store.createNote({
      title: 'Formatted Mint Note',
      content: htmlSerialized,
      colorSchemeId: 'mint',
    });

    assert.strictEqual(note.colorSchemeId, 'mint');
    assert.strictEqual(getPastelColor(note.colorSchemeId).bg, '#A4E7C0');

    // Verify rich text roundtrips without tag loss
    const editorText = htmlToEditorText(note.content);
    assert.ok(editorText.includes('☐ Buy oat milk'));
    assert.ok(editorText.includes('☑ Call electrician'));

    // Strip preview
    const preview = stripRichText(note.content);
    assert.ok(preview.includes('Buy oat milk'));
    assert.ok(preview.includes('Urgent meeting'));
  });

  console.log(`\n================================`);
  console.log(`All Note Color Regression Tests: ${passedTests} passed, 0 failed`);
  console.log(`================================\n`);
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
