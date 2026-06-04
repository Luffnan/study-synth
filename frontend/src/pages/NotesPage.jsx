import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Download, BookOpen, Hash } from 'lucide-react';

export default function NotesPage({ notes, onBack }) {
  const [openTopics, setOpenTopics] = useState(() =>
    Object.fromEntries((notes?.topics || []).map((_, i) => [i, true]))
  );
  const [openSubtopics, setOpenSubtopics] = useState({});
  const [showTerms, setShowTerms] = useState(true);

  function toggleTopic(i) {
    setOpenTopics(prev => ({ ...prev, [i]: !prev[i] }));
  }

  function toggleSubtopic(key) {
    setOpenSubtopics(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleDownload() {
    const md = buildMarkdown(notes);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notes.title || 'study-notes'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!notes) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Upload more
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Download .md
        </button>
      </div>

      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-brand-600 text-sm font-medium mb-1">
          <BookOpen className="w-4 h-4" />
          Study Notes
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{notes.title || 'Study Notes'}</h1>
        <p className="text-slate-400 text-sm mt-1">
          {notes.topics?.length || 0} topics · {
            notes.topics?.reduce((a, t) => a + (t.subtopics?.length || 0), 0) || 0
          } subtopics
        </p>
      </div>

      {/* Topics */}
      <div className="space-y-3">
        {notes.topics?.map((topic, ti) => (
          <div key={ti} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleTopic(ti)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {ti + 1}
              </span>
              <span className="font-semibold text-slate-800 flex-1">{topic.name}</span>
              {openTopics[ti]
                ? <ChevronDown className="w-4 h-4 text-slate-400" />
                : <ChevronRight className="w-4 h-4 text-slate-400" />
              }
            </button>

            {openTopics[ti] && (
              <div className="border-t border-slate-100 px-5 py-3 space-y-2">
                {topic.subtopics?.map((sub, si) => {
                  const key = `${ti}-${si}`;
                  const isOpen = openSubtopics[key] !== false; // default open
                  return (
                    <div key={si} className="rounded-xl bg-slate-50 overflow-hidden">
                      <button
                        onClick={() => toggleSubtopic(key)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-brand-500 font-bold text-sm">§</span>
                        <span className="text-sm font-medium text-slate-700 flex-1">{sub.name}</span>
                        {isOpen
                          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        }
                      </button>
                      {isOpen && (
                        <ul className="px-4 pb-3 space-y-1.5">
                          {sub.points?.map((point, pi) => (
                            <li key={pi} className="flex items-start gap-2 text-sm text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                              {point}
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
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowTerms(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Hash className="w-4 h-4" />
            </span>
            <span className="font-semibold text-slate-800 flex-1">Key Terms & Definitions</span>
            <span className="text-xs text-slate-400 mr-2">{notes.keyTerms.length} terms</span>
            {showTerms
              ? <ChevronDown className="w-4 h-4 text-slate-400" />
              : <ChevronRight className="w-4 h-4 text-slate-400" />
            }
          </button>
          {showTerms && (
            <div className="border-t border-slate-100 px-5 py-3">
              <dl className="space-y-3">
                {notes.keyTerms.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <dt className="text-sm font-semibold text-brand-700 min-w-[120px] flex-shrink-0">{item.term}</dt>
                    <dd className="text-sm text-slate-600">{item.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-slate-400 text-xs mt-8">
        Generated by StudySynth · Always verify against your original materials
      </p>
    </div>
  );
}

function buildMarkdown(notes) {
  const lines = [`# ${notes.title || 'Study Notes'}`, ''];
  for (const topic of notes.topics || []) {
    lines.push(`## ${topic.name}`, '');
    for (const sub of topic.subtopics || []) {
      lines.push(`### ${sub.name}`, '');
      for (const pt of sub.points || []) {
        lines.push(`- ${pt}`);
      }
      lines.push('');
    }
  }
  if (notes.keyTerms?.length) {
    lines.push('## Key Terms', '');
    for (const { term, definition } of notes.keyTerms) {
      lines.push(`**${term}**: ${definition}`, '');
    }
  }
  return lines.join('\n');
}
