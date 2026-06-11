import { apiFetch } from '../lib/api.js';
import { submitFiles } from '../lib/upload.js';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText, Image, Trash2, BookOpen, Hash, AlertCircle, Zap, Pencil,
  Check, X, Plus, UploadCloud, Loader2, Youtube, Link, FolderPlus,
  ChevronDown, ChevronRight, MoveRight, Folder,
} from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';

// ── Tips ─────────────────────────────────────────────────────────────────────

const TIPS = [
  { lead: 'Upload multiple files at once', body: 'Combine lecture slides, textbook pages and handwritten notes into one set of study notes in a single upload.' },
  { lead: 'Switch to Concise mode', body: 'Get a compressed version of your notes when you\'re short on time — find the toggle above your notes.' },
  { lead: 'Add a YouTube video to existing notes', body: 'Open any topic, hit Add Source, and paste a YouTube URL to merge the transcript straight into your existing notes.' },
  { lead: 'Generate a quiz from specific topics', body: 'Pick exactly which subtopics to test yourself on — you don\'t have to quiz the whole subject at once.' },
  { lead: 'Organise topics into colour-coded subjects', body: 'Create a subject and move any topic into it to keep History separate from Biology and everything easy to find.' },
  { lead: 'Download your notes as Word or Markdown', body: 'Export any topic for offline study or to share with classmates — look for the download button inside your notes.' },
  { lead: 'Upload a photo of handwritten notes', body: 'Brain Buffet reads your handwriting and structures it into clean, organised notes automatically.' },
  { lead: 'Add more sources to an existing topic', body: 'Open a topic and hit Add Source to bring in new material — your notes update without losing what\'s already there.' },
  { lead: 'Your quiz scores are tracked over time', body: 'Revisit a topic\'s quiz to see whether your score improves across sessions as you study.' },
  { lead: 'Standard and Concise views are always available', body: 'Both note modes are stored — switch between them any time without needing to re-generate anything.' },
];

function TipBanner() {
  const startIndex = useMemo(() => Math.floor(Math.random() * TIPS.length), []);
  const [index, setIndex] = useState(startIndex);
  const tip = TIPS[index];
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-ink-900 bg-accent-yellow shadow-hard">
      <div className="px-4 py-6 flex items-center gap-3">
        <div className="flex-shrink-0">
          <Zap className="w-8 h-8 text-ink-900 fill-ink-900" strokeWidth={0} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-700 text-ink-900 uppercase tracking-wider mb-0.5">Big Brain Tip</p>
          <p className="text-sm font-700 text-ink-900">{tip.lead}</p>
          <p className="text-xs text-ink-700 mt-0.5">{tip.body}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setIndex(i => (i + 1) % TIPS.length); }}
          className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-ink-900 bg-white/60 hover:bg-white flex items-center justify-center transition-colors"
          title="Next tip"
        >
          <ChevronRight className="w-4 h-4 text-ink-900" />
        </button>
      </div>
    </div>
  );
}

// ── Colour palette for subjects ───────────────────────────────────────────────

// Flat tile colours (from/to identical, so the existing gradient classes render as solid fills)
export const COLORS = {
  indigo:  { from: 'from-[#9B6DFF]', to: 'to-[#9B6DFF]', dot: 'bg-[#9B6DFF]', ring: 'ring-[#9B6DFF]' },
  blue:    { from: 'from-[#2E90FA]', to: 'to-[#2E90FA]', dot: 'bg-[#2E90FA]', ring: 'ring-[#2E90FA]' },
  emerald: { from: 'from-[#1DB870]', to: 'to-[#1DB870]', dot: 'bg-[#1DB870]', ring: 'ring-[#1DB870]' },
  amber:   { from: 'from-[#E8A300]', to: 'to-[#E8A300]', dot: 'bg-[#E8A300]', ring: 'ring-[#E8A300]' },
  rose:    { from: 'from-[#F2654E]', to: 'to-[#F2654E]', dot: 'bg-[#F2654E]', ring: 'ring-[#F2654E]' },
  slate:   { from: 'from-[#141310]', to: 'to-[#141310]', dot: 'bg-[#141310]', ring: 'ring-[#141310]' },
};

