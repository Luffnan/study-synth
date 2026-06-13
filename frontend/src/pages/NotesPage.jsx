import { apiFetch } from '../lib/api.js';
import { submitFiles } from '../lib/upload.js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Download, BookOpen, Hash, FileText, Zap, Layers, Youtube, CheckCircle, Loader2, FileDown, Plus, ArrowUp, X, Link, AlertCircle, Image, Menu, Trash2, Eye, HardDrive } from 'lucide-react';
import { generateDocx } from '../utils/generateDocx.js';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
};
const ACCEPTED_EXTS = Object.values(ACCEPTED).flat().join(',');

export default function NotesPage({ notes: initialNotes, noteId, conciseNotesProp, onConciseNotes, onBack, fromSubject, onBackToSubject, onQuiz, initialPane }) {
  const [mode, setMode] = useState('standard');
  const [conciseNotes, setConciseNotesLocal] = useState(conciseNotesProp ?? null);
  const [conciseLoading, setConciseLoading] = useState(false);
  const [conciseError, setConciseError] = useState(null);
  const conciseFetchedRef = useRef(conciseNotesProp != null);

  function setConciseNotes(val) {
    setConciseNotesLocal(val);
    onConciseNotes?.(val);
  }

  // Live notes — updated after Claude merges/restores video content
  const [liveNotes, setLiveNotes] = useState(initialNotes);
  const [videoSources, setVideoSources] = useState(initialNotes.videoSources || []);
  const [merging, setMerging] = useState(null); // videoId currently being processed

  const activeNotes = mode === 'concise' && conciseNotes ? conciseNotes : liveNotes;

  // Global arrow-key navigation through sidebar
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      e.preventDefault();
      setSelected(prev => {
        const items = [
          ...(activeNotes.topics || []).map((t, i) => ({ type: 'topic', index: i, label: t.name })),
          ...(activeNotes.keyTerms?.length ? [{ type: 'terms', label: 'Key Terms' }] : []),
          ...(videoSources || []).map(v => ({ type: 'video', videoId: v.videoId, label: v.title })),
        ];
        const idx = items.findIndex(item =>
          prev?.type === item.type &&
          (item.type === 'topic' ? prev.index === item.index :
           item.type === 'video' ? prev.videoId === item.videoId : true)
        );
        const next = e.key === 'ArrowDown'
          ? Math.min(idx + 1, items.length - 1)
          : Math.max(idx - 1, 0);
        return items[next] ?? prev;
      });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeNotes, videoSources]);

  // Build sidebar items: topics + key terms + videos + source files (only when files exist)
  const sidebarItems = [
    ...(activeNotes.topics || []).map((t, i) => ({ type: 'topic', index: i, label: t.name })),
    ...(activeNotes.keyTerms?.length ? [{ type: 'terms', label: 'Key Terms' }] : []),
    ...videoSources.map(v => ({ type: 'video', videoId: v.videoId, label: v.title })),
    ...(sourceFiles?.length > 0 ? [{ type: 'sources', label: 'Source Files' }] : []),
  ];

  const [selected, setSelected] = useState(() => {
    if (initialPane === 'sources' && noteId) return { type: 'sources', label: 'Source Files' };
    return sidebarItems[0] ?? null;
  });
  const [docxLoading, setDocxLoading] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const [sourceFiles, setSourceFiles] = useState(null); // null = not yet loaded
  const [sourceFilesLoading, setSourceFilesLoading] = useState(false);

  // Load source files on mount so we know whether to show the nav item
  useEffect(() => {
    loadSourceFiles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When mode switches, reset selected to first item
  useEffect(() => {
    const items = [
      ...(activeNotes.topics || []).map((t, i) => ({ type: 'topic', index: i, label: t.name })),
      ...(activeNotes.keyTerms?.length ? [{ type: 'terms', label: 'Key Terms' }] : []),
      ...videoSources.map(v => ({ type: 'video', videoId: v.videoId, label: v.title })),
      ...(sourceFiles?.length > 0 ? [{ type: 'sources', label: 'Source Files' }] : []),
    ];
    setSelected(items[0] ?? null);
  }, [mode, conciseNotes]);

  async function handleToggleConcise() {
    if (mode === 'concise') { setMode('standard'); return; }
    setMode('concise');
    if (conciseNotes || conciseFetchedRef.current) return;
    conciseFetchedRef.current = true;
    setConciseLoading(true); setConciseError(null);
    try {
      const res = await apiFetch(`/api/notes/${noteId}/concise`, { method: 'POST' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const data = await res.json();
      setConciseNotes(data.conciseNotes);
    } catch (err) {
      setConciseError(err.message);
      conciseFetchedRef.current = false;
    } finally { setConciseLoading(false); }
  }

  async function handleToggleVideoMerge(videoId, newMerged) {
    if (!noteId || merging) return;
    setMerging(videoId);
    try {
      const res = await apiFetch(`/api/notes/${noteId}/merge-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, merged: newMerged }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const { notes: updatedNotes } = await res.json();
      // Update live notes and videoSources from the server response
      setLiveNotes(updatedNotes);
      setVideoSources(updatedNotes.videoSources || []);
      // Invalidate concise cache — notes changed
      setConciseNotes(null);
      conciseFetchedRef.current = false;
    } catch (err) {
      alert(`Could not ${newMerged ? 'merge' : 'remove'} video notes: ${err.message}`);
    } finally {
      setMerging(null);
    }
  }

  async function handleDownload({ dlMode, selectedTopicIndices, includeKeyTerms, format }) {
    // Pick the right notes source
    const sourceNotes = dlMode === 'concise' && conciseNotes ? conciseNotes : liveNotes;
    // Build filtered notes
    const filteredNotes = {
      ...sourceNotes,
      topics: (sourceNotes.topics || []).filter((_, i) => selectedTopicIndices.includes(i)),
      keyTerms: includeKeyTerms ? (sourceNotes.keyTerms || []) : [],
      videoSources: [],
    };
    const label = `${sourceNotes.title || 'notes'}${dlMode === 'concise' ? '-concise' : ''}`;
    if (format === 'md') {
      const blob = new Blob([buildMarkdown(filteredNotes)], { type: 'text/markdown' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${label}.md` });
      a.click(); URL.revokeObjectURL(a.href);
    } else {
      setDocxLoading(true);
      try {
        const blob = await generateDocx(filteredNotes);
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${label}.docx` });
        a.click(); URL.revokeObjectURL(a.href);
      } finally { setDocxLoading(false); }
    }
  }

  async function handleIngestFiles(files) {
    const res = await submitFiles(files, `/api/notes/${noteId}/ingest`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    setLiveNotes(data.notes);
    setVideoSources(data.notes.videoSources || []);
    setConciseNotes(null);
    conciseFetchedRef.current = false;
  }

  async function handleIngestYouTube(url) {
    const res = await apiFetch('/api/youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, noteId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    const newSources = data.notes?.videoSources || [];
    setVideoSources(newSources);
    // Switch sidebar to the newly added video
    const newestVideo = newSources[newSources.length - 1];
    if (newestVideo) setSelected({ type: 'video', videoId: newestVideo.videoId, label: newestVideo.title });
  }

  async function loadSourceFiles() {
    if (!noteId || sourceFiles !== null) return;
    setSourceFilesLoading(true);
    try {
      const res = await apiFetch(`/api/notes/${noteId}/source-files`);
      const data = await res.json();
      setSourceFiles(res.ok ? (data.files || []) : []);
    } catch { setSourceFiles([]); }
    finally { setSourceFilesLoading(false); }
  }

  async function handleDeleteSourceFile(fileId) {
    const res = await apiFetch(`/api/notes/${noteId}/source-files`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });
    if (res.ok) setSourceFiles(prev => prev.filter(f => f.id !== fileId));
  }

  async function handleViewSourceFile(storagePath) {
    const res = await apiFetch(`/api/notes/${noteId}/source-files?action=signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath }),
    });
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
  }

  if (!initialNotes) return null;

  // Rebuild sidebar every render (accounts for mode switch)
  const currentSidebarItems = [
    ...(activeNotes.topics || []).map((t, i) => ({ type: 'topic', index: i, label: t.name })),
    ...(activeNotes.keyTerms?.length ? [{ type: 'terms', label: 'Key Terms' }] : []),
    ...videoSources.map(v => ({ type: 'video', videoId: v.videoId, label: v.title })),
    ...(sourceFiles?.length > 0 ? [{ type: 'sources', label: 'Source Files' }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={fromSubject ? onBackToSubject : onBack}
          className="flex items-center gap-1.5 text-sm font-600 text-ink-400 hover:text-ink-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{fromSubject ? fromSubject.title : 'Dashboard'}</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDownloadModalOpen(true)}
            className="flex items-center gap-1.5 bg-ink-100 hover:bg-ink-200 text-ink-700 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          {downloadModalOpen && (
            <DownloadModal
              notes={liveNotes}
              conciseNotes={conciseNotes}
              docxLoading={docxLoading}
              onDownload={async (opts) => { await handleDownload(opts); setDownloadModalOpen(false); }}
              onClose={() => setDownloadModalOpen(false)}
            />
          )}
          {addSourceOpen && (
            <AddSourceModal
              onIngestFiles={handleIngestFiles}
              onIngestYouTube={handleIngestYouTube}
              onClose={() => setAddSourceOpen(false)}
            />
          )}
          {noteId && onQuiz && (
            <button onClick={onQuiz} className="flex items-center gap-1.5 bg-ink-900 hover:bg-brand-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
              <Zap className="w-3.5 h-3.5" /> Quiz me!
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-800 text-ink-900 leading-tight">{initialNotes.title || 'Study Notes'}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {conciseError && <span className="text-xs text-red-500">Failed — try again</span>}
          {noteId && (
            <ModeToggle mode={mode} loading={conciseLoading} onToggle={handleToggleConcise} />
          )}
        </div>
      </div>

      {mode === 'concise' && conciseLoading ? (
        <ConciseLoadingState onSwitchBack={() => setMode('standard')} />
      ) : (
        <>
        {/* ── Mobile topic menu overlay ── */}
        {topicMenuOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setTopicMenuOpen(false)}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div className="relative bg-ink-50 rounded-t-2xl border-t-2 border-ink-900 pb-8 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-100">
                  <p className="text-sm font-700 text-ink-900">Topics</p>
                  <button onClick={() => setTopicMenuOpen(false)} className="p-1.5 hover:bg-ink-100 rounded-lg text-ink-400"><X className="w-4 h-4" /></button>
                </div>
                <ul className="px-3 pt-2 space-y-1">
                  {currentSidebarItems.map((item, i) => {
                    const isSelected = selected?.type === item.type &&
                      (item.type === 'topic' ? selected.index === item.index :
                       item.type === 'video' ? selected.videoId === item.videoId : true);
                    return (
                      <li key={i}>
                        <button
                          onClick={() => { setSelected(item); setTopicMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-500 text-left transition-colors ${
                            isSelected ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'
                          }`}
                        >
                          {item.type === 'video' && <Youtube className="w-4 h-4 flex-shrink-0" />}
                          {item.type === 'terms' && <Hash className="w-4 h-4 flex-shrink-0" />}
                          {item.type === 'topic' && <span className={`w-5 h-5 rounded-full text-[11px] font-700 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-ink-200'}`}>{item.index + 1}</span>}
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

        <div className="flex gap-6 items-start">

          {/* ── Sidebar ── */}
          <aside className="hidden sm:flex flex-col w-48 flex-shrink-0 sticky top-20">
            {noteId && (
              <button
                onClick={() => setAddSourceOpen(true)}
                className="flex items-center justify-center gap-1.5 w-full mb-3 px-3 py-2 rounded-xl border-2 border-dashed border-ink-200 text-ink-400 hover:border-brand-400 hover:text-brand-600 text-xs font-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add source
              </button>
            )}
            <nav className="flex flex-col gap-0.5">
              {currentSidebarItems.map((item, i) => {
                const isSelected = selected?.type === item.type &&
                  (item.type === 'topic' ? selected.index === item.index :
                   item.type === 'video' ? selected.videoId === item.videoId : true);
                const isMergedVideo = item.type === 'video' && videoSources.find(v => v.videoId === item.videoId)?.merged;

                const prevItem = currentSidebarItems[i - 1];
                const showDivider = i > 0 && item.type !== prevItem?.type;

                return (
                  <div key={i}>
                    {showDivider && <div className="my-1.5 border-t border-ink-100" />}
                    <button onClick={() => { setSelected(item); if (item.type === 'sources') loadSourceFiles(); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150 outline-none ${
                        isSelected
                          ? 'bg-ink-900/10'
                          : item.type === 'video'
                          ? 'text-red-700 hover:text-red-800 bg-red-100 hover:bg-red-200/70'
                          : item.type === 'terms'
                          ? 'text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200/70'
                          : 'text-ink-500 hover:text-ink-800 hover:bg-ink-100'
                      }`}
                    >
                      {item.type === 'topic' && (
                        <span className={`w-4 h-4 rounded text-[9px] font-700 flex items-center justify-center flex-shrink-0 tabular-nums ${
                          isSelected ? 'text-ink-700' : 'text-ink-400'
                        }`}>
                          {item.index + 1}
                        </span>
                      )}
                      {item.type === 'terms' && (
                        <Hash className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                      )}
                      {item.type === 'sources' && (
                        <FileText className="w-3.5 h-3.5 flex-shrink-0 text-ink-400" />
                      )}
                      {item.type === 'video' && (
                        <Youtube className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                      )}
                      <span className={`text-xs line-clamp-2 flex-1 leading-snug ${isSelected ? 'font-600 text-ink-800' : 'font-500'}`}>{item.label}</span>
                      {isMergedVideo && (
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-green-400" title="Included in notes" />
                      )}
                    </button>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* ── Content pane ── */}
          <div className="flex-1 min-w-0">
            {selected?.type === 'topic' && (
              <TopicPane topic={activeNotes.topics[selected.index]} mode={mode} onOpenMenu={() => setTopicMenuOpen(true)} />
            )}
            {selected?.type === 'terms' && (
              <TermsPane keyTerms={activeNotes.keyTerms} />
            )}
            {selected?.type === 'video' && (
              <VideoPane
                source={videoSources.find(v => v.videoId === selected.videoId)}
                onToggleMerge={handleToggleVideoMerge}
                merging={merging === selected.videoId}
              />
            )}
            {selected?.type === 'sources' && (
              <SourceFilesPane
                files={sourceFiles}
                loading={sourceFilesLoading}
                onView={handleViewSourceFile}
                onDelete={handleDeleteSourceFile}
              />
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}

// ── Formula-aware point renderer ─────────────────────────────────────────────

// Detects formula-like substrings (e.g. "Assets = Liabilities + Owner's Equity")
// and renders them in a styled monospace chip, inline with any surrounding prose.
// A string only counts as a formula if, beyond the '=', it contains actual maths:
// an operator (+ − × ÷ / %) or digits. This stops definitional sentences like
// "Household sector = consumers who hold resources" from being chipped.
function looksLikeFormula(s) {
  if (!s.includes('=')) return false;
  if (!/[+\-–−×÷*/%]|\d/.test(s.replace(/=/g, ''))) return false;
  // Reject prose: connective words signal a sentence, not an equation
  if (/\b(who|which|that|where|when|the|a|an|are|is|and|refers|means|defined|describes|used|allows|helps)\b/i.test(s)) return false;
  return true;
}

function renderPoint(text) {
  // Split on ": " — prose intro before the colon, formula after
  const colonIdx = text.indexOf(': ');
  if (colonIdx !== -1) {
    const intro = text.slice(0, colonIdx + 2);
    const rest = text.slice(colonIdx + 2).trimEnd().replace(/\.$/, '');
    if (looksLikeFormula(rest) && rest.length < 120) {
      return (
        <span>
          {intro}
          <span className="inline-block mt-1 font-mono text-[0.78rem] bg-brand-50 text-brand-700 border border-brand-200 rounded-lg px-2.5 py-1 leading-snug">
            {rest}
          </span>
        </span>
      );
    }
  }
  // No colon pattern — check if the whole point is a short formula
  if (looksLikeFormula(text) && text.length < 100 && !/[.]{2,}/.test(text)) {
    const clean = text.trimEnd().replace(/\.$/, '');
    return (
      <span className="inline-block font-mono text-[0.78rem] bg-brand-50 text-brand-700 border border-brand-200 rounded-lg px-2.5 py-1 leading-snug">
        {clean}
      </span>
    );
  }
  return text;
}

// ── Topic pane ────────────────────────────────────────────────────────────────

function TopicPane({ topic, mode, onOpenMenu }) {
  const [openSubs, setOpenSubs] = useState({});

  // Default all subtopics open
  useEffect(() => {
    setOpenSubs(Object.fromEntries((topic?.subtopics || []).map((_, i) => [i, true])));
  }, [topic, mode]);

  if (!topic) return null;

  return (
    <div className="space-y-2">
      <div
        className="bg-white rounded-2xl border border-ink-200 px-5 py-4 mb-3 sm:cursor-default cursor-pointer sm:pointer-events-none"
        onClick={onOpenMenu}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-700 text-ink-900 text-lg leading-tight">{topic.name}</h2>
          <div className="sm:hidden flex items-center gap-1.5 flex-shrink-0 text-ink-400">
            <Menu className="w-4 h-4" />
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
      {topic.subtopics?.map((sub, si) => {
        const isOpen = openSubs[si] !== false;
        return (
          <div key={si} className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
            <button onClick={() => setOpenSubs(p => ({ ...p, [si]: !p[si] }))}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-ink-50 transition-colors">
              <span className="w-1 h-4 rounded-full bg-brand-500 flex-shrink-0" />
              <span className="text-sm font-600 text-ink-800 flex-1">{sub.name}</span>
              {isOpen ? <ChevronDown className="w-4 h-4 text-ink-400" /> : <ChevronRight className="w-4 h-4 text-ink-400" />}
            </button>
            {isOpen && (
              <ul className="px-5 pb-4 space-y-2 border-t border-ink-100 pt-3">
                {sub.points?.map((pt, pi) => (
                  <li key={pi} className="flex items-start gap-2.5 text-sm text-ink-600 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-[7px] flex-shrink-0" />
                    {renderPoint(pt)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Terms pane ────────────────────────────────────────────────────────────────

function TermsPane({ keyTerms }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100">
        <span className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
          <Hash className="w-3.5 h-3.5 text-white" />
        </span>
        <span className="font-700 text-ink-900 text-base">Key Terms</span>
        <span className="text-xs text-ink-400 ml-auto">{keyTerms?.length} terms</span>
      </div>
      <dl className="divide-y divide-ink-100">
        {keyTerms?.map((item, i) => (
          <div key={i} className="flex gap-4 px-5 py-3.5 flex-col sm:flex-row">
            <dt className="text-sm font-600 text-brand-600 sm:w-40 sm:flex-shrink-0">{item.term}</dt>
            <dd className="text-sm text-ink-600 leading-relaxed">{renderPoint(item.definition)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── Video pane ────────────────────────────────────────────────────────────────

function VideoPane({ source, onToggleMerge, merging }) {
  const [openSections, setOpenSections] = useState({});
  const iframeRef = useRef(null);

  if (!source) return null;

  function seekTo(seconds) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }), '*'
    );
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*'
    );
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  return (
    <div className="space-y-3">
      {/* Video embed */}
      <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-ink-100">
          <span className="w-6 h-6 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
            <Youtube className="w-3.5 h-3.5 text-white" />
          </span>
          <span className="font-600 text-ink-800 flex-1 text-[15px] line-clamp-1">{source.title}</span>
        </div>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe ref={iframeRef}
            src={`https://www.youtube.com/embed/${source.videoId}?enablejsapi=1`}
            title={source.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>

      {/* Merge toggle */}
      <div className="bg-white rounded-2xl border border-ink-200 px-5 py-4 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-600 text-ink-800">Include notes in subject</p>
          <p className="text-xs text-ink-400 mt-0.5">
            {merging
              ? source.merged ? 'Removing video notes…' : 'Integrating video notes into your topics… this may take 20–30 seconds'
              : source.merged
              ? 'Video notes are integrated into your study topics'
              : 'Toggle on to merge this video\'s notes into your subject content'}
          </p>
        </div>
        {merging ? (
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin flex-shrink-0" />
        ) : (
          <button
            onClick={() => onToggleMerge(source.videoId, !source.merged)}
            className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 outline-none focus:outline-none ${source.merged ? 'bg-green-500' : 'bg-ink-200'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${source.merged ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        )}
      </div>

      {/* Timecoded notes */}
      {source.notes?.length > 0 && (
        <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-ink-100">
            <p className="text-xs font-600 text-ink-500 uppercase tracking-wider">Video Notes — click a timecode to jump</p>
          </div>
          <div className="p-3 space-y-1">
            {source.notes.map((section, si) => {
              const isOpen = openSections[si] !== false;
              return (
                <div key={si} className="rounded-xl overflow-hidden">
                  <button onClick={() => setOpenSections(p => ({ ...p, [si]: !isOpen }))}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-ink-50 rounded-xl transition-colors">
                    <span className={`text-[7px] text-ink-400 transition-transform duration-150 leading-none flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                      style={{ display: 'inline-block' }}>▶</span>
                    <button onClick={e => { e.stopPropagation(); seekTo(section.timecode); }}
                      className="flex-shrink-0 text-xs font-700 text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md transition-colors tabular-nums">
                      {formatTime(section.timecode)}
                    </button>
                    <span className="text-sm font-600 text-ink-700 flex-1">{section.heading}</span>
                  </button>
                  {isOpen && section.points?.length > 0 && (
                    <ul className="pl-10 pr-3 pb-2 space-y-1.5">
                      {section.points.map((pt, pi) => (
                        <li key={pi} className="flex items-start gap-2 text-sm text-ink-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-300 mt-[7px] flex-shrink-0" />
                          {renderPoint(pt)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Download modal ────────────────────────────────────────────────────────────

function DownloadModal({ notes, conciseNotes, docxLoading, onDownload, onClose }) {
  const [dlMode, setDlMode] = useState('standard');
  const [format, setFormat] = useState('docx');
  const topicCount = notes?.topics?.length || 0;
  const hasKeyTerms = (notes?.keyTerms?.length || 0) > 0;
  const [selectedTopics, setSelectedTopics] = useState(() => new Set(Array.from({ length: topicCount }, (_, i) => i)));
  const [includeKeyTerms, setIncludeKeyTerms] = useState(true);

  const allTopicsSelected = selectedTopics.size === topicCount;
  const noneSelected = selectedTopics.size === 0 && !includeKeyTerms;

  function toggleTopic(i) {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function toggleAll() {
    if (allTopicsSelected && includeKeyTerms) {
      setSelectedTopics(new Set());
      setIncludeKeyTerms(false);
    } else {
      setSelectedTopics(new Set(Array.from({ length: topicCount }, (_, i) => i)));
      setIncludeKeyTerms(true);
    }
  }

  // Close on backdrop click
  function onBackdrop(e) { if (e.target === e.currentTarget) onClose(); }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onBackdrop}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-ink-500" />
            <span className="font-700 text-ink-900 text-base">Download notes</span>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors text-lg leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Version */}
          <div>
            <p className="text-xs font-600 text-ink-400 uppercase tracking-wider mb-2">Version</p>
            <div className="flex gap-2">
              {[
                { val: 'standard', label: 'Standard', sub: 'Full notes' },
                { val: 'concise',  label: 'Concise',  sub: conciseNotes ? 'Ready' : 'Not yet generated', disabled: !conciseNotes },
              ].map(opt => (
                <button key={opt.val} onClick={() => !opt.disabled && setDlMode(opt.val)} disabled={opt.disabled}
                  className={`flex-1 flex flex-col items-center py-2.5 px-3 rounded-xl border-2 text-sm transition-all ${
                    dlMode === opt.val ? 'border-ink-900 bg-ink-50' :
                    opt.disabled ? 'border-ink-100 text-ink-300 cursor-not-allowed' :
                    'border-ink-200 hover:border-ink-300'
                  }`}>
                  <span className="font-600 text-ink-800">{opt.label}</span>
                  <span className={`text-xs mt-0.5 ${opt.disabled ? 'text-ink-300' : 'text-ink-400'}`}>{opt.sub}</span>
                </button>
              ))}
            </div>
            {!conciseNotes && (
              <p className="text-xs text-ink-400 mt-1.5">Switch to Concise mode on the notes page first to enable this option.</p>
            )}
          </div>

          {/* Topics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-600 text-ink-400 uppercase tracking-wider">Content</p>
              <button onClick={toggleAll} className="text-xs font-600 text-brand-600 hover:text-brand-700 transition-colors">
                {allTopicsSelected && includeKeyTerms ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-0.5">
              {(notes?.topics || []).map((t, i) => (
                <label key={i} onClick={() => toggleTopic(i)}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-ink-50 cursor-pointer transition-colors group">
                  <Checkbox checked={selectedTopics.has(i)} />
                  <span className="text-xs text-ink-400 w-4 tabular-nums flex-shrink-0">{i + 1}</span>
                  <span className="text-sm text-ink-700 flex-1 leading-snug">{t.name}</span>
                </label>
              ))}
              {hasKeyTerms && (
                <label onClick={() => setIncludeKeyTerms(v => !v)}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-ink-50 cursor-pointer transition-colors group">
                  <Checkbox checked={includeKeyTerms} />
                  <Hash className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-sm text-ink-700 flex-1">Key Terms</span>
                </label>
              )}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-xs font-600 text-ink-400 uppercase tracking-wider mb-2">Format</p>
            <div className="flex gap-2">
              {[
                { val: 'docx', label: 'Word Document', sub: '.docx', icon: <FileDown className="w-4 h-4" /> },
                { val: 'md',   label: 'Markdown',      sub: '.md',   icon: <FileText className="w-4 h-4" /> },
              ].map(opt => (
                <button key={opt.val} onClick={() => setFormat(opt.val)}
                  className={`flex-1 flex items-center gap-2.5 py-2.5 px-3 rounded-xl border-2 text-sm transition-all ${
                    format === opt.val ? 'border-ink-900 bg-ink-50' : 'border-ink-200 hover:border-ink-300'
                  }`}>
                  <span className={format === opt.val ? 'text-ink-700' : 'text-ink-400'}>{opt.icon}</span>
                  <div className="text-left">
                    <p className="font-600 text-ink-800 text-xs">{opt.label}</p>
                    <p className="text-ink-400 text-xs">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={() => onDownload({ dlMode, selectedTopicIndices: [...selectedTopics], includeKeyTerms, format })}
            disabled={noneSelected || docxLoading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-600 transition-all ${
              noneSelected || docxLoading
                ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                : 'bg-ink-900 hover:bg-brand-600 text-white shadow-sm'
            }`}
          >
            {docxLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Building…</>
              : <><Download className="w-4 h-4" /> Download {format === 'docx' ? '.docx' : '.md'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function Checkbox({ checked }) {
  return (
    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
      checked ? 'bg-ink-900 border-ink-900' : 'border-ink-300 bg-white group-hover:border-ink-400'
    }`}>
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// ── Mode toggle ───────────────────────────────────────────────────────────────

function ModeToggle({ mode, loading, onToggle }) {
  return (
    <div className="flex items-center gap-1 bg-ink-100 rounded-xl p-1">
      <button onClick={() => mode !== 'standard' && onToggle()}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-all duration-200 ${mode === 'standard' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>
        Standard
      </button>
      <button onClick={() => mode !== 'concise' && onToggle()}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-all duration-200 ${mode === 'concise' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>
        {loading ? <><span className="w-3 h-3 border-[1.5px] border-brand-500 border-t-transparent rounded-full animate-spin" />Concise</> : <><Layers className="w-3 h-3" />Concise</>}
      </button>
    </div>
  );
}

// ── Concise loading skeleton ──────────────────────────────────────────────────

function ConciseLoadingState({ onSwitchBack }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <p className="text-sm text-ink-500">
          Generating concise notes…
          <button onClick={onSwitchBack} className="ml-2 text-brand-600 hover:underline font-medium">View Standard notes</button>
        </p>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-ink-200 p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-lg bg-ink-200" />
            <div className="h-4 bg-ink-200 rounded w-1/3" />
          </div>
          <div className="space-y-2 pl-9">
            <div className="h-3 bg-ink-100 rounded w-full" />
            <div className="h-3 bg-ink-100 rounded w-5/6" />
            <div className="h-3 bg-ink-100 rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Add Source modal ──────────────────────────────────────────────────────────

function AddSourceModal({ onIngestFiles, onIngestYouTube, onClose }) {
  const [tab, setTab] = useState('files');
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const valid = Array.from(incoming).filter(f => Object.keys(ACCEPTED).includes(f.type));
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))];
    });
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files);
  }, [addFiles]);

  async function handleSubmitFiles() {
    if (!files.length) return;
    setLoading(true); setError(null);
    try {
      await onIngestFiles(files);
      setDone(true);
      setTimeout(onClose, 800);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleSubmitYouTube() {
    if (!url.trim()) return;
    setLoading(true); setError(null);
    try {
      await onIngestYouTube(url.trim());
      setDone(true);
      setTimeout(onClose, 800);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function onBackdrop(e) { if (e.target === e.currentTarget && !loading) onClose(); }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onBackdrop}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-ink-500" />
            <span className="font-700 text-ink-900 text-base">Add source</span>
          </div>
          {!loading && (
            <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors text-lg leading-none">✕</button>
          )}
        </div>

        {loading ? (
          /* Processing state */
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center shadow-md">
              {done
                ? <CheckCircle className="w-6 h-6 text-green-400" />
                : <Loader2 className="w-6 h-6 text-white animate-spin" />
              }
            </div>
            <div>
              <p className="font-700 text-ink-900 text-sm">
                {done
                  ? tab === 'files' ? 'Notes updated!' : 'Video added!'
                  : tab === 'files' ? 'Merging into your notes…' : 'Processing video…'
                }
              </p>
              <p className="text-xs text-ink-400 mt-1">
                {done ? 'Done — closing…' : tab === 'files' ? 'This may take 20–40 seconds' : 'Extracting transcript and building timecoded notes…'}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5">
            {/* Tabs */}
            <div className="flex gap-1 bg-ink-100 rounded-xl p-1 mb-4">
              {[
                { id: 'files', label: 'Files', icon: <ArrowUp className="w-3.5 h-3.5" /> },
                { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-3.5 h-3.5" /> },
              ].map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-600 transition-all duration-200 ${
                    tab === t.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
                  }`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {tab === 'files' ? (
              <>
                {/* Drop zone */}
                <div
                  onDrop={onDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => inputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200
                    ${dragging ? 'border-brand-500 bg-brand-50 scale-[1.01]' : 'border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50/40'}`}
                >
                  <input ref={inputRef} type="file" multiple accept={ACCEPTED_EXTS} className="hidden"
                    onChange={e => addFiles(e.target.files)} />
                  <div className={`w-7 h-7 rounded-lg mx-auto mb-2 flex items-center justify-center transition-colors ${dragging ? 'bg-brand-500' : 'bg-ink-100'}`}>
                    <ArrowUp className={`w-3.5 h-3.5 ${dragging ? 'text-white' : 'text-ink-500'}`} />
                  </div>
                  <p className="font-600 text-ink-700 text-sm mb-0.5">{dragging ? 'Drop to add' : 'Drag & drop or tap to browse'}</p>
                  <p className="text-ink-400 text-xs">PDF · JPG · PNG · WEBP</p>
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {files.map(f => (
                      <li key={f.name} className="flex items-center gap-3 bg-white border border-ink-200 rounded-xl px-3 py-2.5 shadow-sm">
                        {f.type === 'application/pdf'
                          ? <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                          : <Image className="w-4 h-4 text-brand-500 flex-shrink-0" />
                        }
                        <span className="text-sm text-ink-700 flex-1 truncate">{f.name}</span>
                        <button onClick={() => setFiles(p => p.filter(x => x.name !== f.name))}
                          className="text-ink-300 hover:text-red-400 transition-colors p-0.5 rounded flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {error && (
                  <div className="mt-3 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <button onClick={handleSubmitFiles} disabled={!files.length}
                  className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-600 text-sm transition-all duration-200
                    ${files.length ? 'bg-ink-900 hover:bg-brand-600 shadow-sm' : 'bg-ink-200 text-ink-400 cursor-not-allowed'}`}>
                  <Plus className="w-4 h-4" /> Merge into notes
                </button>
                <p className="text-xs text-ink-400 text-center mt-2">New content will be merged into your existing topics</p>
              </>
            ) : (
              <>
                <div className={`flex items-center gap-2 bg-white border-2 rounded-2xl px-4 transition-colors ${url ? 'border-brand-400' : 'border-ink-200'}`}>
                  <Link className="w-4 h-4 text-ink-400 flex-shrink-0" />
                  <input
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitYouTube()}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 py-3.5 bg-transparent text-sm text-ink-800 placeholder-ink-400 focus:outline-none"
                  />
                  {url && (
                    <button onClick={() => setUrl('')} className="text-ink-300 hover:text-ink-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {error && (
                  <div className="mt-3 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <button onClick={handleSubmitYouTube} disabled={!url.trim()}
                  className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-600 text-sm transition-all duration-200
                    ${url.trim() ? 'bg-red-500 hover:bg-red-600 shadow-sm' : 'bg-ink-200 text-ink-400 cursor-not-allowed'}`}>
                  <Youtube className="w-4 h-4" /> Add video to topic
                </button>
                <p className="text-xs text-ink-400 text-center mt-2">Video appears in the sidebar — you choose when to merge its notes</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Markdown builder ──────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function daysRemaining(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const FREE_STORAGE_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB

function SourceFilesPane({ files, loading, onView, onDelete }) {
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const totalBytes = (files || []).reduce((sum, f) => sum + (f.file_size || 0), 0);

  async function handleDelete(f) {
    setDeleting(f.id);
    await onDelete(f.id);
    setDeleting(null);
  }

  async function handleView(f) {
    setViewing(f.id);
    await onView(f.storage_path);
    setViewing(null);
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl border border-ink-200 px-5 py-4 mb-3">
        <h2 className="font-700 text-ink-900 text-lg leading-tight">Source Files</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-ink-400" />
        </div>
      ) : !files?.length ? (
        <div className="bg-white rounded-2xl border border-ink-200 px-5 py-12 text-center">
          <FileText className="w-8 h-8 text-ink-300 mx-auto mb-2" />
          <p className="text-sm font-600 text-ink-500">No source files stored</p>
          <p className="text-xs text-ink-400 mt-1">Files from new uploads will appear here</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {files.map(f => {
              const days = daysRemaining(f.expires_at);
              const expiring = days !== null && days <= 2;
              return (
                <li key={f.id} className="bg-white border border-ink-200 rounded-2xl px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-600 text-ink-800 truncate">{f.file_name}</p>
                        <span className="text-xs text-ink-400 flex-shrink-0">{formatBytes(f.file_size)}</span>
                      </div>
                      {days !== null && (
                        <span className={`text-xs font-500 ${expiring ? 'text-red-500' : 'text-ink-400'}`}>
                          {days === 0 ? 'Expires today' : `${days}d left`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleView(f)}
                        disabled={viewing === f.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-600 bg-ink-100 hover:bg-ink-200 text-ink-700 transition-colors disabled:opacity-50"
                      >
                        {viewing === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        disabled={deleting === f.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-600 bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                      >
                        {deleting === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2 mt-4 px-1">
            <HardDrive className="w-3.5 h-3.5 text-ink-400" />
            <p className="text-xs text-ink-400">{formatBytes(FREE_STORAGE_LIMIT - totalBytes)} of {formatBytes(FREE_STORAGE_LIMIT)} remaining · Files auto-delete after 7 days</p>
            <span className="ml-1 text-xs font-600 text-accent-teal underline cursor-pointer flex-shrink-0">Upgrade storage</span>
          </div>
        </>
      )}
    </div>
  );
}

function SourceFilesModal({ files, loading, onView, onDelete, onClose }) {
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const totalBytes = (files || []).reduce((sum, f) => sum + (f.file_size || 0), 0);

  async function handleDelete(f) {
    setDeleting(f.id);
    await onDelete(f.id);
    setDeleting(null);
  }

  async function handleView(f) {
    setViewing(f.id);
    await onView(f.storage_path);
    setViewing(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-ink-50 rounded-2xl border border-ink-200 shadow-hard w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-ink-500" />
            <p className="text-sm font-700 text-ink-900">Source Files</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-ink-400" />
            </div>
          ) : !files?.length ? (
            <div className="text-center py-10">
              <FileText className="w-8 h-8 text-ink-300 mx-auto mb-2" />
              <p className="text-sm text-ink-400">No source files stored</p>
              <p className="text-xs text-ink-300 mt-1">Files from new uploads will appear here</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {files.map(f => {
                const days = daysRemaining(f.expires_at);
                const expiring = days !== null && days <= 2;
                return (
                  <li key={f.id} className="bg-white border border-ink-200 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-600 text-ink-800 truncate">{f.file_name}</p>
                          <span className="text-xs text-ink-400 flex-shrink-0">{formatBytes(f.file_size)}</span>
                        </div>
                        {days !== null && (
                          <span className={`text-xs font-500 ${expiring ? 'text-red-500' : 'text-ink-400'}`}>
                            {days === 0 ? 'Expires today' : `${days}d left`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleView(f)}
                          disabled={viewing === f.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-600 bg-ink-100 hover:bg-ink-200 text-ink-700 transition-colors disabled:opacity-50"
                        >
                          {viewing === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(f)}
                          disabled={deleting === f.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-600 bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                        >
                          {deleting === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer: storage usage */}
        {files?.length > 0 && (
          <div className="px-5 py-3 border-t border-ink-100 flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-ink-400" />
            <p className="text-xs text-ink-400">{formatBytes(FREE_STORAGE_LIMIT - totalBytes)} of {formatBytes(FREE_STORAGE_LIMIT)} remaining · Files auto-delete after 7 days</p>
            <span className="ml-1 text-xs font-600 text-accent-teal underline cursor-pointer flex-shrink-0">Upgrade storage</span>
          </div>
        )}
      </div>
    </div>
  );
}

function buildMarkdown(notes) {
  const lines = [`# ${notes.title || 'Study Notes'}`, ''];
  for (const t of notes.topics || []) {
    lines.push(`## ${t.name}`, '');
    for (const s of t.subtopics || []) {
      lines.push(`### ${s.name}`, '');
      for (const p of s.points || []) lines.push(`- ${p}`);
      lines.push('');
    }
  }
  if (notes.keyTerms?.length) {
    lines.push('## Key Terms', '');
    for (const { term, definition } of notes.keyTerms) lines.push(`**${term}**: ${definition}`, '');
  }
  return lines.join('\n');
}
