import { useState, useEffect } from 'react';
import { FileText, Image, Trash2, ChevronRight, BookOpen, Hash, Sparkles, Clock, AlertCircle } from 'lucide-react';

export default function DashboardPage({ onUpload, onOpenNote }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) throw new Error('Failed to load notes');
      setRecords(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Delete these notes?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setRecords(prev => prev.filter(r => r.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function handleOpen(record) {
    try {
      const res = await fetch(`/api/notes/${record.id}`);
      const full = await res.json();
      onOpenNote(full);
    } catch {
      setError('Failed to load note');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading your notes…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header row */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Study Notes</h1>
          <p className="text-slate-400 text-sm mt-1">
            {records.length === 0 ? 'No notes yet' : `${records.length} session${records.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <EmptyState onUpload={onUpload} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {records.map(record => (
            <NoteCard
              key={record.id}
              record={record}
              onClick={() => handleOpen(record)}
              onDelete={(e) => handleDelete(e, record.id)}
              deleting={deleting === record.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ record, onClick, onDelete, deleting }) {
  const date = new Date(record.createdAt);
  const dateStr = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-brand-300 transition-all relative"
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="font-semibold text-slate-800 text-base leading-snug group-hover:text-brand-700 transition-colors pr-6">
          {record.title || 'Untitled Notes'}
        </h2>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-400 flex-shrink-0 mt-0.5 transition-colors" />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {record.topicCount} topic{record.topicCount !== 1 ? 's' : ''}
        </span>
        {record.keyTermCount > 0 && (
          <span className="flex items-center gap-1">
            <Hash className="w-3.5 h-3.5" />
            {record.keyTermCount} terms
          </span>
        )}
      </div>

      {/* Source files */}
      {record.fileNames?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {record.fileNames.slice(0, 3).map((name, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-md">
              {name.endsWith('.pdf') ? <FileText className="w-3 h-3" /> : <Image className="w-3 h-3" />}
              <span className="max-w-[120px] truncate">{name}</span>
            </span>
          ))}
          {record.fileNames.length > 3 && (
            <span className="text-xs text-slate-400 px-1">+{record.fileNames.length - 3} more</span>
          )}
        </div>
      )}

      {/* Date + delete */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {dateStr} · {timeStr}
        </span>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </button>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <BookOpen className="w-8 h-8 text-brand-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-700 mb-2">No notes yet</h2>
      <p className="text-slate-400 text-sm mb-6">Upload your first set of notes to get started</p>
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
      >
        <Sparkles className="w-4 h-4" />
        Generate your first notes
      </button>
    </div>
  );
}