export default function DashboardPage({ onUpload, onOpenNote, onQuiz, onOpenSubject, yearLevel }) {
  const [records, setRecords] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [ingestTarget, setIngestTarget] = useState(null);
  const [newSubjectOpen, setNewSubjectOpen] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const [notesRes, subjectsRes] = await Promise.all([
        apiFetch('/api/notes'),
        apiFetch('/api/subjects'),
      ]);
      if (!notesRes.ok || !subjectsRes.ok) throw new Error('Failed to load');
      const [notes, subjs] = await Promise.all([notesRes.json(), subjectsRes.json()]);
      setRecords(notes);
      setSubjects(subjs);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Delete these notes?')) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
      setRecords(p => p.filter(r => r.id !== id));
    } finally { setDeleting(null); }
  }

  async function handleOpen(record) {
    try {
      const res = await apiFetch(`/api/notes/${record.id}`);
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

  async function handleMoveToSubject(noteId, subjectId) {
    try {
      await apiFetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: subjectId }),
      });
      setRecords(p => p.map(r => r.id === noteId ? { ...r, subject_id: subjectId } : r));
    } catch { setError('Failed to move topic'); }
  }

  async function handleRemoveFromSubject(noteId) {
    await handleMoveToSubject(noteId, null);
  }

  function handleSubjectCreated(subject) {
    setSubjects(p => [...p, subject]);
    setNewSubjectOpen(false);
    onOpenSubject?.(subject);
  }

  async function handleDeleteSubject(subjectId) {
    if (!confirm('Delete this subject? Topics inside will become uncategorised.')) return;
    try {
      await apiFetch(`/api/subjects/${subjectId}`, { method: 'DELETE' });
      setSubjects(p => p.filter(s => s.id !== subjectId));
      setRecords(p => p.map(r => r.subject_id === subjectId ? { ...r, subject_id: null } : r));
    } catch { setError('Failed to delete subject'); }
  }

  async function handleRenameSubject(subjectId, updates) {
    try {
      const res = await apiFetch(`/api/subjects/${subjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setSubjects(p => p.map(s => s.id === subjectId ? updated : s));
    } catch { setError('Failed to update subject'); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const uncategorised = records.filter(r => !r.subject_id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-800 text-ink-900">My Study Notes</h1>
          <p className="text-ink-400 text-sm mt-1">
            {subjects.length > 0
              ? `${subjects.length} subject${subjects.length !== 1 ? 's' : ''} · ${records.length} topic${records.length !== 1 ? 's' : ''}`
              : records.length === 0 ? 'No notes yet' : `${records.length} topic${records.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <button onClick={() => setNewSubjectOpen(true)}
          className="flex items-center gap-1.5 bg-white hover:bg-ink-100 text-ink-900 border-2 border-ink-900 px-3 py-1.5 rounded-xl text-sm font-600 transition-colors flex-shrink-0 shadow-hard-sm">
          <FolderPlus className="w-3.5 h-3.5" /> New Subject
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {records.length === 0 && subjects.length === 0 ? (
        <EmptyState onUpload={onUpload} />
      ) : (
        <div className="space-y-8">

          {/* ── Subjects grid ── */}
          {subjects.length > 0 && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map(subject => {
                  const topics = records.filter(r => r.subject_id === subject.id);
                  return (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      topics={topics}
                      onOpen={() => onOpenSubject?.(subject, records, subjects)}
                      onDelete={() => handleDeleteSubject(subject.id)}
                      onRename={updates => handleRenameSubject(subject.id, updates)}
                    />
                  );
                })}
              </div>
              <TipBanner />
            </div>
          )}

          {/* ── Uncategorised topics ── */}
          {uncategorised.length > 0 && (
            <div>
              {subjects.length > 0 && (
                <h2 className="text-xs font-600 text-ink-400 uppercase tracking-wider mb-3">Uncategorised</h2>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {uncategorised.map(r => (
                  <TopicCard key={r.id} record={r}
                    onClick={() => handleOpen(r)}
                    onDelete={e => handleDelete(e, r.id)}
                    onQuiz={onQuiz ? e => { e.stopPropagation(); onQuiz(r.id, r.title); } : null}
                    onSaveEdit={updates => handleSaveEdit(r.id, updates)}
                    onAddSource={e => { e.stopPropagation(); setIngestTarget({ id: r.id, title: r.title }); }}
                    onMoveToSubject={subjects.length > 0 ? subjectId => handleMoveToSubject(r.id, subjectId) : null}
                    subjects={subjects}
                    deleting={deleting === r.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {newSubjectOpen && (
        <NewSubjectModal onCreated={handleSubjectCreated} onClose={() => setNewSubjectOpen(false)} />
      )}

      {ingestTarget && (
        <AddSourcesModal
          target={ingestTarget}
          yearLevel={yearLevel}
          onDone={updated => handleIngestDone(ingestTarget.id, updated)}
          onClose={() => setIngestTarget(null)}
        />
      )}
    </div>
  );
}

// ── Subject card ──────────────────────────────────────────────────────────────

const COLOR_HEX = {
  indigo:  '#9B6DFF',
  blue:    '#2E90FA',
  emerald: '#1DB870',
  amber:   '#E8A300',
  rose:    '#F2654E',
  slate:   '#141310',
};

function SubjectCard({ subject, topics, onOpen, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [titleVal, setTitleVal] = useState(subject.title);
  const inputRef = useRef(null);
  const hex = COLOR_HEX[subject.color] || COLOR_HEX.indigo;

  function startEdit(e) { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }
  async function saveEdit(e) {
    e?.stopPropagation();
    if (titleVal.trim()) await onRename({ title: titleVal.trim() });
    setEditing(false);
  }
  function cancelEdit(e) { e?.stopPropagation(); setTitleVal(subject.title); setEditing(false); }

  return (
    <div
      onClick={() => !editing && onOpen()}
      className="relative rounded-2xl border-2 border-ink-900 shadow-hard cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Coloured header */}
      <div className="relative overflow-hidden px-4 py-3 flex items-center justify-between gap-2" style={{ backgroundColor: hex }}>
        {/* Watermark */}
        <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-15 pointer-events-none">
          <BrainLogo className="w-16 h-16 text-white" />
        </div>

        {editing ? (
          <div onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 flex-1 min-w-0 relative z-10">
            <input ref={inputRef} value={titleVal} onChange={e => setTitleVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              className="flex-1 min-w-0 bg-white/20 border border-white/40 rounded-lg px-2 py-0.5 text-sm font-700 text-white placeholder-white/60 focus:outline-none focus:bg-white/30"
            />
            <button onClick={saveEdit} className="p-1 bg-white/20 hover:bg-white/40 rounded text-white"><Check className="w-3 h-3" /></button>
            <button onClick={cancelEdit} className="p-1 bg-white/10 hover:bg-white/25 rounded text-white"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <h2 className="text-sm font-800 text-white leading-tight truncate relative z-10">{subject.title}</h2>
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 relative z-10">
          <button onClick={startEdit} className="p-1.5 bg-white/15 hover:bg-white/30 rounded-lg text-white transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 bg-white/15 hover:bg-red-500/60 rounded-lg text-white transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body — off-white */}
      <div className="bg-[#FAFAF8] px-4 py-3">
        {topics.length === 0 ? (
          <p className="text-xs text-ink-400 italic">No topics yet</p>
        ) : (
          <ul className="space-y-1.5">
            {topics.slice(0, 4).map(t => (
              <li key={t.id} className="flex items-center gap-2 text-xs text-ink-600">
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
                <span className="truncate">{t.title}</span>
              </li>
            ))}
            {topics.length > 4 && (
              <li className="text-xs text-ink-400">+{topics.length - 4} more</li>
            )}
          </ul>
        )}

        <div className="mt-2.5 pt-2.5 border-t border-ink-100 flex items-center justify-between">
          <span className="text-[10px] font-600 text-ink-400 uppercase tracking-wider">
            {topics.length} topic{topics.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] font-600 text-ink-400 group-hover:text-ink-700 transition-colors flex items-center gap-1">
            Open <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── New subject modal ─────────────────────────────────────────────────────────

function NewSubjectModal({ onCreated, onClose }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('indigo');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  async function handleCreate() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), color }),
      });
      const subject = await res.json();
      onCreated(subject);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
        <h2 className="font-700 text-ink-900 text-base mb-4">New Subject</h2>

        <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="e.g. Biology, History, Maths"
          className="w-full px-3 py-2.5 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm font-500 text-ink-800 mb-4"
        />

        {/* Colour picker */}
        <p className="text-xs font-600 text-ink-400 uppercase tracking-wider mb-2">Colour</p>
        <div className="flex gap-2 mb-5">
          {Object.entries(COLORS).map(([key, c]) => (
            <button key={key} onClick={() => setColor(key)}
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.from} ${c.to} transition-all ${color === key ? `ring-2 ring-offset-2 ${c.ring} scale-110` : 'hover:scale-105'}`}
            />
          ))}
        </div>

        {/* Preview */}
        <div className={`rounded-xl bg-gradient-to-br ${COLORS[color].from} ${COLORS[color].to} px-4 py-3 mb-5 flex items-center gap-3 overflow-hidden relative`}>
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-3 translate-y-3"><BrainLogo className="w-14 h-14 text-white" /></div>
          <BrainLogo className="w-5 h-5 text-white relative z-10" />
          <span className="text-white font-700 text-sm relative z-10 truncate">{title || 'Subject name'}</span>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 text-sm font-500 transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={!title.trim() || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 disabled:opacity-40 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Topic card (slimmer version of old NoteCard) ──────────────────────────────

export function TopicCard({ record, onClick, onDelete, onQuiz, onSaveEdit, onAddSource, onMoveToSubject, onRemoveFromSubject, subjects = [], deleting }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(record.title || '');
  const [description, setDescription] = useState(record.description || '');
  const [saving, setSaving] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (!editing) { setTitle(record.title || ''); setDescription(record.description || ''); }
  }, [record.title, record.description]);

  function handleEditClick(e) { e.stopPropagation(); setEditing(true); setTimeout(() => titleRef.current?.focus(), 0); }
  function handleCancel(e) { e?.stopPropagation(); setTitle(record.title || ''); setDescription(record.description || ''); setEditing(false); }

  async function handleSave(e) {
    e?.stopPropagation();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/notes/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaveEdit({ title: title.trim(), description: description.trim() });
      setEditing(false);
    } finally { setSaving(false); }
  }

  const sources = record.file_names || [];
  const fileCount = sources.filter(f => !f.startsWith('youtube:')).length;
  const youtubeCount = sources.filter(f => f.startsWith('youtube:')).length;

  if (editing) {
    return (
      <div className="bg-white border-2 border-brand-400 rounded-2xl p-4 shadow-md" onClick={e => e.stopPropagation()}>
        <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
          className="w-full text-sm font-600 text-ink-800 bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:border-brand-400" />
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full text-sm text-ink-600 bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 mb-3 resize-none focus:outline-none focus:border-brand-400" />
        <div className="flex gap-2 justify-end">
          <button onClick={handleCancel} className="px-3 py-1.5 rounded-lg text-xs font-500 text-ink-500 hover:bg-ink-100 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-600 bg-ink-900 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick}
      className={`bg-white border-2 border-ink-900 rounded-2xl shadow-hard-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group ${deleting ? 'opacity-50' : ''}`}>

      {/* Card body */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-[15px] font-600 text-ink-800 leading-snug mb-1">{record.title || 'Untitled'}</h3>
        {record.description && <p className="text-xs text-ink-400 mb-2 line-clamp-1">{record.description}</p>}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-ink-400 mb-2">
          {record.topic_count > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{record.topic_count} sections</span>}
          {record.key_term_count > 0 && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{record.key_term_count} terms</span>}
          {record.latest_quiz_pct != null && (
            <span className="flex items-center gap-1 text-brand-600 font-500"><Zap className="w-3 h-3" />{record.latest_quiz_pct}%</span>
          )}
        </div>

        {/* Sources */}
        {sources.length > 0 && (
          <div>
            <button onClick={e => { e.stopPropagation(); setSourcesOpen(o => !o); }}
              className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-600 transition-colors">
              {sourcesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Sources ({sources.length})
            </button>
            {sourcesOpen && (
              <ul className="mt-1.5 space-y-1 pl-3">
                {sources.map((f, i) => f.startsWith('youtube:') ? (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-red-500">
                    <Youtube className="w-3 h-3 flex-shrink-0" />
                    <a href={`https://youtube.com/watch?v=${f.replace('youtube:', '')}`} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()} className="hover:underline truncate">
                      youtu.be/{f.replace('youtube:', '')}
                    </a>
                  </li>
                ) : (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-ink-500">
                    <FileText className="w-3 h-3 flex-shrink-0 text-ink-400" />
                    <span className="truncate">{f}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar — slides in on hover */}
      <div className="border-t border-ink-100 bg-ink-50 px-3 py-2 flex items-center gap-0.5 rounded-b-2xl
                      opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {/* Left: primary actions */}
        <div className="flex items-center gap-0.5 flex-1">
          {onAddSource && (
            <button onClick={e => { e.stopPropagation(); onAddSource(e); }} title="Add sources"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-500 text-ink-500 hover:bg-white hover:text-brand-600 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          )}
          <button onClick={handleEditClick} title="Rename"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-500 text-ink-500 hover:bg-white hover:text-ink-800 transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          {onQuiz && (
            <button onClick={onQuiz} title="Start quiz"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-500 text-ink-500 hover:bg-white hover:text-brand-600 transition-colors">
              <Zap className="w-3.5 h-3.5" /> Quiz
            </button>
          )}
          {onMoveToSubject && (
            <div className="relative">
              <button onClick={e => { e.stopPropagation(); setMoveOpen(o => !o); }} title="Move to subject"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-500 text-ink-500 hover:bg-white hover:text-ink-800 transition-colors">
                <MoveRight className="w-3.5 h-3.5" /> Move
              </button>
              {moveOpen && (
                <MoveMenu subjects={subjects} onMove={id => { onMoveToSubject(id); setMoveOpen(false); }} onClose={() => setMoveOpen(false)} />
              )}
            </div>
          )}
          {onRemoveFromSubject && (
            <button onClick={e => { e.stopPropagation(); onRemoveFromSubject(); }} title="Remove from subject"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-500 text-ink-500 hover:bg-white hover:text-ink-800 transition-colors">
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
        {/* Right: destructive */}
        <button onClick={onDelete} title="Delete"
          className="p-1.5 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors ml-auto flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Move to subject menu ──────────────────────────────────────────────────────

export function MoveMenu({ subjects, onMove, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-ink-200 rounded-xl shadow-lg z-20 overflow-hidden">
      <p className="text-[10px] font-600 text-ink-400 uppercase tracking-wider px-3 py-2 border-b border-ink-100">Move to subject</p>
      {subjects.map(s => {
        const c = COLORS[s.color] || COLORS.indigo;
        return (
          <button key={s.id} onClick={e => { e.stopPropagation(); onMove(s.id); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors">
            <span className={`w-3 h-3 rounded-full bg-gradient-to-br ${c.from} ${c.to} flex-shrink-0`} />
            <span className="truncate">{s.title}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Add Sources Modal ─────────────────────────────────────────────────────────

export function AddSourcesModal({ target, yearLevel, onDone, onClose }) {
  const [tab, setTab] = useState('files');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="font-700 text-ink-900 text-base">Add sources</h2>
            <p className="text-ink-400 text-sm mt-0.5 line-clamp-1">{target.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1 mx-6 mb-4 bg-ink-100 rounded-xl p-1">
          {['files', 'youtube'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-600 transition-all ${tab === t ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>
              {t === 'files' ? <><UploadCloud className="w-3.5 h-3.5" /> Files</> : <><Youtube className="w-3.5 h-3.5" /> YouTube</>}
            </button>
          ))}
        </div>
        {tab === 'files' ? <FilesTab target={target} yearLevel={yearLevel} onDone={onDone} onClose={onClose} /> : <YouTubeTab target={target} onDone={onDone} onClose={onClose} />}
      </div>
    </div>
  );
}

function FilesTab({ target, yearLevel, onDone, onClose }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function addFiles(newFiles) {
    const valid = Array.from(newFiles).filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
    setFiles(prev => { const ex = new Set(prev.map(f => f.name)); return [...prev, ...valid.filter(f => !ex.has(f.name))]; });
  }

  async function handleSubmit() {
    if (!files.length) return;
    setProcessing(true); setError(null);
    try {
      const res = await submitFiles(files, `/api/notes/${target.id}/ingest`, yearLevel ? { yearLevel } : {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onDone({ file_names: data.record.file_names, topic_count: data.record.topic_count, key_term_count: data.record.key_term_count });
    } catch (err) { setError(err.message); }
    finally { setProcessing(false); }
  }

  return (
    <div className="px-6 pb-6 space-y-4">
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50'}`}>
        <UploadCloud className="w-7 h-7 text-ink-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-ink-600">Drop files or <span className="text-brand-600">browse</span></p>
        <p className="text-xs text-ink-400 mt-1">PDF, JPG, PNG</p>
        <input ref={inputRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={e => addFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map(f => (
            <li key={f.name} className="flex items-center gap-2 bg-ink-50 rounded-lg px-3 py-2 text-sm">
              <FileText className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
              <span className="flex-1 text-ink-700 truncate">{f.name}</span>
              <button onClick={() => setFiles(p => p.filter(x => x.name !== f.name))} className="text-ink-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {processing && <div className="flex items-center gap-2 text-sm text-brand-700 bg-brand-50 rounded-xl px-4 py-3"><Loader2 className="w-4 h-4 animate-spin" />Merging… 20–30 seconds</div>}
      <div className="flex gap-2">
        {!processing && <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-200 text-ink-600 text-sm font-500">Cancel</button>}
        <button onClick={handleSubmit} disabled={!files.length || processing}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 disabled:opacity-40 transition-colors">
          {processing ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><Plus className="w-4 h-4" />Merge</>}
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
      const res = await apiFetch('/api/youtube', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: target.id, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onDone({ file_names: data.record.file_names, topic_count: data.record.topic_count, key_term_count: data.record.key_term_count });
    } catch (err) { setError(err.message); }
    finally { setProcessing(false); }
  }

  return (
    <div className="px-6 pb-6 space-y-4">
      <div className="flex items-center gap-2 bg-ink-50 border-2 border-ink-200 focus-within:border-brand-400 rounded-xl px-3">
        <Link className="w-4 h-4 text-ink-400 flex-shrink-0" />
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="https://youtube.com/watch?v=…" disabled={processing}
          className="flex-1 py-3 bg-transparent text-sm text-ink-700 placeholder-ink-400 focus:outline-none" />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {processing && <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3"><Loader2 className="w-4 h-4 animate-spin" />Fetching transcript… 30–45 seconds</div>}
      <div className="flex gap-2">
        {!processing && <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-200 text-ink-600 text-sm font-500">Cancel</button>}
        <button onClick={handleSubmit} disabled={!url.trim() || processing}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-600 disabled:opacity-40 transition-colors">
          {processing ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><Youtube className="w-4 h-4" />Add video</>}
        </button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onUpload }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-ink-900 flex items-center justify-center mx-auto mb-5 shadow-lg">
        <BrainLogo className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-700 text-ink-800 mb-2">No notes yet</h2>
      <p className="text-ink-400 text-sm mb-6 max-w-xs mx-auto">Upload documents or a YouTube video to generate your first set of study notes</p>
      <button onClick={onUpload} className="inline-flex items-center gap-2 bg-ink-900 hover:bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-600 transition-colors shadow-sm">
        <Plus className="w-4 h-4" /> Create first notes
      </button>
    </div>
  );
}
