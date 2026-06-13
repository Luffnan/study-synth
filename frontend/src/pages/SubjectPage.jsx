import { apiFetch } from '../lib/api.js';
import { useState } from 'react';
import { ChevronRight, Plus, Zap, AlertCircle } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';
import { COLORS, TopicCard, MoveMenu, AddSourcesModal } from './DashboardPage.jsx';

// ── Subject detail page ───────────────────────────────────────────────────────
// Breadcrumb: My Study Notes > {subject.title}
// Shows all topics belonging to this subject in a card grid.

export default function SubjectPage({
  subject,
  allRecords,
  subjects,
  onBack,
  onOpenNote,
  onOpenNoteAtSources,
  onQuiz,
  onRecordsChange,
  yearLevel,
}) {
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [ingestTarget, setIngestTarget] = useState(null);

  const c = COLORS[subject.color] || COLORS.indigo;
  const topics = allRecords.filter(r => r.subject_id === subject.id);

  async function handleOpen(record) {
    try {
      const res = await apiFetch(`/api/notes/${record.id}`);
      onOpenNote(await res.json());
    } catch { setError('Failed to load note'); }
  }

  async function handleOpenAtSources(record) {
    if (!onOpenNoteAtSources) return;
    try {
      const res = await apiFetch(`/api/notes/${record.id}`);
      onOpenNoteAtSources(await res.json());
    } catch { setError('Failed to load note'); }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Delete these notes?')) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
      onRecordsChange(allRecords.filter(r => r.id !== id));
    } finally { setDeleting(null); }
  }

  function handleSaveEdit(id, updates) {
    onRecordsChange(allRecords.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  function handleIngestDone(id, updated) {
    onRecordsChange(allRecords.map(r => r.id === id ? { ...r, ...updated } : r));
    setIngestTarget(null);
  }

  async function handleRemoveFromSubject(noteId) {
    try {
      await apiFetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: null }),
      });
      onRecordsChange(allRecords.map(r => r.id === noteId ? { ...r, subject_id: null } : r));
    } catch { setError('Failed to remove from subject'); }
  }

  async function handleMoveToSubject(noteId, subjectId) {
    try {
      await apiFetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: subjectId }),
      });
      onRecordsChange(allRecords.map(r => r.id === noteId ? { ...r, subject_id: subjectId } : r));
    } catch { setError('Failed to move topic'); }
  }

  // Other subjects available to move topics into (excluding current)
  const otherSubjects = subjects.filter(s => s.id !== subject.id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-sm mb-6">
        <button
          onClick={onBack}
          className="text-ink-400 hover:text-ink-700 font-500 transition-colors"
        >
          Dashboard
        </button>
        <ChevronRight className="w-4 h-4 text-ink-300 flex-shrink-0" />
        <span className="text-ink-700 font-600">{subject.title}</span>
      </nav>

      {/* ── Subject header banner ── */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.from} ${c.to} shadow-sm mb-8`}>
        {/* Brain watermark */}
        <div className="absolute bottom-0 right-0 translate-x-6 translate-y-6 opacity-10 pointer-events-none">
          <BrainLogo className="w-40 h-40 text-white" />
        </div>
        <div className="relative z-10 px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <BrainLogo className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-white leading-tight">{subject.title}</h1>
            <p className="text-white/60 text-sm mt-0.5">
              {topics.length === 0
                ? 'No topics yet'
                : `${topics.length} topic${topics.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* ── Topics grid ── */}
      {topics.length === 0 ? (
        <div className="text-center py-20">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.from} ${c.to} shadow-sm flex items-center justify-center mx-auto mb-4`}>
            <BrainLogo className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-700 text-ink-800 mb-2">No topics yet</h2>
          <p className="text-ink-400 text-sm max-w-xs mx-auto">
            Move uncategorised topics from the dashboard into this subject, or upload new notes.
          </p>
          <button
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 bg-ink-900 hover:bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-600 transition-colors shadow-sm"
          >
            Back to dashboard
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {topics.map(r => (
            <TopicCard
              key={r.id}
              record={r}
              onClick={() => handleOpen(r)}
              onOpenSources={() => handleOpenAtSources(r)}
              onDelete={e => handleDelete(e, r.id)}
              onQuiz={onQuiz ? e => { e.stopPropagation(); onQuiz(r.id, r.title); } : null}
              onSaveEdit={updates => handleSaveEdit(r.id, updates)}
              onAddSource={e => { e.stopPropagation(); setIngestTarget({ id: r.id, title: r.title }); }}
              onRemoveFromSubject={() => handleRemoveFromSubject(r.id)}
              onMoveToSubject={otherSubjects.length > 0 ? subjectId => handleMoveToSubject(r.id, subjectId) : null}
              subjects={otherSubjects}
              deleting={deleting === r.id}
            />
          ))}
        </div>
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
