import { useState, useEffect, useRef } from 'react';
import { FileText, Image, Trash2, ChevronRight, BookOpen, Hash, Clock, AlertCircle, Zap, Pencil, Check, X, Plus, UploadCloud, Loader2, Youtube, Link } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';

export default function DashboardPage({ onUpload, onOpenNote, onQuiz }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [ingestTarget, setIngestTarget] = useState(null); // { id, title }

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

  function handleIngestDone(id, updated) {
    setRecords(p => p.map(r => r.id === id ? { ...r, ...updated } : r));
    setIngestTarget(null);
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
          <h1 className="text-2xl sm:text-3xl font-800 text-ink-900">My Study Notes</h1>
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
              onAddSource={e => { e.stopPropagation(); setIngestTarget({ id: r.id, title: r.title }); }}
              deleting={deleting === r.id}
            />
          ))}
        </div>
      )}

      {/* Add sources modal */}
      {ingestTarget && (
        <AddSourcesModal
          target={ingestTarget}
          onDone={updated => handleIngestDone(ingestTarget.id, updated)}
          onClose={() => setIngestTarget(null)}
        />
      )}
    </div>
  );
}

// ── Add Sources Modal ─────────────────────────────────────────────────────────

function AddSourcesModal({ target, onDone, onClose }) {
  const [tab, setTab] = useState('files'); // 'files' | 'youtube'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="font-700 text-ink-900 text-base">Add sources</h2>
            <p className="text-ink-400 text-sm mt-0.5 line-clamp-1">{target.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mb-4 bg-ink-100 rounded-xl p-1">
          <button
            onClick={() => setTab('files')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-600 transition-all ${tab === 'files' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}
          >
            <UploadCloud className="w-3.5 h-3.5" /> Files
          </button>
          <button
            onClick={() => setTab('youtube')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-600 transition-all ${tab === 'youtube' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}
          >
            <Youtube className="w-3.5 h-3.5" /> YouTube
          </button>
        </div>

        {tab === 'files'
          ? <FilesTab target={target} onDone={onDone} onClose={onClose} />
          : <YouTubeTab target={target} onDone={onDone} onClose={onClose} />
        }
      </div>
    </div>
  );
}

function FilesTab({ target, onDone, onClose }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function addFiles(newFiles) {
    const valid = Array.from(newFiles).filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !existing.has(f.name))];
    });
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files);
  }

  async function handleSubmit() {
    if (!files.length) return;
    setProcessing(true); setError(null);
    try {
      const form = new FormData();
      files.forEach(f => form.append('files', f));
      const res = await fetch(`/api/notes/${target.id}/ingest`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process');
      onDone({ file_names: data.record.file_names, topic_count: data.record.topic_count, key_term_count: data.record.key_term_count });
    } catch (err) { setError(err.message); }
    finally { setProcessing(false); }
  }

  return (
    <div className="px-6 pb-6 space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50'}`}
      >
        <UploadCloud className="w-7 h-7 text-ink-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-ink-600">Drop files here or <span className="text-brand-600">browse</span></p>
        <p className="text-xs text-ink-400 mt-1">PDF, JPG, PNG — merged into existing notes</p>
        <input ref={inputRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={e => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map(f => (
            <li key={f.name} className="flex items-center gap-2 bg-ink-50 rounded-lg px-3 py-2 text-sm">
              {f.type === 'application/pdf' ? <FileText className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" /> : <Image className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />}
              <span className="flex-1 text-ink-700 truncate">{f.name}</span>
              <button onClick={() => setFiles(p => p.filter(x => x.name !== f.name))} className="text-ink-300 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}
      {processing && (
        <div className="flex items-center gap-3 bg-brand-50 rounded-xl px-4 py-3 text-sm text-brand-700">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          Merging new content into your notes… this may take 20–30 seconds
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {!processing && <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 text-sm font-medium transition-colors">Cancel</button>}
        <button onClick={handleSubmit} disabled={!files.length || processing}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-medium disabled:opacity-40 transition-colors">
          {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Plus className="w-4 h-4" /> Merge into notes</>}
        </button>
      </div>
    </div>
  );
}

function YouTubeTab({ target, onDone, onClose }) {
  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!url.trim()) return;
    setProcessing(true); setError(null);
    try {
      const res = await fetch('/api/youtube/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: target.id, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process');
      onDone({ file_names: data.record.file_names, topic_count: data.record.topic_count, key_term_count: data.record.key_term_count });
    } catch (err) { setError(err.message); }
    finally { setProcessing(false); }
  }

  return (
    <div className="px-6 pb-6 space-y-4">
      <div className="rounded-xl border-2 border-dashed border-ink-200 p-5 text-center">
        <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center mx-auto mb-3">
          <Youtube className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm font-medium text-ink-700 mb-1">Paste a YouTube URL</p>
        <p className="text-xs text-ink-400">The transcript will be extracted, summarised, and merged into your notes — with the video embedded for reference</p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-ink-50 border-2 border-ink-200 focus-within:border-brand-400 rounded-xl px-3 transition-colors">
          <Link className="w-4 h-4 text-ink-400 flex-shrink-0" />
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 py-3 bg-transparent text-sm text-ink-700 placeholder-ink-400 focus:outline-none"
            disabled={processing}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}

      {processing && (
        <div className="flex items-center gap-3 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          Fetching transcript and merging into your notes… this may take 30–45 seconds
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {!processing && <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 text-sm font-medium transition-colors">Cancel</button>}
        <button onClick={handleSubmit} disabled={!url.trim() || processing}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-40 transition-colors">
          {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Youtube className="w-4 h-4" /> Add video</>}
        </button>
      </div>
    </div>
  );
}

// ── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({ record, onClick, onDelete, onQuiz, onSaveEdit, onAddSource, deleting }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(record.title || '');
  const [description, setDescription] = useState(record.description || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const titleRef = useRef(null);

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
      <div className="text-left bg-white border-2 border-brand-400 rounded-2xl p-5 shadow-md" onClick={e => e.stopPropagation()}>
        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Subject name"
          className="w-full text-[15px] font-600 text-ink-800 bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a description (optional) — e.g. Unit 2 exam prep, Week 3 revision…"
          rows={2}
          className="w-full text-sm text-ink-600 bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 mb-3 resize-none focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
        />
        {saveError && <p className="text-xs text-red-500 mb-2">{saveError}</p>}
        <div className="flex items-center justify-end gap-2">
          <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-500 hover:bg-ink-100 transition-colors">
            <X className="w-3 h-3" /> Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-ink-900 hover:bg-brand-600 text-white transition-colors disabled:opacity-50">
            {saving ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
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
          {record.latest_quiz_pct != null && <ScoreBadge pct={record.latest_quiz_pct} />}
          <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-brand-400 transition-colors" />
        </div>
      </div>

      {record.description ? (
        <p className="text-xs text-ink-400 mb-3 line-clamp-2 text-left">{record.description}</p>
      ) : <div className="mb-3" />}

      <div className="flex items-center gap-3 text-xs text-ink-400 mb-3">
        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{record.topic_count ?? 0} topics</span>
        {(record.key_term_count ?? 0) > 0 && (
          <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{record.key_term_count} terms</span>
        )}
      </div>

      {/* Sources toggle */}
      {(record.file_names ?? record.fileNames)?.length > 0 && (
        <div className="mb-3">
          <button
            onClick={e => { e.stopPropagation(); setSourcesOpen(v => !v); }}
            className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-600 transition-colors"
          >
            <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${sourcesOpen ? 'rotate-90' : ''}`} />
            Sources ({(record.file_names ?? record.fileNames).length})
          </button>
          {sourcesOpen && (
            <ul className="mt-2 space-y-1 pl-1">
              {(record.file_names ?? record.fileNames).map((name, i) => {
                const isYT = name.startsWith('youtube:');
                const ytId = isYT ? name.replace('youtube:', '') : null;
                return (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-ink-500">
                    {isYT
                      ? <Youtube className="w-3 h-3 flex-shrink-0 text-red-400" />
                      : name.endsWith('.pdf') ? <FileText className="w-3 h-3 flex-shrink-0 text-ink-400" /> : <Image className="w-3 h-3 flex-shrink-0 text-ink-400" />}
                    {isYT
                      ? <a href={`https://youtube.com/watch?v=${ytId}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-red-500 hover:underline truncate">youtube.com/watch?v={ytId}</a>
                      : <span className="break-all">{name}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-ink-400">
          <Clock className="w-3 h-3" />{dateStr} · {timeStr}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={onAddSource}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-brand-50 text-ink-400 hover:text-brand-600 text-xs font-medium transition-colors"
            title="Add sources">
            <Plus className="w-3 h-3" />
          </button>
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
