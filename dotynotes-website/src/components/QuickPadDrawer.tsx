import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertCircle } from 'lucide-react';
import { PASTEL_NOTE_COLORS, type PastelNoteColor } from '../constants/theme';

export interface QuickPadNote {
  id: string;
  title: string;
  body: string;
  colorId: string;
  isPinned: boolean;
  tag?: string;
  createdAt: string;
}

const DEFAULT_DEMO_NOTES: QuickPadNote[] = [
  {
    id: 'demo-pad-1',
    title: 'DotyNotes Android 1.0 Release',
    body: 'Launch APK verified and ready for direct sideloading. Native Floating Dot overlay enabled.',
    colorId: 'lavender',
    isPinned: true,
    tag: 'Priority',
    createdAt: 'Just now',
  },
  {
    id: 'demo-pad-2',
    title: 'Weekly Sprint Tasks',
    body: '☐ Finalize UI contrast on Pastel Mint\n☑ Configure Android overlay service\n☐ Test rich text shortcuts',
    colorId: 'mint',
    isPinned: true,
    tag: 'Sprint',
    createdAt: '15m ago',
  },
  {
    id: 'demo-pad-3',
    title: 'Meeting Takeaways',
    body: '• Zero telemetry trackers\n• Store notes in local SQLite WAL\n• Reminders ring without network',
    colorId: 'pink',
    isPinned: false,
    tag: 'Work',
    createdAt: '2h ago',
  },
  {
    id: 'demo-pad-4',
    title: 'Book Recommendations',
    body: 'Atomic Habits by James Clear. Focus on sustainable systems rather than distant goals.',
    colorId: 'yellow',
    isPinned: false,
    tag: 'Reading',
    createdAt: 'Yesterday',
  },
];

interface QuickPadDrawerProps {
  onNoteCreated?: (note: QuickPadNote) => void;
}

