import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Download, BookOpen, Hash, FileText, Zap, Layers, Youtube, CheckCircle, Loader2, FileDown } from 'lucide-react';
import { generateDocx } from '../utils/generateDocx.js';

export default function NotesPage({ notes: initialNotes, noteId, onBack, onQuiz }) {
  const [mode, setMode] = useState('standard');
  const [conciseNotes, setConciseNotes] = useState(null);
  const [conciseLoading, setConciseLoading] = useState(false);
  const [conciseError, setConciseError] = useState(null);
  const conciseFetchedRef = useRef(false);

  // videoSources with local merged state
  const [videoSources, setVideoSources] = useState(initialNotes.videoSources || []);

  const activeNotes = mode === 'concise' && conciseNotes ? conciseNotes : initialNotes;

  // Build sidebar items: topics + key terms + videos
  const sidebarItems = [
    ...(activeNotes.topics || []).map((t, i) => ({ type: 'topic', index: i, label: t.name })),
    ...(activeNotes.keyTerms?.length ? [{ type: 'terms', label: 'Key Terms' }] : []),
    ...videoSources.map(v => ({ type: 'video', videoId: v.videoId, label: v.title })),
  ];

  const [selected, setSelected] = useState(sidebarItems[0] ?? null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef(null);

  // When mode switches, reset selected to first item
  useEffect(() => {
    const items = [
      ...(activeNotes.topics || []).map((t, i) => ({ type: 'topic', index: i, label: t.name })),
      ...(activeNotes.keyTerms?.length ? [{ type: 'terms', label: 'Key Terms' }] : []),
      ...videoSources.map(v => ({ type: 'video', videoId: v.videoId, label: v.title })),
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
      const res = await fetch(`/api/notes/${noteId}/concise`, { method: 'POST' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const data = await res.json();
      setConciseNotes(data.conciseNotes);
    } catch (err) {
      setConciseError(err.message);
      conciseFetchedRef.current = false;
    } finally { setConciseLoading(false); }
  }

  async function handleToggleVideoMerge(videoId, newMerged) {
    setVideoSources(prev => prev.map(v => v.videoId === videoId ? { ...v, merged: newMerged } : v));
    // Persist to DB (best-effort, non-blocking)
    if (noteId) {
      try {
        await fetch(`/api/notes/${noteId}/video-merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, merged: newMerged }),
        });
      } catch { /* silent */ }
    }
  }

  function handleDownloadMd() {
    const blob = new Blob([buildMarkdown(activeNotes)], { type: 'text/markdown' });
    const label = mode === 'concise' ? `${activeNotes.title || 'notes'}-concise` : (activeNotes.title || 'notes');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${label}.md` });
    a.click(); URL.revokeObjectURL(a.href);
  }

  async function handleDownloadDocx() {
    setDocxLoading(true);
    try {
      const blob = await generateDocx(activeNotes);
      const label = mode === 'concise' ? `${activeNotes.title || 'notes'}-concise` : (activeNotes.title || 'notes');
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${label}.docx` });
      a.click(); URL.revokeObjectURL(a.href);
    } finally { setDocxLoading(false); }
  }

  if (!initialNotes) return null;

  // Rebuild sidebar every render (accounts for mode switch)
  const currentSidebarItems = [
    ...(activeNotes.topics || []).map((t, i) => ({ type: 'topic', index: i, label: t.name })),
    ...(activeNotes.keyTerms?.length ? [{ type: 'terms', label: 'Key Terms' }] : []),
    ...videoSources.map(v => ({ type: 'video', videoId: v.videoId, label: v.title })),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-ink-400 hover:text-ink-800 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <div className="flex items-center gap-2">
          {noteId && (
            <ModeToggle mode={mode} loading={conciseLoading} onToggle={handleToggleConcise} />
          )}
          {conciseError && <span className="text-xs text-red-500">Failed — try again</span>}
          <div className="relative" ref={downloadRef}>
            <button
              onClick={() => setDownloadOpen(o => !o)}
              className="flex items-center gap-1.5 bg-ink-100 hover:bg-ink-200 text-ink-700 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${downloadOpen ? 'rotate-180' : ''}`} />
            </button>
            {downloadOpen && (
              <DownloadMenu
                onMd={() => { handleDownloadMd(); setDownloadOpen(false); }}
                onDocx={() => { handleDownloadDocx(); setDownloadOpen(false); }}
                docxLoading={docxLoading}
                onClose={() => setDownloadOpen(false)}
              />
            )}
          </div>
          {noteId && onQuiz && (
            <button onClick={onQuiz} className="flex items-center gap-1.5 bg-ink-900 hover:bg-brand-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
              <Zap className="w-3.5 h-3.5" /> Quiz
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-800 text-ink-900 leading-tight">{initialNotes.title || 'Study Notes'}</h1>
        <p className="text-ink-400 text-sm mt-1">
          {activeNotes.topics?.length || 0} topics · {activeNotes.topics?.reduce((a, t) => a + (t.subtopics?.length || 0), 0) || 0} subtopics
          {activeNotes.keyTerms?.length > 0 && ` · ${activeNotes.keyTerms.length} key terms`}
          {videoSources.length > 0 && ` · ${videoSources.length} video${videoSources.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {mode === 'concise' && conciseLoading ? (
        <ConciseLoadingState onSwitchBack={() => setMode('standard')} />
      ) : (
        <>
        {/* ── Mobile nav (horizontal scroll) — full width above the flex area ── */}
        <div className="sm:hidden w-full mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {currentSidebarItems.map((item, i) => {
              const isSelected = selected?.type === item.type &&
                (item.type === 'topic' ? selected.index === item.index :
                 item.type === 'video' ? selected.videoId === item.videoId : true);
              return (
                <button key={i} onClick={() => setSelected(item)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-500 whitespace-nowrap flex-shrink-0 transition-colors ${
                    isSelected ? 'bg-ink-900 text-white' : 'bg-white border border-ink-100 text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {item.type === 'video' && <Youtube className="w-3 h-3" />}
                  {item.type === 'terms' && <Hash className="w-3 h-3" />}
                  {item.type === 'topic' && <span className="font-700">{item.index + 1}</span>}
                  <span className="max-w-[120px] truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* ── Sidebar ── */}
          <aside className="hidden sm:flex flex-col w-48 flex-shrink-0 sticky top-20">
            <nav className="flex flex-col gap-0.5">
              {currentSidebarItems.map((item, i) => {
                const isSelected = selected?.type === item.type &&
                  (item.type === 'topic' ? selected.index === item.index :
                   item.type === 'video' ? selected.videoId === item.videoId : true);
                const isMergedVideo = item.type === 'video' && videoSources.find(v => v.videoId === item.videoId)?.merged;

                // Divider before Key Terms and before first video
                const prevItem = currentSidebarItems[i - 1];
                const showDivider = i > 0 && item.type !== prevItem?.type;

                return (
                  <div key={i}>
                    {showDivider && <div className="my-1.5 border-t border-ink-100" />}
                    <button onClick={() => setSelected(item)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150 group ${
                        isSelected
                          ? 'bg-ink-900 text-white'
                          : 'text-ink-500 hover:text-ink-800 hover:bg-ink-100'
                      }`}
                    >
                      {item.type === 'topic' && (
                        <span className={`w-4 h-4 rounded text-[9px] font-700 flex items-center justify-center flex-shrink-0 tabular-nums ${
                          isSelected ? 'bg-white/15 text-white' : 'text-ink-400'
                        }`}>
                          {item.index + 1}
                        </span>
                      )}
                      {item.type === 'terms' && (
                        <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-amber-300' : 'text-amber-400'}`} />
                      )}
                      {item.type === 'video' && (
                        <Youtube className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-red-300' : 'text-red-400'}`} />
                      )}
                      <span className="text-xs font-500 line-clamp-2 flex-1 leading-snug">{item.label}</span>
                      {isMergedVideo && (
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-green-400' : 'bg-green-400'}`} title="Included in notes" />
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
              <TopicPane topic={activeNotes.topics[selected.index]} mode={mode} />
            )}
            {selected?.type === 'terms' && (
              <TermsPane keyTerms={activeNotes.keyTerms} />
            )}
            {selected?.type === 'video' && (
              <VideoPane
                source={videoSources.find(v => v.videoId === selected.videoId)}
                onToggleMerge={handleToggleVideoMerge}
              />
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}

// ── Topic pane ────────────────────────────────────────────────────────────────

function TopicPane({ topic, mode }) {
  const [openSubs, setOpenSubs] = useState({});

  // Default all subtopics open
  useEffect(() => {
    setOpenSubs(Object.fromEntries((topic?.subtopics || []).map((_, i) => [i, true])));
  }, [topic, mode]);

  if (!topic) return null;

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl border border-ink-200 shadow-sm px-5 py-4 mb-3">
        <h2 className="font-700 text-ink-900 text-lg">{topic.name}</h2>
        <p className="text-ink-400 text-sm mt-0.5">{topic.subtopics?.length || 0} subtopics</p>
      </div>
      {topic.subtopics?.map((sub, si) => {
        const isOpen = openSubs[si] !== false;
        return (
          <div key={si} className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
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
                    {pt}
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
    <div className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
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
            <dd className="text-sm text-ink-600 leading-relaxed">{item.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── Video pane ────────────────────────────────────────────────────────────────

function VideoPane({ source, onToggleMerge }) {
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
      <div className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
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
      <div className="bg-white rounded-2xl border border-ink-200 shadow-sm px-5 py-4 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-600 text-ink-800">Include notes in subject</p>
          <p className="text-xs text-ink-400 mt-0.5">
            {source.merged
              ? 'Video notes are included alongside your study notes'
              : 'Toggle on to add this video\'s notes to your subject content'}
          </p>
        </div>
        <button
          onClick={() => onToggleMerge(source.videoId, !source.merged)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${source.merged ? 'bg-green-500' : 'bg-ink-200'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${source.merged ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Timecoded notes */}
      {source.notes?.length > 0 && (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
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
                          {pt}
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

// ── Download menu ─────────────────────────────────────────────────────────────

function DownloadMenu({ onMd, onDocx, docxLoading, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-44 bg-white border border-ink-200 rounded-2xl shadow-lg overflow-hidden z-50 animate-fade-in">
      <button
        onClick={onMd}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-700 hover:bg-ink-50 transition-colors border-b border-ink-100"
      >
        <FileText className="w-4 h-4 text-ink-400 flex-shrink-0" />
        <div className="text-left">
          <p className="font-600">Markdown</p>
          <p className="text-xs text-ink-400">.md file</p>
        </div>
      </button>
      <button
        onClick={onDocx}
        disabled={docxLoading}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-60"
      >
        <FileDown className="w-4 h-4 text-ink-400 flex-shrink-0" />
        <div className="text-left">
          <p className="font-600">{docxLoading ? 'Building…' : 'Word Document'}</p>
          <p className="text-xs text-ink-400">.docx file</p>
        </div>
      </button>
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
          <button onClick={onSwitchBack} className="ml-2 text-brand-600 hover:underline font-medium">Switch back to Standard</button>
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
