import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Download, BookOpen, Hash, FileText, Zap, Layers, Youtube, GitMerge, CheckCircle, Loader2 } from 'lucide-react';
import { generateDocx } from '../utils/generateDocx.js';

export default function NotesPage({ notes: initialNotes, noteId, onBack, onQuiz }) {
  const [mode, setMode] = useState('standard'); // 'standard' | 'concise'
  const [conciseNotes, setConciseNotes] = useState(null);
  const [conciseLoading, setConciseLoading] = useState(false);
  const [conciseError, setConciseError] = useState(null);
  const conciseFetchedRef = useRef(false);

  const activeNotes = mode === 'concise' && conciseNotes ? conciseNotes : initialNotes;

  const [openTopics, setOpenTopics] = useState({});
  const [openSubtopics, setOpenSubtopics] = useState({});
  const [showTerms, setShowTerms] = useState(true);
  const [docxLoading, setDocxLoading] = useState(false);

  // Reset open state whenever active notes change
  useEffect(() => {
    setOpenTopics(Object.fromEntries((activeNotes?.topics || []).map((_, i) => [i, true])));
    setOpenSubtopics({});
    setShowTerms(true);
  }, [mode, conciseNotes]);

  function toggleTopic(i) { setOpenTopics(p => ({ ...p, [i]: !p[i] })); }
  function toggleSub(key) { setOpenSubtopics(p => ({ ...p, [key]: p[key] === false ? true : false })); }

  async function handleToggleConcise() {
    if (mode === 'concise') {
      setMode('standard');
      return;
    }
    // Switch to concise
    setMode('concise');
    if (conciseNotes || conciseFetchedRef.current) return; // already have them or fetching

    conciseFetchedRef.current = true;
    setConciseLoading(true);
    setConciseError(null);
    try {
      const res = await fetch(`/api/notes/${noteId}/concise`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate concise notes');
      }
      const data = await res.json();
      setConciseNotes(data.conciseNotes);
    } catch (err) {
      setConciseError(err.message);
      conciseFetchedRef.current = false; // allow retry
    } finally {
      setConciseLoading(false);
    }
  }

  function handleDownloadMd() {
    const blob = new Blob([buildMarkdown(activeNotes)], { type: 'text/markdown' });
    const label = mode === 'concise' ? `${activeNotes.title || 'study-notes'}-concise` : (activeNotes.title || 'study-notes');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${label}.md`
    });
    a.click(); URL.revokeObjectURL(a.href);
  }

  async function handleDownloadDocx() {
    setDocxLoading(true);
    try {
      const blob = await generateDocx(activeNotes);
      const label = mode === 'concise' ? `${activeNotes.title || 'study-notes'}-concise` : (activeNotes.title || 'study-notes');
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `${label}.docx`
      });
      a.click(); URL.revokeObjectURL(a.href);
    } finally {
      setDocxLoading(false);
    }
  }

  if (!initialNotes) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-ink-400 hover:text-ink-800 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadMd}
            className="flex items-center gap-1.5 bg-ink-100 hover:bg-ink-200 text-ink-700 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
            <Download className="w-3.5 h-3.5" /> .md
          </button>
          <button onClick={handleDownloadDocx} disabled={docxLoading}
            className="flex items-center gap-1.5 bg-ink-100 hover:bg-ink-200 text-ink-700 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
            <FileText className="w-3.5 h-3.5" />
            {docxLoading ? 'Building…' : '.docx'}
          </button>
          {noteId && onQuiz && (
            <button onClick={onQuiz}
              className="flex items-center gap-1.5 bg-ink-900 hover:bg-brand-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
              <Zap className="w-3.5 h-3.5" /> Quiz
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <p className="flex items-center gap-1.5 text-brand-600 text-xs font-600 uppercase tracking-wider mb-2">
          <BookOpen className="w-3.5 h-3.5" /> Study Notes
        </p>
        <h1 className="text-2xl sm:text-3xl font-800 text-ink-900 leading-tight">{initialNotes.title || 'Study Notes'}</h1>
        <p className="text-ink-400 text-sm mt-1.5">
          {activeNotes.topics?.length || 0} topics · {activeNotes.topics?.reduce((a, t) => a + (t.subtopics?.length || 0), 0) || 0} subtopics
          {activeNotes.keyTerms?.length > 0 && ` · ${activeNotes.keyTerms.length} key terms`}
        </p>
      </div>

      {/* Standard / Concise Toggle */}
      {noteId && (
        <div className="flex items-center gap-3 mb-8">
          <ModeToggle mode={mode} loading={conciseLoading} onToggle={handleToggleConcise} />
          {conciseError && (
            <span className="text-xs text-red-500">Failed to generate — try again</span>
          )}
        </div>
      )}

      {/* Content */}
      {mode === 'concise' && conciseLoading ? (
        <ConciseLoadingState onSwitchBack={() => setMode('standard')} />
      ) : (
        <>
          {/* Topics */}
          <div className="space-y-2.5">
            {activeNotes.topics?.map((topic, ti) => (
              <div key={`${mode}-${ti}`} className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
                <button onClick={() => toggleTopic(ti)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-ink-50 transition-colors">
                  <span className="w-6 h-6 rounded-lg bg-ink-900 text-white text-xs font-700 flex items-center justify-center flex-shrink-0">
                    {ti + 1}
                  </span>
                  <span className="font-600 text-ink-800 flex-1 text-[15px]">{topic.name}</span>
                  {openTopics[ti] ? <ChevronDown className="w-4 h-4 text-ink-400" /> : <ChevronRight className="w-4 h-4 text-ink-400" />}
                </button>

                {openTopics[ti] && (
                  <div className="border-t border-ink-100 px-4 py-3 space-y-2">
                    {topic.subtopics?.map((sub, si) => {
                      const key = `${ti}-${si}`;
                      const isOpen = openSubtopics[key] !== false;
                      return (
                        <div key={si} className="rounded-xl bg-ink-50 overflow-hidden">
                          <button onClick={() => toggleSub(key)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-ink-100 transition-colors">
                            <span className="w-1 h-4 rounded-full bg-brand-500 flex-shrink-0" />
                            <span className="text-sm font-600 text-ink-700 flex-1">{sub.name}</span>
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-ink-400" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-400" />}
                          </button>
                          {isOpen && (
                            <ul className="px-4 pb-3 space-y-1.5">
                              {sub.points?.map((pt, pi) => (
                                <li key={pi} className="flex items-start gap-2 text-sm text-ink-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-[7px] flex-shrink-0" />
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Key Terms */}
          {activeNotes.keyTerms?.length > 0 && (
            <div className="mt-3 bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
              <button onClick={() => setShowTerms(v => !v)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-ink-50 transition-colors">
                <span className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
                  <Hash className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="font-600 text-ink-800 flex-1 text-[15px]">Key Terms</span>
                <span className="text-xs text-ink-400 mr-1">{activeNotes.keyTerms.length}</span>
                {showTerms ? <ChevronDown className="w-4 h-4 text-ink-400" /> : <ChevronRight className="w-4 h-4 text-ink-400" />}
              </button>
              {showTerms && (
                <div className="border-t border-ink-100 px-5 py-4">
                  <dl className="space-y-3">
                    {activeNotes.keyTerms.map((item, i) => (
                      <div key={i} className="flex gap-3 flex-col sm:flex-row">
                        <dt className="text-sm font-600 text-brand-600 sm:min-w-[140px] sm:flex-shrink-0">{item.term}</dt>
                        <dd className="text-sm text-ink-600">{item.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Video Sources */}
      {(initialNotes.videoSources?.length > 0) && (
        <div className="mt-3 space-y-3">
          {initialNotes.videoSources.map((vs) => (
            <VideoSourceBlock key={vs.videoId} source={vs} noteId={noteId} />
          ))}
        </div>
      )}

      <p className="text-center text-ink-300 text-xs mt-10">
        StudySynth · Always verify against your original materials
      </p>
    </div>
  );
}

// ── Toggle component ──────────────────────────────────────────────────────────

function ModeToggle({ mode, loading, onToggle }) {
  return (
    <div className="flex items-center gap-1 bg-ink-100 rounded-xl p-1">
      <button
        onClick={() => mode !== 'standard' && onToggle()}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-all duration-200 ${
          mode === 'standard'
            ? 'bg-white text-ink-900 shadow-sm'
            : 'text-ink-400 hover:text-ink-600'
        }`}
      >
        Standard
      </button>
      <button
        onClick={() => mode !== 'concise' && onToggle()}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-all duration-200 ${
          mode === 'concise'
            ? 'bg-white text-ink-900 shadow-sm'
            : 'text-ink-400 hover:text-ink-600'
        }`}
      >
        {loading ? (
          <>
            <span className="w-3 h-3 border-[1.5px] border-brand-500 border-t-transparent rounded-full animate-spin" />
            Concise
          </>
        ) : (
          <>
            <Layers className="w-3 h-3" />
            Concise
          </>
        )}
      </button>
    </div>
  );
}

// ── Loading skeleton while concise is generating ──────────────────────────────

function ConciseLoadingState({ onSwitchBack }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <p className="text-sm text-ink-500">
          Generating concise notes in the background…
          <button onClick={onSwitchBack} className="ml-2 text-brand-600 hover:underline font-medium">
            Switch back to Standard
          </button>
        </p>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-ink-200 shadow-sm p-5 animate-pulse">
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

// ── Markdown builder ──────────────────────────────────────────────────────────

// ── Video Source Block ────────────────────────────────────────────────────────

function VideoSourceBlock({ source: initialSource, noteId }) {
  const [notesOpen, setNotesOpen] = useState(true);
  const [openSections, setOpenSections] = useState({});
  const [source, setSource] = useState(initialSource);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState(null);
  const iframeRef = useRef(null);

  function toggleSection(i) {
    setOpenSections(p => ({ ...p, [i]: p[i] === false ? true : false }));
  }

  function seekTo(seconds) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }), '*'
    );
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*'
    );
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  async function handleMerge() {
    if (!noteId || merging) return;
    setMerging(true); setMergeError(null);
    try {
      const res = await fetch(`/api/notes/${noteId}/merge-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: source.videoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Merge failed');
      setSource(prev => ({ ...prev, merged: true }));
    } catch (err) {
      setMergeError(err.message);
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">

      {/* Title bar + merge button */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-ink-100">
        <span className="w-6 h-6 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
          <Youtube className="w-3.5 h-3.5 text-white" />
        </span>
        <span className="font-600 text-ink-800 flex-1 text-[15px] line-clamp-1 min-w-0">{source.title}</span>
        {noteId && (
          source.merged ? (
            <span className="flex items-center gap-1 text-xs font-600 text-green-600 bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
              <CheckCircle className="w-3 h-3" /> Merged
            </span>
          ) : (
            <button onClick={handleMerge} disabled={merging}
              className="flex items-center gap-1.5 text-xs font-600 text-ink-500 bg-ink-100 hover:bg-brand-100 hover:text-brand-700 px-2.5 py-1 rounded-full transition-colors flex-shrink-0 disabled:opacity-50">
              {merging ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3 h-3" />}
              {merging ? 'Merging…' : 'Merge into notes'}
            </button>
          )
        )}
      </div>

      {mergeError && <p className="px-5 py-2 text-xs text-red-500">{mergeError}</p>}

      {/* Embed — always visible */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${source.videoId}?enablejsapi=1`}
          title={source.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Collapsible notes panel */}
      {source.notes?.length > 0 && (
        <div className="border-t border-ink-100">
          {/* Panel header */}
          <button
            onClick={() => setNotesOpen(v => !v)}
            className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-ink-50 transition-colors"
          >
            {/* Filled triangle indicator */}
            <span className={`text-[8px] text-ink-400 transition-transform duration-150 leading-none ${notesOpen ? 'rotate-90' : ''}`}
              style={{ display: 'inline-block' }}>▶</span>
            <span className="text-xs font-600 text-ink-500 uppercase tracking-wider flex-1">
              Video Notes
            </span>
            <span className="text-xs text-ink-400">{source.notes.length} sections · click a timecode to jump</span>
          </button>

          {notesOpen && (
            <div className="px-4 pb-4 space-y-1">
              {source.notes.map((section, si) => {
                const isOpen = openSections[si] !== false;
                return (
                  <div key={si} className="rounded-xl overflow-hidden">
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(si)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-ink-50 rounded-xl transition-colors group"
                    >
                      <span className={`text-[7px] text-ink-400 transition-transform duration-150 leading-none flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                        style={{ display: 'inline-block' }}>▶</span>
                      <button
                        onClick={e => { e.stopPropagation(); seekTo(section.timecode); }}
                        className="flex-shrink-0 text-xs font-700 text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md transition-colors tabular-nums"
                      >
                        {formatTime(section.timecode)}
                      </button>
                      <span className="text-sm font-600 text-ink-700 flex-1">{section.heading}</span>
                    </button>

                    {/* Section points */}
                    {isOpen && section.points?.length > 0 && (
                      <ul className="pl-10 pr-3 pb-2 space-y-1.5">
                        {section.points.map((pt, pi) => (
                          <li key={pi} className="flex items-start gap-2 text-sm text-ink-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-300 mt-[7px] flex-shrink-0" />
                            {pt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
