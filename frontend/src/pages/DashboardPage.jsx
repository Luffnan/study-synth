import { useState, useEffect, useRef } from 'react';
import { FileText, Image, Trash2, ChevronRight, BookOpen, Hash, Clock, AlertCircle, Zap, Pencil, Check, X } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';

export default function DashboardPage({ onUpload, onOpenNote, onQuiz }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchRecords(); }, []);

  async function fetchRecords() {
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) throw new Error('Failed to load');
      setRecords(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Delete these notes?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setRecords(p => p.filter(r => r.id !== id));
    } finally { setDeleting(null); }
  }

  async function handleOpen(record) {
    try {
      const res = await fetch(`/api/notes/${record.id}`);
      onOpenNote(await res.json());
    } catch { setError('Failed to load note'); }
  }

  function handleSaveEdit(id, updates) {
    setRecords(p => p.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-800 text-ink-900">Your Notes</h1>
          <p className="text-ink-400 text-sm mt-1">
            {records.length === 0 ? 'No sessions yet' : `${records.length} session${records.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {records.length === 0 ? (
        <EmptyState onUpload={onUpload} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {records.map(r => (
            <NoteCard key={r.id} record={r}
              onClick={() => handleOpen(r)}
              onDelete={e => handleDelete(e, r.id)}
              onQuiz={onQuiz ? e => { e.stopPropagation(); onQuiz(r.id, r.title); } : null}
              onSaveEdit={updates => handleSaveEdit(r.id, updates)}
              deleting={deleting === r.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ record, onClick, onDelete, onQuiz, onSaveEdit, deleting }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(record.title || '');
  const [description, setDescription] = useState(record.description || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const titleRef = useRef(null);

  // Keep local state in sync if parent record changes
  useEffect(() => {
    if (!editing) {
      setTitle(record.title || '');
      setDescription(record.description || '');
    }
  }, [record.title, record.description]);

  function handleEditClick(e) {
    e.stopPropagation();
    setEditing(true);
    setSaveError(null);
    setTimeout(() => titleRef.current?.focus(), 0);
  }

  function handleCancel(e) {
    e?.stopPropagation();
    setTitle(record.title || '');
    setDescription(record.description || '');
    setSaveError(null);
    setEditing(false);
  }

  async function handleSave(e) {
    e?.stopPropagation();
    if (!title.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/notes/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaveEdit({ title: title.trim(), description: description.trim() });
      setEditing(false);
    } catch {
      setSaveError('Could not save — try again');
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') handleCancel();
  }

  const date = new Date(record.created_at || record.createdAt);
  const dateStr = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

  if (editing) {
    return (
      <div
        className="text-left bg-white border-2 border-brand-400 rounded-2xl p-5 shadow-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Title input */}
        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Subject name"
          className="w-full text-[15px] font-600 text-ink-800 bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
        />

        {/* Description input */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a description (optional) — e.g. Unit 2 exam prep, Week 3 revision…"
          rows={2}
          className="w-full text-sm text-ink-600 bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 mb-3 resize-none focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
        />

        {saveError && <p className="text-xs text-red-500 mb-2">{saveError}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button onClick={handleCancel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-500 hover:bg-ink-100 transition-colors">
            <X className="w-3 h-3" /> Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-ink-900 hover:bg-brand-600 text-white transition-colors disabled:opacity-50">
            {saving
              ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              : <Check className="w-3 h-3" />
            }
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={onClick}
      className="group text-left bg-white border border-ink-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-brand-300 transition-all duration-200 relative"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="font-600 text-ink-800 text-[15px] leading-snug group-hover:text-brand-600 transition-colors line-clamp-2 flex-1">
          {record.title || 'Untitled Notes'}
        </h2>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {record.latest_quiz_pct != null && (
            <ScoreBadge pct={record.latest_quiz_pct} />
          )}
          <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-brand-400 transition-colors" />
        </div>
      </div>

      {/* Description */}
      {record.description ? (
        <p className="text-xs text-ink-400 mb-3 line-clamp-2 text-left">{record.description}</p>
      ) : (
        <div className="mb-3" />
      )}

      <div className="flex items-center gap-3 text-xs text-ink-400 mb-3">
        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{record.topic_count ?? record.topicCount ?? 0} topics</span>
        {(record.key_term_count ?? record.keyTermCount ?? 0) > 0 && (
          <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{record.key_term_count ?? record.keyTermCount} terms</span>
        )}
      </div>

      {(record.file_names ?? record.fileNames)?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(record.file_names ?? record.fileNames).slice(0, 3).map((name, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-ink-100 text-ink-500 text-xs px-2 py-0.5 rounded-md">
              {name.endsWith('.pdf') ? <FileText className="w-3 h-3" /> : <Image className="w-3 h-3" />}
              <span className="max-w-[100px] truncate">{name}</span>
            </span>
          ))}
          {(record.file_names ?? record.fileNames).length > 3 && (
            <span className="text-xs text-ink-400">+{(record.file_names ?? record.fileNames).length - 3} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-ink-400">
          <Clock className="w-3 h-3" />{dateStr} · {timeStr}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={handleEditClick}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-700 text-xs font-medium transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
          {onQuiz && (
            <button onClick={onQuiz}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-medium transition-colors">
              <Zap className="w-3 h-3" /> Quiz
            </button>
          )}
          <button onClick={onDelete} disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-ink-400 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div className="text-center py-20 animate-slide-up">
      <div className="w-16 h-16 bg-ink-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
        <BrainLogo className="w-6 h-6 text-white" />
      </div>
      <h2 className="text-lg font-600 text-ink-700 mb-2">No notes yet</h2>
      <p className="text-ink-400 text-sm mb-6">Upload your first set of notes to get started</p>
      <button onClick={onUpload}
        className="inline-flex items-center gap-2 bg-ink-900 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors shadow-sm">
        <BrainLogo className="w-4 h-4" /> Generate your first notes
      </button>
    </div>
  );
}

function ScoreBadge({ pct }) {
  const colour = pct >= 80 ? 'bg-green-100 text-green-700'
    : pct >= 60 ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-600';
  return (
    <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${colour}`}>
      {pct}%
    </span>
  );
}
