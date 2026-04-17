import { useState, useRef } from 'react';
import { addQuestion, updateQuestion, deleteQuestion, reorderQuestions } from '../../firebase/db';

const BLANK = {
  text:          '',
  options:       ['', '', '', ''],
  correctAnswer: 0,
  timer:         15,
};

function QuestionForm({ initial = BLANK, onSave, onCancel, saving }) {
  const [q, setQ] = useState({ ...BLANK, ...initial });
  const optionRefs = useRef([]);

  const setOption = (i, val) => {
    const opts = [...q.options];
    opts[i] = val;
    setQ({ ...q, options: opts });
  };

  const valid =
    q.text.trim() &&
    q.options.every((o) => o.trim()) &&
    q.timer >= 5 &&
    q.timer <= 120;

  // Enter on the question textarea (no Shift) → jump to option A.
  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    }
  };

  // Enter on option N → N<3 jump to N+1; N===3 save (if valid).
  const handleOptionKeyDown = (i) => (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (i < q.options.length - 1) {
      optionRefs.current[i + 1]?.focus();
    } else if (valid && !saving) {
      onSave(q);
    }
  };

  return (
    <div className="glass-strong rounded-2xl p-5 space-y-4">
      <div>
        <label className="label">Question Text</label>
        <textarea
          value={q.text}
          onChange={(e) => setQ({ ...q, text: e.target.value })}
          onKeyDown={handleTextKeyDown}
          rows={2}
          placeholder="What is the capital of France? (Enter → next field, Shift+Enter → new line)"
          className="input resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt, i) => (
          <div key={i}>
            <label className="label">
              Option {String.fromCharCode(65 + i)}
              {i === q.correctAnswer && (
                <span className="ml-2 text-green-400 text-xs font-bold">✓ Correct</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                ref={(el) => (optionRefs.current[i] = el)}
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                onKeyDown={handleOptionKeyDown(i)}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => setQ({ ...q, correctAnswer: i })}
                title="Mark as correct"
                className={`px-3 rounded-xl border transition-all font-bold text-sm
                  ${i === q.correctAnswer
                    ? 'bg-green-500/30 border-green-500 text-green-300'
                    : 'bg-white/5 border-white/20 text-white/40 hover:border-green-500/50'
                  }`}
              >
                ✓
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-4">
        <div>
          <label className="label">Timer (seconds)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={120}
              value={q.timer}
              onChange={(e) => setQ({ ...q, timer: Number(e.target.value) })}
              className="input w-24"
            />
            <span className="text-white/30 text-xs">5–120s</span>
          </div>
        </div>

        <div className="flex gap-1 pb-0.5">
          {[10, 15, 20, 30].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setQ({ ...q, timer: t })}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all
                ${q.timer === t
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/10 text-white/50 hover:bg-white/20'
                }`}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(q)}
          disabled={!valid || saving}
          className="btn-primary"
        >
          {saving ? 'Saving…' : 'Save Question'}
        </button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

export default function QuestionEditor({ questions }) {
  const [editing,    setEditing]    = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [dragOver,   setDragOver]   = useState(null);
  const dragIdx = useRef(null);

  const handleSave = async (q) => {
    setSaving(true);
    try {
      if (editing === 'new') await addQuestion(q);
      else                   await updateQuestion(editing, q);
      setEditing(null);
    } catch (err) {
      console.error('Save question failed:', err);
      alert(`Couldn't save question: ${err.message ?? err}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    // Two-step inline confirm — first click arms, second click fires.
    // Replaced window.confirm() because some browsers silently suppress
    // it (no callback, no console), which made "nothing happens on click"
    // indistinguishable from a real bug.
    if (confirmDel !== id) {
      setConfirmDel(id);
      setTimeout(() => setConfirmDel((cur) => (cur === id ? null : cur)), 4000);
      return;
    }
    setConfirmDel(null);
    setDeleting(id);
    try {
      await deleteQuestion(id);
    } catch (err) {
      console.error('Delete question failed:', err);
      alert(`Couldn't delete question: ${err.code || err.message || err}`);
    } finally {
      setDeleting(null);
    }
  };

  const onDragStart = (idx) => { dragIdx.current = idx; };
  const onDragOver  = (e, idx) => { e.preventDefault(); setDragOver(idx); };
  const onDragEnd   = () => { dragIdx.current = null; setDragOver(null); };

  const onDrop = async (e, dropIdx) => {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === dropIdx) { setDragOver(null); return; }
    const reordered = [...questions];
    const [moved]   = reordered.splice(from, 1);
    reordered.splice(dropIdx, 0, moved);
    setDragOver(null);
    await reorderQuestions(reordered.map((q) => q.id));
  };

  return (
    <div className="space-y-4">
      {editing !== 'new' && (
        <button
          onClick={() => setEditing('new')}
          className="w-full py-3 rounded-xl border-2 border-dashed border-brand-600/50
                     text-brand-400 font-semibold hover:border-brand-400 hover:text-brand-300
                     transition-all flex items-center justify-center gap-2"
        >
          + Add Question
        </button>
      )}

      {editing === 'new' && (
        <QuestionForm
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {questions.length === 0 && (
        <p className="text-center text-white/30 py-8">No questions yet. Add one above.</p>
      )}

      {questions.length > 1 && (
        <p className="text-white/20 text-xs text-center">Drag ⠿ to reorder</p>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            draggable={editing !== q.id}
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            className={`glass rounded-2xl p-4 transition-colors
              ${dragOver === idx ? 'ring-2 ring-brand-400/60 bg-white/5' : ''}`}
          >
            {editing === q.id ? (
              <QuestionForm
                initial={q}
                onSave={handleSave}
                onCancel={() => setEditing(null)}
                saving={saving}
              />
            ) : (
              <div className="flex items-start gap-3">
                {/* Drag handle */}
                <span className="text-white/20 cursor-grab active:cursor-grabbing text-lg select-none shrink-0 mt-1">
                  ⠿
                </span>

                <span className="glass rounded-lg w-8 h-8 flex items-center justify-center
                                 text-sm font-black text-brand-300 shrink-0 mt-0.5">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{q.text}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options.map((opt, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded-lg font-medium
                          ${i === q.correctAnswer
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : 'bg-white/10 text-white/50'
                          }`}
                      >
                        {String.fromCharCode(65 + i)}: {opt}
                      </span>
                    ))}
                  </div>
                  <p className="text-white/30 text-xs mt-1.5">⏱ {q.timer ?? 15}s · max 30 pts</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setEditing(q.id)}
                    className="btn-ghost text-xs py-1 px-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={deleting === q.id}
                    className={`text-xs transition-colors py-1 px-3 rounded-xl border
                      ${confirmDel === q.id
                        ? 'bg-red-500/25 border-red-400 text-red-200 font-bold'
                        : 'glass border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-400/40'
                      }`}
                  >
                    {deleting === q.id ? '…' : confirmDel === q.id ? 'Confirm?' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
