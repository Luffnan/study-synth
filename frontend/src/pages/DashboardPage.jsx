import { useState, useEffect } from 'react';
import { FileText, Image, Trash2, ChevronRight, BookOpen, Hash, Clock, AlertCircle } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';

export default function DashboardPage({ onUpload, onOpenNote }) {
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
              deleting={deleting === r.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ record, onClick, onDelete, deleting }) {
  const date = new Date(record.created_at || record.createdAt);
  const dateStr = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

  return (
    <button onClick={onClick}
      className="group text-left bg-white border border-ink-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-brand-300 transition-all duration-200 relative"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="font-600 text-ink-800 text-[15px] leading-snug group-hover:text-brand-600 transition-colors pr-4 line-clamp-2">
          {record.title || 'Untitled Notes'}
        </h2>
        <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-brand-400 flex-shrink-0 mt-0.5 transition-colors" />
      </div>

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
        <button onClick={onDelete} disabled={deleting}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-ink-400 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
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
