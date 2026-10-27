import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pin, Trash2, Edit3, Check, RotateCcw, CheckSquare, List, Sparkles, AlertCircle } from 'lucide-react';
import { PASTEL_NOTE_COLORS, type PastelNoteColor } from '../constants/theme';
import confetti from 'canvas-confetti';

export interface DemoNote {
  id: string;
  title: string;
  body: string;
  colorId: string;
  isPinned: boolean;
  type?: 'text' | 'checklist';
  checklistItems?: { id: number; text: string; done: boolean }[];
  updatedAt: string;
}

const INITIAL_DEMO_NOTES: DemoNote[] = [
  {
    id: 'demo-1',
    title: 'Offline Philosophy',
    body: 'Your notes belong to you. DotyNotes stores everything locally in SQLite with WAL mode. No signups, no trackers, no sync outages.',
    colorId: 'lavender',
    isPinned: true,
    updatedAt: 'Just now',
  },
  {
    id: 'demo-2',
    title: 'Weekend Project Sprint',
    body: '',
    colorId: 'mint',
    isPinned: true,
    type: 'checklist',
    checklistItems: [
      { id: 101, text: 'Finalize UI contrast on Pastel Mint', done: true },
      { id: 102, text: 'Configure Android overlay service', done: true },
      { id: 103, text: 'Test rich text bold / italic shortcuts', done: false },
      { id: 104, text: 'Verify APK sideloading steps', done: false },
    ],
    updatedAt: '10m ago',
  },
  {
    id: 'demo-3',
    title: 'Book Recommendations',
    body: '• The Design of Everyday Things — Don Norman\n• Refactoring UI — Adam Wathan\n• Designing Data-Intensive Applications',
    colorId: 'yellow',
    isPinned: false,
    updatedAt: '1h ago',
  },
  {
    id: 'demo-4',
    title: 'Floating Dot Shortcut',
    body: 'Swipe or tap the side handle from any Android screen to jot down a quick thought without interrupting your current workflow.',
    colorId: 'pink',
    isPinned: false,
    updatedAt: '2h ago',
  },
  {
    id: 'demo-5',
    title: 'Color Palette Guide',
    body: 'Carefully chosen HSL pastel tones tuned for readability and high contrast with dark slate ink.',
    colorId: 'blue',
    isPinned: false,
    updatedAt: 'Yesterday',
  },
];

interface PlaygroundSectionProps {
  externalNote?: DemoNote | null;
}

