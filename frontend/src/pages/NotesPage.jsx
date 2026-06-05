import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Download, BookOpen, Hash, FileText, Zap } from 'lucide-react';
import { generateDocx } from '../utils/generateDocx.js';

export default function NotesPage({ notes, noteId, onBack, onQuiz }) {
  const [openTopics, setOpenTopics] = useState(() =>
    Object.fromEntries((notes?.topics || []).map((_, i) => [i, true]))
  );
  const [openSubtopics, setOpenSubtopics] = useState({});
  const [showTerms, setShowTerms] = useState(true);
  const [docxLoading, setDocxLoading] = useState(false);

  function toggleTopic(i) { setOpenTopics(p => ({ ...p, [i]: !p[i] })); }
  function toggleSub(key) { setOpenSubtopics(p => ({ ...p, [key]: p[key] === false ? true : false })); }

  function handleDownloadMd() {
    const blob = new Blob([buildMarkdown(notes)], { type: 'text/markdown' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${notes.title || 'study-notes'}.md`
    });
    a.click(); URL.revokeObjectURL(a.href);
  }

  async function handleDownloadDocx() {
    setDocxLoading(true);
    try {
      const blob = await generateDocx(notes);
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `${notes.title || 'study-notes'}.docx`
      });
      a.click(); URL.revokeObjectURL(a.href);
    } finally {
      setDocxLoading(false);
    }
  }

  if (!notes) return null;

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
      <div className="mb-8">
        <p className="flex items-center gap-1.5 text-brand-600 text-xs font-600 uppercase tracking-wider mb-2">
          <BookOpen className="w-3.5 h-3.5" /> Study Notes
        </p>
        <h1 className="text-2xl sm:text-3xl font-800 text-ink-900 leading-tight">{notes.title || 'Study Notes'}</h1>
        <p className="text-ink-400 text-sm mt-1.5">
          {notes.topics?.length || 0} topics · {notes.topics?.reduce((a, t) => a + (t.subtopics?.length || 0), 0) || 0} subtopics
          {notes.keyTerms?.length > 0 && ` · ${notes.keyTerms.length} key terms`}
        </p>
      </div>

      {/* Topics */}
      <div className="space-y-2.5">
        {notes.topics?.map((topic, ti) => (
          <div key={ti} className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
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
      {notes.keyTerms?.length > 0 && (
        <div className="mt-3 bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
          <button onClick={() => setShowTerms(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-ink-50 transition-colors">
            <span className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
              <Hash className="w-3.5 h-3.5 text-white" />
            </span>
            <span className="font-600 text-ink-800 flex-1 text-[15px]">Key Terms</span>
            <span className="text-xs text-ink-400 mr-1">{notes.keyTerms.length}</span>
            {showTerms ? <ChevronDown className="w-4 h-4 text-ink-400" /> : <ChevronRight className="w-4 h-4 text-ink-400" />}
          </button>
          {showTerms && (
            <div className="border-t border-ink-100 px-5 py-4">
              <dl className="space-y-3">
                {notes.keyTerms.map((item, i) => (
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

      <p className="text-center text-ink-300 text-xs mt-10">
        StudySynth · Always verify against your original materials
      </p>
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
