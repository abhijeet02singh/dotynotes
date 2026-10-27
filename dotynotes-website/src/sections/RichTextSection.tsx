import React, { useState } from 'react';
import { Bold, Italic, Underline, List, CheckSquare, Sparkles, Database, Check } from 'lucide-react';
import { PASTEL_NOTE_COLORS, type PastelNoteColor } from '../constants/theme';

export const RichTextSection: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<PastelNoteColor>(PASTEL_NOTE_COLORS[3]); // Yellow
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [editorMode, setEditorMode] = useState<'text' | 'checklist'>('text');

  // Text state
  const [noteTitle, setNoteTitle] = useState('Architectural Principles');
  const [noteBody, setNoteBody] = useState(
    'Keep your thoughts structured without losing spontaneity.\n\nFormatting features:\n• Emphasize key terms with bold and italic\n• Underline important deadlines\n• Group complex items with neat bullets'
  );

  // Checklist state
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Ensure zero battery drain in idle mode', done: true },
    { id: 2, text: 'Check SQLite write-ahead logging (WAL)', done: true },
    { id: 3, text: 'Tune pastel contrast against dark slate ink', done: false },
    { id: 4, text: 'Verify exact alarm broadcast receiver', done: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const wordCount = noteBody.trim() ? noteBody.trim().split(/\s+/).length : 0;
  const charCount = noteBody.length;

  return (
    <section className="py-20 sm:py-28 bg-[#FAF9F6] border-b border-slate-200/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>Interactive Editor Preview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#182E3A] font-['Plus_Jakarta_Sans'] tracking-tight">
            Expressive Formatting on Sticky Notes
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Take notes the way your brain thinks. Format your text with bold, italic, underline, structured bullets, or interactive checklists.
          </p>
        </div>

        {/* Editor Box */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden max-w-3xl mx-auto">
          
          {/* Editor Toolbar */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {/* Formatting Tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsBold(!isBold)}
                className={`p-2 rounded-lg text-xs font-bold transition-colors ${
                  isBold ? 'bg-[#182E3A] text-white' : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="Toggle Bold"
                aria-label="Toggle Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsItalic(!isItalic)}
                className={`p-2 rounded-lg text-xs font-bold transition-colors ${
                  isItalic ? 'bg-[#182E3A] text-white' : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="Toggle Italic"
                aria-label="Toggle Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsUnderline(!isUnderline)}
                className={`p-2 rounded-lg text-xs font-bold transition-colors ${
                  isUnderline ? 'bg-[#182E3A] text-white' : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="Toggle Underline"
                aria-label="Toggle Underline"
              >
                <Underline className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-slate-300 mx-1.5" />

              {/* Mode toggles */}
              <button
                type="button"
                onClick={() => setEditorMode('text')}
                className={`p-2 rounded-lg text-xs font-bold transition-colors ${
                  editorMode === 'text' ? 'bg-[#182E3A] text-white' : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="Paragraph & Bullets"
                aria-label="Paragraph & Bullets mode"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('checklist')}
                className={`p-2 rounded-lg text-xs font-bold transition-colors ${
                  editorMode === 'checklist' ? 'bg-[#182E3A] text-white' : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="Checklist mode"
                aria-label="Checklist mode"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
            </div>

            {/* Pastel Color Swatches */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium mr-1 hidden sm:inline">Color:</span>
              {PASTEL_NOTE_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    selectedColor.id === c.id ? 'scale-125 ring-2 ring-slate-800 ring-offset-1' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.bg, borderColor: c.border }}
                  title={c.name}
                  aria-label={`Select ${c.name}`}
                />
              ))}
            </div>
          </div>

          {/* Note Canvas */}
          <div
            className="p-6 sm:p-8 transition-colors duration-200 min-h-[300px]"
            style={{
              backgroundColor: selectedColor.bg,
              color: selectedColor.text,
            }}
          >
            {/* Note Title */}
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full bg-transparent font-bold text-xl sm:text-2xl mb-4 focus:outline-none placeholder:opacity-60"
              style={{ color: selectedColor.text }}
              placeholder="Note title..."
            />

            {/* Note Body */}
            {editorMode === 'text' ? (
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={7}
                className={`w-full bg-transparent resize-none text-sm sm:text-base leading-relaxed focus:outline-none placeholder:opacity-60 ${
                  isBold ? 'font-bold' : 'font-normal'
                } ${isItalic ? 'italic' : 'not-italic'} ${isUnderline ? 'underline' : 'no-underline'}`}
                style={{ color: selectedColor.text }}
                placeholder="Type your formatted notes here..."
              />
            ) : (
              <div className="space-y-3 py-1">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="w-full flex items-center gap-3 text-sm sm:text-base text-left group"
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        task.done ? 'bg-white/80 border-current' : 'border-current/40 bg-transparent'
                      }`}
                    >
                      {task.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`${task.done ? 'line-through opacity-50' : 'font-medium'} ${
                        isBold ? 'font-bold' : ''
                      } ${isItalic ? 'italic' : ''}`}
                    >
                      {task.text}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Editor Status Bar */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-emerald-800">
                Simulated SQLite WAL Mode • Auto-saved
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{charCount} characters</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