export const PlaygroundSection: React.FC<PlaygroundSectionProps> = ({ externalNote }) => {
  const [notes, setNotes] = useState<DemoNote[]>(() => {
    try {
      const saved = localStorage.getItem('dotynotes_web_demo_notes');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_DEMO_NOTES;
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'checklists'>('all');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // New Note Modal / Inline Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newColor, setNewColor] = useState<PastelNoteColor>(PASTEL_NOTE_COLORS[4]); // Lavender
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [newType, setNewType] = useState<'text' | 'checklist'>('text');
  const [newChecklistText, setNewChecklistText] = useState('Item 1\nItem 2\nItem 3');

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dotynotes_web_demo_notes', JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  // Handle external note injected from Quick Pad (adjusted during render per React guidelines)
  const [prevExternalNote, setPrevExternalNote] = useState<DemoNote | null>(null);
  if (externalNote && externalNote !== prevExternalNote) {
    setPrevExternalNote(externalNote);
    setNotes((prev) => [externalNote, ...prev]);
  }

  const getColorObj = (colorId: string) => {
    return PASTEL_NOTE_COLORS.find((c) => c.id === colorId) || PASTEL_NOTE_COLORS[4];
  };

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingNoteId === id) setEditingNoteId(null);
  };

  const handleToggleChecklistItem = (noteId: string, itemId: number) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId || !note.checklistItems) return note;
        const updated = note.checklistItems.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        );
        // Check if all done
        const allDone = updated.every((i) => i.done);
        if (allDone) {
          try {
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.7 },
            });
          } catch {
            // ignore
          }
        }
        return { ...note, checklistItems: updated };
      })
    );
  };

  const handleResetToDefault = () => {
    setNotes(INITIAL_DEMO_NOTES);
    localStorage.removeItem('dotynotes_web_demo_notes');
    setEditingNoteId(null);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newBody.trim() && !newChecklistText.trim()) return;

    let checklistItems = undefined;
    if (newType === 'checklist') {
      checklistItems = newChecklistText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text, idx) => ({ id: Date.now() + idx, text, done: false }));
    }

    const created: DemoNote = {
      id: `note-${Date.now()}`,
      title: newTitle.trim() || (newType === 'checklist' ? 'Checklist' : 'Sticky Note'),
      body: newType === 'checklist' ? '' : newBody.trim(),
      colorId: newColor.id,
      isPinned: newIsPinned,
      type: newType,
      checklistItems,
      updatedAt: 'Just now',
    };

    setNotes([created, ...notes]);
    setIsCreating(false);
    setNewTitle('');
    setNewBody('');
    setNewChecklistText('Item 1\nItem 2');
    setNewIsPinned(false);
  };

  const filteredNotes = notes.filter((n) => {
    if (activeFilter === 'pinned') return n.isPinned;
    if (activeFilter === 'checklists') return n.type === 'checklist';
    return true;
  });

  // Sort pinned first
  const sortedNotes = [...filteredNotes].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  return (
    <section id="playground" className="py-20 sm:py-28 bg-[#F4F3EE]/80 border-y border-slate-200/70 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-[#182E3A] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#F99773]" />
            <span>Interactive Browser Sandbox</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#182E3A] font-['Plus_Jakarta_Sans'] tracking-tight">
            Try the Sticky Notes Experience
          </h2>

          <p className="text-base sm:text-lg text-slate-600">
            Create, color-code, pin, and edit notes in real time. This interactive demonstration runs purely in your browser without touching the Android app's local SQLite database.
          </p>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Independent browser sandbox state. Persisted in localStorage for convenience.</span>
          </div>
        </div>

        {/* Toolbar & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0" role="tablist">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'all'
                  ? 'bg-[#182E3A] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Notes ({notes.length})
            </button>
            <button
              onClick={() => setActiveFilter('pinned')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                activeFilter === 'pinned'
                  ? 'bg-[#182E3A] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Pin className="w-3 h-3" />
              Pinned ({notes.filter((n) => n.isPinned).length})
            </button>
            <button
              onClick={() => setActiveFilter('checklists')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                activeFilter === 'checklists'
                  ? 'bg-[#182E3A] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              Checklists ({notes.filter((n) => n.type === 'checklist').length})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Reset sandbox to initial sample notes"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Notes</span>
            </button>

            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#182E3A] text-white text-xs sm:text-sm font-semibold hover:bg-[#234253] transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#F99773]" />
              <span>New Note</span>
            </button>
          </div>
        </div>

        {/* Creation Modal / Popover */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#182E3A] flex items-center gap-2">
                  <span>Create Demo Note</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({newType === 'checklist' ? 'Interactive Checklist' : 'Text Note'})
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType(newType === 'text' ? 'checklist' : 'text')}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1"
                  >
                    {newType === 'text' ? <CheckSquare className="w-3 h-3" /> : <List className="w-3 h-3" />}
                    <span>Switch to {newType === 'text' ? 'Checklist' : 'Text'}</span>
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="text-xs font-medium text-slate-400 hover:text-slate-700 px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateNote} className="space-y-4">
                <div
                  className="rounded-xl p-4 border transition-colors"
                  style={{
                    backgroundColor: newColor.bg,
                    borderColor: newColor.border,
                    color: newColor.text,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Note Title..."
                      className="w-full bg-transparent font-bold text-base sm:text-lg placeholder:opacity-60 focus:outline-none"
                      style={{ color: newColor.text }}
                    />
                    <button
                      type="button"
                      onClick={() => setNewIsPinned(!newIsPinned)}
                      className={`p-1.5 rounded-lg transition-all ${
                        newIsPinned ? 'bg-white/40 shadow-xs' : 'opacity-60 hover:opacity-100'
                      }`}
                      title={newIsPinned ? 'Unpin' : 'Pin to top'}
                    >
                      <Pin className={`w-4 h-4 ${newIsPinned ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {newType === 'text' ? (
                    <textarea
                      value={newBody}
                      onChange={(e) => setNewBody(e.target.value)}
                      placeholder="Write your note content here..."
                      rows={3}
                      className="w-full bg-transparent resize-none text-sm placeholder:opacity-60 focus:outline-none"
                      style={{ color: newColor.text }}
                    />
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold opacity-75 mb-1">
                        Enter checklist items (one per line):
                      </label>
                      <textarea
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        rows={4}
                        className="w-full bg-white/40 rounded-lg p-2.5 text-xs sm:text-sm font-mono placeholder:opacity-60 focus:outline-none border border-black/10"
                        style={{ color: newColor.text }}
                      />
                    </div>
                  )}
                </div>

                {/* Color Selector & Submit */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Pastel Color:</span>
                    <div className="flex items-center gap-1.5">
                      {PASTEL_NOTE_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setNewColor(c)}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            newColor.id === c.id ? 'scale-125 ring-2 ring-slate-800 ring-offset-1' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: c.bg, borderColor: c.border }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#182E3A] text-white text-xs sm:text-sm font-semibold hover:bg-[#234253] transition-all shadow-xs"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes Grid */}
        {sortedNotes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-base font-semibold text-slate-700 mb-2">No notes match your filter</p>
            <p className="text-sm text-slate-500 mb-4">Add a new note or reset to the original sample notes.</p>
            <button
              onClick={handleResetToDefault}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              Reset to Sample Notes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {sortedNotes.map((note) => {
                const color = getColorObj(note.colorId);
                const isEditing = editingNoteId === note.id;

                return (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="relative rounded-2xl p-5 shadow-sm hover:shadow-md border flex flex-col justify-between transition-all group"
                    style={{
                      backgroundColor: color.bg,
                      borderColor: color.border,
                      color: color.text,
                    }}
                  >
                    {/* Note Header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                          {color.name}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePin(note.id)}
                            className={`p-1 rounded-md transition-all ${
                              note.isPinned ? 'bg-white/50 opacity-100' : 'opacity-40 hover:opacity-100'
                            }`}
                            title={note.isPinned ? 'Pinned note' : 'Pin note'}
                            aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => setEditingNoteId(isEditing ? null : note.id)}
                            className="p-1 rounded-md opacity-40 hover:opacity-100 transition-opacity"
                            title="Edit note text"
                            aria-label="Edit note text"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1 rounded-md opacity-40 hover:opacity-100 hover:text-red-700 transition-opacity"
                            title="Delete note"
                            aria-label="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      {isEditing ? (
                        <input
                          type="text"
                          value={note.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNotes((prev) =>
                              prev.map((n) => (n.id === note.id ? { ...n, title: val } : n))
                            );
                          }}
                          className="w-full bg-white/40 rounded px-2 py-1 font-bold text-base mb-2 focus:outline-none"
                          style={{ color: color.text }}
                        />
                      ) : (
                        <h3 className="text-base font-bold mb-2 tracking-tight">{note.title}</h3>
                      )}

                      {/* Content: Checklist vs Regular Text */}
                      {note.type === 'checklist' && note.checklistItems ? (
                        <div className="space-y-1.5 my-2">
                          {note.checklistItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleToggleChecklistItem(note.id, item.id)}
                              className="w-full flex items-center gap-2 text-xs text-left group/item py-0.5"
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  item.done
                                    ? 'bg-white/70 border-current'
                                    : 'border-current/40 bg-transparent group-hover/item:border-current'
                                }`}
                              >
                                {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className={item.done ? 'line-through opacity-55' : 'font-medium'}>
                                {item.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : isEditing ? (
                        <textarea
                          value={note.body}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNotes((prev) =>
                              prev.map((n) => (n.id === note.id ? { ...n, body: val } : n))
                            );
                          }}
                          rows={4}
                          className="w-full bg-white/40 rounded p-2 text-xs font-normal leading-relaxed focus:outline-none resize-none"
                          style={{ color: color.text }}
                        />
                      ) : (
                        <p className="text-xs leading-relaxed whitespace-pre-line opacity-90">
                          {note.body}
                        </p>
                      )}
                    </div>

                    {/* Footer / Color Palette Switcher */}
                    <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
                      <span className="text-[10px] opacity-70">{note.updatedAt}</span>

                      {/* Mini color switcher for this note */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        {PASTEL_NOTE_COLORS.map((c) => (
                          <button
                            key={c.id}
                            onClick={() =>
                              setNotes((prev) =>
                                prev.map((n) => (n.id === note.id ? { ...n, colorId: c.id } : n))
                              )
                            }
                            className={`w-3.5 h-3.5 rounded-full border ${
                              note.colorId === c.id ? 'ring-1 ring-black' : ''
                            }`}
                            style={{ backgroundColor: c.bg, borderColor: c.border }}
                            title={`Switch color to ${c.name}`}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>
    </section>
  );
};