export const QuickPadDrawer: React.FC<QuickPadDrawerProps> = ({ onNoteCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'editor'>('list');

  // Notes state (synced with localStorage key dotynotes_web_demo_notes for sandbox integration)
  const [notes, setNotes] = useState<QuickPadNote[]>(() => {
    try {
      const saved = localStorage.getItem('dotynotes_web_demo_notes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((n: any) => ({
            id: n.id || `pad-${Date.now()}`,
            title: n.title || 'Untitled',
            body: n.body || (n.checklistItems ? n.checklistItems.map((i: any) => `${i.done ? '☑' : '☐'} ${i.text}`).join('\n') : ''),
            colorId: n.colorId || 'lavender',
            isPinned: !!n.isPinned,
            tag: n.tag || (n.isPinned ? 'Pinned' : 'Note'),
            createdAt: n.updatedAt || 'Recent',
          }));
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_DEMO_NOTES;
  });

  // Editor State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedColor, setSelectedColor] = useState<PastelNoteColor>(PASTEL_NOTE_COLORS[4]); // Lavender by default
  const [isPinned, setIsPinned] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('New Note');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Active Toolbar format states
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Listen for open events triggered from hero or buttons
  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener('open-quickpad', handleOpenEvent);
    return () => window.removeEventListener('open-quickpad', handleOpenEvent);
  }, []);

  // Sync notes to localStorage
  const persistNotes = (updatedNotes: QuickPadNote[]) => {
    setNotes(updatedNotes);
    try {
      localStorage.setItem('dotynotes_web_demo_notes', JSON.stringify(updatedNotes));
    } catch {
      // ignore
    }
  };

  const getColorObj = (colorId: string): PastelNoteColor => {
    const key = colorId?.toLowerCase().trim();
    return PASTEL_NOTE_COLORS.find((p) => p.id === key) || PASTEL_NOTE_COLORS[4];
  };

  // Open Editor for Creating a New Note
  const handleOpenNewNote = () => {
    setEditingNoteId(null);
    setTitle('');
    setBody('');
    setSelectedColor(PASTEL_NOTE_COLORS[4]); // Lavender default per Android spec
    setIsPinned(false);
    setStatusMessage('New Note');
    setValidationError(null);
    setIsBoldActive(false);
    setIsItalicActive(false);
    setIsUnderlineActive(false);
    setCurrentView('editor');
  };

  // Open Editor for an Existing Note
  const handleEditNote = (note: QuickPadNote) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setSelectedColor(getColorObj(note.colorId));
    setIsPinned(note.isPinned);
    setStatusMessage('Saved ✓');
    setValidationError(null);
    setIsBoldActive(false);
    setIsItalicActive(false);
    setIsUnderlineActive(false);
    setCurrentView('editor');
  };

  // Back to Notes List
  const handleBackToList = () => {
    setValidationError(null);
    setCurrentView('list');
    setEditingNoteId(null);
  };

  // Save or Update Note
  const handleSaveNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim() && !body.trim()) {
      setValidationError('Please enter a note title or content.');
      return;
    }

    setValidationError(null);

    if (editingNoteId) {
      // Update existing
      const updatedNotes = notes.map((n) =>
        n.id === editingNoteId
          ? {
              ...n,
              title: title.trim() || 'Untitled',
              body: body.trim(),
              colorId: selectedColor.id,
              isPinned,
              createdAt: 'Just now',
            }
          : n
      );
      persistNotes(updatedNotes);
    } else {
      // Create new
      const newNote: QuickPadNote = {
        id: `quick-${Date.now()}`,
        title: title.trim() || 'Quick Note',
        body: body.trim(),
        colorId: selectedColor.id,
        isPinned,
        tag: 'Quick',
        createdAt: 'Just now',
      };
      persistNotes([newNote, ...notes]);
      if (onNoteCreated) {
        onNoteCreated(newNote);
      }
    }

    setStatusMessage('Saved ✓');
    setTimeout(() => {
      setCurrentView('list');
      setEditingNoteId(null);
    }, 400);
  };

  // Delete Current Note
  const handleDeleteCurrentNote = () => {
    if (!editingNoteId) return;
    const remaining = notes.filter((n) => n.id !== editingNoteId);
    persistNotes(remaining);
    setCurrentView('list');
    setEditingNoteId(null);
  };

  // Toggle Checkbox in body when typing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursor = textarea.selectionStart;
      const textBefore = body.substring(0, cursor);
      const lastLineBreak = textBefore.lastIndexOf('\n');
      const currentLine = textBefore.substring(lastLineBreak + 1);

      if (currentLine.startsWith('☐ ') || currentLine.startsWith('☑ ')) {
        e.preventDefault();
        if (currentLine.trim() === '☐' || currentLine.trim() === '☑') {
          // Empty item: remove checklist prefix
          const newBody =
            body.substring(0, lastLineBreak + 1) +
            body.substring(cursor);
          setBody(newBody);
        } else {
          // Continue checklist item on new line
          const newBody =
            body.substring(0, cursor) + '\n☐ ' + body.substring(cursor);
          setBody(newBody);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = cursor + 3;
          }, 0);
        }
      } else if (currentLine.startsWith('• ')) {
        e.preventDefault();
        if (currentLine.trim() === '•') {
          // Empty bullet: remove bullet
          const newBody =
            body.substring(0, lastLineBreak + 1) +
            body.substring(cursor);
          setBody(newBody);
        } else {
          // Continue bullet on new line
          const newBody =
            body.substring(0, cursor) + '\n• ' + body.substring(cursor);
          setBody(newBody);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = cursor + 3;
          }, 0);
        }
      }
    }
  };

  // Toolbar formatting actions
  const applyToolbarFormat = (type: 'bold' | 'italic' | 'underline' | 'checklist' | 'bullet') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);

    if (type === 'bold') {
      setIsBoldActive(!isBoldActive);
      if (start !== end) {
        const replacement = `**${selectedText}**`;
        const updated = body.substring(0, start) + replacement + body.substring(end);
        setBody(updated);
      }
    } else if (type === 'italic') {
      setIsItalicActive(!isItalicActive);
      if (start !== end) {
        const replacement = `*${selectedText}*`;
        const updated = body.substring(0, start) + replacement + body.substring(end);
        setBody(updated);
      }
    } else if (type === 'underline') {
      setIsUnderlineActive(!isUnderlineActive);
      if (start !== end) {
        const replacement = `<u>${selectedText}</u>`;
        const updated = body.substring(0, start) + replacement + body.substring(end);
        setBody(updated);
      }
    } else if (type === 'checklist') {
      // Prepend ☐ to current line
      const textBefore = body.substring(0, start);
      const lastLineBreak = textBefore.lastIndexOf('\n');
      const lineStart = lastLineBreak + 1;
      const updated =
        body.substring(0, lineStart) + '☐ ' + body.substring(lineStart);
      setBody(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    } else if (type === 'bullet') {
      // Prepend • to current line
      const textBefore = body.substring(0, start);
      const lastLineBreak = textBefore.lastIndexOf('\n');
      const lineStart = lastLineBreak + 1;
      const updated =
        body.substring(0, lineStart) + '• ' + body.substring(lineStart);
      setBody(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };


  return (
    <>
      {/* Floating Dot Handle on the Screen Edge */}
      <aside aria-label="Floating Dot Companion simulation">
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
          <motion.button
            onClick={() => setIsOpen(true)}
            whileHover={{ scale: 1.08, x: -4 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex items-center justify-center pl-3.5 pr-2.5 py-3 rounded-l-full bg-[#182E3A] text-white shadow-xl hover:shadow-2xl border-y border-l border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-[#F99773]"
            aria-label="Open Floating Dot Quick Pad"
            title="Click to simulate Android Floating Dot Quick Pad"
          >
            {/* The signature orange Dot icon */}
            <span className="relative flex h-3.5 w-3.5 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6346] opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FF6346]" />
            </span>

            <span className="text-xs font-semibold tracking-wide text-slate-100 hidden sm:inline group-hover:text-[#F99773] transition-colors">
              Quick Pad
            </span>

            {/* Micro Badge */}
            <span className="absolute -top-2.5 -left-2 px-1.5 py-0.5 rounded-full bg-[#F99773] text-[9px] font-bold text-[#182E3A] uppercase tracking-wider shadow">
              Overlay
            </span>
          </motion.button>
        </div>
      </aside>

      {/* Centered Floating Android Popup Simulation */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Dimmed & Blurred Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs transition-opacity"
            />

            {/* Popup Container: 94-96% on mobile, max 420px on desktop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-[420px] rounded-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden z-10 my-auto border border-black/10"
              style={{
                backgroundColor: currentView === 'list' ? '#FFFFFF' : selectedColor.bg,
                borderColor: currentView === 'list' ? 'rgba(0,0,0,0.08)' : selectedColor.border,
                color: currentView === 'list' ? '#182E3A' : selectedColor.text,
              }}
              role="dialog"
              aria-modal="true"
              aria-label="DotyNotes Quick Pad"
            >
              {/* Simulation Header Banner */}
              <div className="px-4 py-1.5 bg-[#182E3A] text-slate-300 text-[10px] flex items-center justify-between tracking-tight">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#FF6346] animate-pulse" />
                  Android Overlay Simulation (SYSTEM_ALERT_WINDOW)
                </span>
                <span className="text-slate-400 font-mono text-[9px]">com.dotynotes.app</span>
              </div>

              {/* ======================================================== */}
              {/* VIEW 1: RECENT NOTES LIST VIEW (Matches Android Screenshot B) */}
              {/* ======================================================== */}
              {currentView === 'list' && (
                <div className="p-5 sm:p-6 flex flex-col">
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between pb-3">
                    <h3 className="font-extrabold text-lg sm:text-xl text-[#EB409B] font-['Plus_Jakarta_Sans'] tracking-tight">
                      DotyNotes Quick Pad
                    </h3>

                    {/* Circular Close Button */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#EB409B]"
                      aria-label="Close Quick Pad"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Prominent Full-Width Bright Pink "+ New Sticky Note" Button */}
                  <button
                    onClick={handleOpenNewNote}
                    className="w-full mt-1 mb-4 py-3.5 px-4 rounded-2xl bg-[#EB409B] hover:bg-[#d8328c] active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#EB409B] focus:ring-offset-2"
                  >
                    <span className="text-base">➕</span>
                    <span>New Sticky Note</span>
                  </button>

                  {/* "RECENT NOTES" Section Label */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2.5 px-0.5">
                    <span>Recent Notes</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">tap card to edit</span>
                  </div>

                  {/* Scrollable Note Cards List */}
                  <div className="max-h-[300px] sm:max-h-[340px] overflow-y-auto space-y-2.5 pr-1">
                    {notes.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-xs">
                        <span className="text-2xl block mb-2">📝</span>
                        <p className="font-bold text-slate-700 text-sm">No saved notes yet</p>
                        <p className="text-slate-400 mt-1">Tap + New Sticky Note to write your thoughts.</p>
                      </div>
                    ) : (
                      notes.map((note) => {
                        const noteColor = getColorObj(note.colorId);

                        return (
                          <div
                            key={note.id}
                            onClick={() => handleEditNote(note)}
                            className="p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-left"
                            style={{
                              backgroundColor: noteColor.bg,
                              borderColor: noteColor.border,
                              color: noteColor.text,
                            }}
                          >
                            {/* Card Top Row: Title + Pin/Tag */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className="font-bold text-sm truncate flex items-center gap-1">
                                {note.isPinned && <span className="text-xs">📌</span>}
                                <span>{note.title}</span>
                              </h4>

                              {note.tag && (
                                <span
                                  className="text-[9px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                                  style={{
                                    backgroundColor: noteColor.tagBg,
                                    color: noteColor.text,
                                  }}
                                >
                                  {note.tag}
                                </span>
                              )}
                            </div>

                            {/* Card Content Snippet */}
                            {note.body && (
                              <p className="text-[11px] leading-relaxed opacity-85 line-clamp-2 whitespace-pre-line font-normal">
                                {note.body}
                              </p>
                            )}

                            <div className="mt-2 pt-1 border-t border-black/5 flex items-center justify-between text-[9px] opacity-65">
                              <span>{note.createdAt}</span>
                              <span className="font-semibold uppercase tracking-wider">{noteColor.name}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW 2: NEW NOTE / EDIT NOTE VIEW (Matches Android Screenshot A) */}
              {/* ======================================================== */}
              {currentView === 'editor' && (
                <div
                  className="p-5 sm:p-6 flex flex-col min-h-[460px] transition-colors duration-200"
                  style={{
                    backgroundColor: selectedColor.bg,
                    color: selectedColor.text,
                  }}
                >
                  {/* Editor Header Row */}
                  <div className="flex items-center justify-between gap-2 pb-2">
                    {/* Back-to-Notes Button */}
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/30 hover:bg-white/50 border border-black/10 text-xs font-bold transition-all active:scale-95"
                      style={{ color: selectedColor.text }}
                    >
                      <span>← Notes</span>
                    </button>

                    {/* Centered Status / Title */}
                    <div
                      className="text-xs font-bold uppercase tracking-wider opacity-80"
                      style={{ color: selectedColor.text }}
                    >
                      {statusMessage}
                    </div>

                    {/* Right Action Icons: Pin & Done */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsPinned(!isPinned)}
                        className={`w-8 h-8 rounded-full border border-black/10 flex items-center justify-center transition-all ${
                          isPinned
                            ? 'bg-white/60 shadow-xs ring-1 ring-black/20'
                            : 'bg-white/30 hover:bg-white/50 opacity-70 hover:opacity-100'
                        }`}
                        title={isPinned ? 'Unpin note' : 'Pin note to top'}
                        aria-label="Toggle pin"
                      >
                        <span className="text-xs">📌</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveNote()}
                        className="w-8 h-8 rounded-full bg-white/30 hover:bg-white/50 border border-black/10 flex items-center justify-center font-bold text-sm transition-all active:scale-95"
                        title="Done / Save"
                        aria-label="Save and return"
                        style={{ color: selectedColor.text }}
                      >
                        ✓
                      </button>
                    </div>
                  </div>

                  {/* Title Input */}
                  <div className="mt-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setStatusMessage('Editing...');
                      }}
                      placeholder="Title..."
                      className="w-full bg-transparent font-bold text-xl sm:text-2xl placeholder:opacity-50 focus:outline-none"
                      style={{ color: selectedColor.text }}
                    />
                  </div>

                  {/* Thin Divider Underneath Title */}
                  <div className="h-[1px] bg-black/15 my-2.5 w-full" />

                  {/* Formatting Toolbar directly beneath title divider */}
                  <div className="flex items-center gap-1.5 pb-2.5 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => applyToolbarFormat('bold')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border transition-all active:scale-95 ${
                        isBoldActive
                          ? 'bg-white/70 border-black/30 shadow-xs font-extrabold'
                          : 'bg-white/30 hover:bg-white/50 border-black/10'
                      }`}
                      style={{ color: selectedColor.text }}
                      title="Bold"
                      aria-label="Bold"
                    >
                      B
                    </button>

                    <button
                      type="button"
                      onClick={() => applyToolbarFormat('italic')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center italic font-bold text-sm border transition-all active:scale-95 ${
                        isItalicActive
                          ? 'bg-white/70 border-black/30 shadow-xs'
                          : 'bg-white/30 hover:bg-white/50 border-black/10'
                      }`}
                      style={{ color: selectedColor.text }}
                      title="Italic"
                      aria-label="Italic"
                    >
                      I
                    </button>

                    <button
                      type="button"
                      onClick={() => applyToolbarFormat('underline')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center underline font-bold text-sm border transition-all active:scale-95 ${
                        isUnderlineActive
                          ? 'bg-white/70 border-black/30 shadow-xs'
                          : 'bg-white/30 hover:bg-white/50 border-black/10'
                      }`}
                      style={{ color: selectedColor.text }}
                      title="Underline"
                      aria-label="Underline"
                    >
                      U
                    </button>

                    <button
                      type="button"
                      onClick={() => applyToolbarFormat('checklist')}
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border bg-white/30 hover:bg-white/50 border-black/10 transition-all active:scale-95"
                      style={{ color: selectedColor.text }}
                      title="Insert Checklist"
                      aria-label="Checklist"
                    >
                      ☑
                    </button>

                    <button
                      type="button"
                      onClick={() => applyToolbarFormat('bullet')}
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border bg-white/30 hover:bg-white/50 border-black/10 transition-all active:scale-95"
                      style={{ color: selectedColor.text }}
                      title="Insert Bullet List"
                      aria-label="Bullet list"
                    >
                      •
                    </button>
                  </div>

                  {/* Large Editable Writing Surface */}
                  <div className="flex-1 flex flex-col min-h-[140px] sm:min-h-[180px]">
                    <textarea
                      ref={textareaRef}
                      value={body}
                      onChange={(e) => {
                        setBody(e.target.value);
                        setStatusMessage('Editing...');
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Write your thoughts here..."
                      rows={6}
                      className="w-full flex-1 bg-transparent resize-none text-sm sm:text-base leading-relaxed placeholder:opacity-50 focus:outline-none"
                      style={{ color: selectedColor.text }}
                    />
                  </div>

                  {/* Validation Alert */}
                  {validationError && (
                    <div className="my-2 p-2 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-1.5 border border-red-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {/* Sticky Color Palette Row (Exact 7 Shades in Original Android Order) */}
                  <div className="pt-3 pb-3">
                    <span
                      className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-80"
                      style={{ color: selectedColor.text }}
                    >
                      Sticky Color
                    </span>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      {PASTEL_NOTE_COLORS.map((col) => {
                        const isSelected = selectedColor.id === col.id;

                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => {
                              setSelectedColor(col);
                              setStatusMessage('Editing...');
                            }}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border relative flex items-center justify-center transition-all ${
                              isSelected
                                ? 'scale-115 ring-2 ring-current ring-offset-2 shadow-sm'
                                : 'hover:scale-105 opacity-85 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: col.bg,
                              borderColor: col.border,
                            }}
                            title={col.name}
                            aria-label={`Select ${col.name}`}
                          >
                            {isSelected && (
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: col.text }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Action Row: Delete (if editing) + Full-Width Bright Pink Save Button */}
                  <div className="pt-2 flex items-center gap-2">
                    {editingNoteId && (
                      <button
                        type="button"
                        onClick={handleDeleteCurrentNote}
                        className="px-3.5 py-3.5 rounded-2xl bg-white/40 hover:bg-red-100 border border-black/10 text-red-700 text-xs font-bold transition-all active:scale-95 flex items-center gap-1 flex-shrink-0"
                        title="Delete this note"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSaveNote()}
                      className="flex-1 py-3.5 px-4 rounded-2xl bg-[#EB409B] hover:bg-[#d8328c] active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#EB409B] focus:ring-offset-2"
                    >
                      <span>{editingNoteId ? 'Update Note ✏️' : 'Save Note 💾'}</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
