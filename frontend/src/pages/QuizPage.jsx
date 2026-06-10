import { apiFetch } from '../lib/api.js';
import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2, RotateCcw, Trophy, ChevronDown, ChevronUp, Hash, Youtube, Zap } from 'lucide-react';

export default function QuizPage({ noteId, noteTitle, notes, onBack, yearLevel }) {
  // If no notes were passed (launched from dashboard), skip straight to generating
  const [state, setState] = useState(() => (!notes || !notes.topics?.length) ? 'loading' : 'pick');
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [scoreSaved, setScoreSaved] = useState(false);

  // Auto-generate when launched from dashboard (no notes = skip pick screen)
  useEffect(() => { if (state === 'loading') generateQuiz(); }, []);

  // Build the list of selectable items from notes
  const topicItems = (notes?.topics || []).map((t, i) => ({
    id: `topic-${i}`, type: 'topic', label: t.name, index: i,
  }));
  const videoItems = (notes?.videoSources || []).map(v => ({
    id: `video-${v.videoId}`, type: 'video', label: v.title, videoId: v.videoId,
  }));
  const allItems = [...topicItems, ...videoItems];

  // Default: all selected
  const [selected, setSelected] = useState(() => new Set(allItems.map(i => i.id)));

  function toggleItem(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === allItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allItems.map(i => i.id)));
    }
  }

  function buildFilteredNotes() {
    if (!notes) return null;
    const selectedTopicIndices = topicItems.filter(i => selected.has(i.id)).map(i => i.index);
    const selectedVideoIds = videoItems.filter(i => selected.has(i.id)).map(i => i.videoId);

    return {
      title: notes.title,
      topics: (notes.topics || []).filter((_, i) => selectedTopicIndices.includes(i)),
      keyTerms: notes.keyTerms || [],
      videoSources: (notes.videoSources || []).filter(v => selectedVideoIds.includes(v.videoId)),
    };
  }

  async function generateQuiz() {
    setState('loading');
    setError(null);
    try {
      const filteredNotes = buildFilteredNotes();
      const res = await apiFetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, filteredNotes, yearLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(
        data.quiz.questions
          .map(q => q.type === 'mcq' ? { ...q, options: q.options.slice().sort(() => Math.random() - 0.5) } : q)
          .sort(() => Math.random() - 0.5)
      );
      setAnswers({});
      setCurrent(0);
      setState('quiz');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }

  function recordAnswer(index, result) {
    setAnswers(prev => ({ ...prev, [index]: result }));
  }

  async function saveScore(pct) {
    if (scoreSaved || !noteId) return;
    setScoreSaved(true);
    try {
      await apiFetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latest_quiz_pct: pct }),
      });
    } catch { /* silent */ }
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      setState('results');
    }
  }

  function prev() { if (current > 0) setCurrent(c => c - 1); }

  const totalMarks = questions.reduce((sum, q) => sum + (q.type === 'short_answer' ? 2 : 1), 0);
  const earnedMarks = Object.values(answers).reduce((sum, a) => sum + (a.score ?? (a.correct ? 1 : 0)), 0);
  const answered = Object.keys(answers).length;
  const pct = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;

  // ── Pick screen ────────────────────────────────────────────────────────────

  if (state === 'pick') {
    const allChecked = selected.size === allItems.length;
    const noneChecked = selected.size === 0;

    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-sm font-medium transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to notes
        </button>

        <div className="bg-white rounded-2xl border-2 border-ink-900 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-ink-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-xl bg-ink-900 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-700 text-ink-900">Customise your quiz</h1>
            </div>
            <p className="text-ink-400 text-sm ml-11">Choose which topics to include</p>
          </div>

          {/* Select all toggle */}
          <div className="px-6 py-3 border-b border-ink-100 flex items-center justify-between">
            <span className="text-xs font-600 text-ink-500 uppercase tracking-wider">
              {selected.size} of {allItems.length} selected
            </span>
            <button onClick={toggleAll} className="text-xs font-600 text-brand-600 hover:text-brand-700 transition-colors">
              {allChecked ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {/* Topics */}
          {topicItems.length > 0 && (
            <div className="px-4 py-2">
              <p className="text-[10px] font-600 text-ink-400 uppercase tracking-wider px-2 py-1.5">Topics</p>
              {topicItems.map((item, i) => (
                <CheckRow
                  key={item.id}
                  checked={selected.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  icon={<span className="w-4 h-4 rounded text-[9px] font-700 flex items-center justify-center text-ink-500">{i + 1}</span>}
                  label={item.label}
                />
              ))}
            </div>
          )}

          {/* Videos */}
          {videoItems.length > 0 && (
            <div className="px-4 py-2 border-t border-ink-100">
              <p className="text-[10px] font-600 text-ink-400 uppercase tracking-wider px-2 py-1.5">Videos</p>
              {videoItems.map(item => (
                <CheckRow
                  key={item.id}
                  checked={selected.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  icon={<Youtube className="w-3.5 h-3.5 text-red-400" />}
                  label={item.label}
                />
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="px-6 py-4 border-t border-ink-100">
            <button
              onClick={generateQuiz}
              disabled={noneChecked}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-600 transition-all ${
                noneChecked
                  ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                  : 'bg-ink-900 hover:bg-brand-600 text-white shadow-sm'
              }`}
            >
              <Zap className="w-4 h-4" />
              Generate quiz{selected.size < allItems.length ? ` · ${selected.size} topic${selected.size !== 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (state === 'loading') return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-ink-500 font-medium">Generating your quiz…</p>
      <p className="text-ink-400 text-sm mt-1">This may take 15–20 seconds</p>
    </div>
  );

  if (state === 'error') return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-red-500 font-medium mb-4">{error}</p>
      <button onClick={() => setState('pick')} className="btn-primary">Back to topics</button>
    </div>
  );

  if (state === 'results') {
    saveScore(pct);
    return (
      <ResultsScreen
        questions={questions}
        answers={answers}
        earnedMarks={earnedMarks}
        totalMarks={totalMarks}
        pct={pct}
        onRetry={() => setState('pick')}
        onBack={onBack}
        noteTitle={noteTitle}
      />
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────

  const q = questions[current];
  const thisAnswer = answers[current];
  const isAnswered = !!thisAnswer;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to notes
        </button>
        <span className="text-sm text-ink-400">{answered} / {questions.length} answered</span>
      </div>

      <div className="w-full bg-ink-100 rounded-full h-1.5 mb-8">
        <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="bg-white rounded-2xl border-2 border-ink-900 p-6 mb-4 animate-slide-up" key={current}>
        <div className="flex items-center gap-2 mb-4">
          <TypeBadge type={q.type} />
          <span className="text-xs text-ink-400">Question {current + 1} of {questions.length}</span>
          {q.type === 'short_answer' && (
            <span className="ml-auto text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">2 marks</span>
          )}
        </div>

        <p className="text-ink-800 font-medium text-base leading-relaxed mb-5">{q.question}</p>

        {q.type === 'mcq' && <MCQInput question={q} answered={isAnswered} thisAnswer={thisAnswer} onAnswer={r => recordAnswer(current, r)} />}
        {q.type === 'true_false' && <TrueFalseInput question={q} answered={isAnswered} thisAnswer={thisAnswer} onAnswer={r => recordAnswer(current, r)} />}
        {q.type === 'fill_blank' && <FillBlankInput question={q} answered={isAnswered} thisAnswer={thisAnswer} onAnswer={r => recordAnswer(current, r)} />}
        {q.type === 'short_answer' && <ShortAnswerInput question={q} yearLevel={yearLevel} onAnswer={r => recordAnswer(current, r)} />}

        {isAnswered && q.type !== 'short_answer' && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${thisAnswer.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="font-medium mb-0.5">{thisAnswer.correct ? '✓ Correct' : `✗ Incorrect — the answer is: ${q.answer === true ? 'True' : q.answer === false ? 'False' : q.answer}`}</p>
            {q.explanation && <p className="text-sm opacity-80">{q.explanation}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={prev} disabled={current === 0}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800 disabled:opacity-30 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>
        <button onClick={next} disabled={!isAnswered}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isAnswered ? 'bg-ink-900 hover:bg-brand-600 text-white shadow-sm' : 'bg-ink-100 text-ink-400 cursor-not-allowed'
          }`}>
          {current === questions.length - 1 ? 'Finish' : 'Next'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Checkbox row ───────────────────────────────────────────────────────────

function CheckRow({ checked, onChange, icon, label }) {
  return (
    <label onClick={onChange} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-ink-50 cursor-pointer transition-colors group">
      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
        checked ? 'bg-ink-900 border-ink-900' : 'border-ink-300 bg-white group-hover:border-ink-400'
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-sm text-ink-700 flex-1 leading-snug">{label}</span>
    </label>
  );
}

// ── Question type components ───────────────────────────────────────────────

function MCQInput({ question, answered, thisAnswer, onAnswer }) {
  return (
    <div className="space-y-2.5">
      {question.options.map((opt, i) => {
        const isSelected = thisAnswer?.value === opt;
        const isCorrect = opt === question.answer;
        let style = 'border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/30 cursor-pointer';
        if (answered) {
          if (isCorrect) style = 'border-green-400 bg-green-50';
          else if (isSelected) style = 'border-red-400 bg-red-50';
          else style = 'border-ink-100 bg-ink-50 opacity-60';
        } else if (isSelected) {
          style = 'border-brand-500 bg-brand-50';
        }
        return (
          <button key={i} disabled={answered} onClick={() => !answered && onAnswer({ value: opt, correct: opt === question.answer })}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${style}`}>
            <span className="inline-flex items-center gap-3">
              <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                {['A','B','C','D'][i]}
              </span>
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseInput({ question, answered, thisAnswer, onAnswer }) {
  return (
    <div className="flex gap-3">
      {[true, false].map(val => {
        const isSelected = thisAnswer?.value === val;
        const isCorrect = val === question.answer;
        let style = 'border-ink-200 bg-white hover:border-brand-300 cursor-pointer';
        if (answered) {
          if (isCorrect) style = 'border-green-400 bg-green-50';
          else if (isSelected) style = 'border-red-400 bg-red-50';
          else style = 'border-ink-100 bg-ink-50 opacity-60';
        } else if (isSelected) {
          style = 'border-brand-500 bg-brand-50';
        }
        return (
          <button key={String(val)} disabled={answered} onClick={() => !answered && onAnswer({ value: val, correct: val === question.answer })}
            className={`flex-1 py-4 rounded-xl border-2 text-base font-semibold transition-all ${style}`}>
            {val ? 'True' : 'False'}
          </button>
        );
      })}
    </div>
  );
}

function FillBlankInput({ question, answered, thisAnswer, onAnswer }) {
  const [val, setVal] = useState('');
  function submit() {
    if (!val.trim()) return;
    onAnswer({ value: val.trim(), correct: val.trim().toLowerCase() === question.answer.trim().toLowerCase() });
  }
  return (
    <div className="space-y-3">
      <input type="text" value={answered ? thisAnswer.value : val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !answered && submit()}
        disabled={answered} placeholder="Type your answer…"
        className="w-full px-4 py-3 rounded-xl border-2 border-ink-200 focus:border-brand-500 focus:outline-none text-sm disabled:bg-ink-50 disabled:text-ink-600 transition-colors" />
      {!answered && (
        <button onClick={submit} disabled={!val.trim()}
          className="px-5 py-2 bg-ink-900 hover:bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">
          Submit
        </button>
      )}
    </div>
  );
}

function ShortAnswerInput({ question, yearLevel, onAnswer }) {
  const [attempts, setAttempts] = useState([]);
  const [val, setVal] = useState('');
  const [marking, setMarking] = useState(false);
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0;
  const achieved2 = bestScore === 2;

  async function submit() {
    if (!val.trim() || marking) return;
    setMarking(true);
    try {
      const res = await apiFetch('/api/quiz/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.question, modelAnswer: question.modelAnswer, studentAnswer: val.trim(), yearLevel }),
      });
      const data = await res.json();
      const attempt = { value: val.trim(), score: data.score, feedback: data.feedback };
      const newAttempts = [...attempts, attempt];
      setAttempts(newAttempts);
      setVal('');
      onAnswer({ value: attempt.value, score: Math.max(...newAttempts.map(a => a.score)), feedback: attempt.feedback, modelAnswer: question.modelAnswer });
    } catch {
      const attempt = { value: val.trim(), score: 0, feedback: 'Could not mark automatically — check the model answer below.' };
      const newAttempts = [...attempts, attempt];
      setAttempts(newAttempts);
      setVal('');
      onAnswer({ value: attempt.value, score: 0, feedback: attempt.feedback, modelAnswer: question.modelAnswer });
    } finally { setMarking(false); }
  }

  const colourMap = { 2: 'bg-green-50 border-green-200 text-green-800', 1: 'bg-amber-50 border-amber-200 text-amber-800', 0: 'bg-red-50 border-red-200 text-red-800' };

  return (
    <div className="space-y-3">
      {attempts.map((attempt, i) => (
        <div key={i} className="space-y-2">
          <div className={`px-4 py-3 rounded-xl text-sm italic ${i === attempts.length - 1 ? 'bg-ink-50 text-ink-700' : 'bg-ink-50/50 text-ink-400'}`}>
            {attempts.length > 1 && <span className="not-italic text-xs font-medium text-ink-400 mr-2">Attempt {i + 1}:</span>}
            "{attempt.value}"
          </div>
          <div className={`rounded-xl border px-4 py-3 text-sm ${colourMap[attempt.score]}`}>
            <div className="flex items-center gap-2 font-semibold mb-1">
              {attempt.score === 2 ? <CheckCircle className="w-4 h-4" /> : attempt.score === 1 ? '~' : <XCircle className="w-4 h-4" />}
              {attempt.score} / 2 marks
            </div>
            <p>{attempt.feedback}</p>
          </div>
        </div>
      ))}
      {attempts.length > 0 && (
        <details className="rounded-xl border border-ink-200 overflow-hidden">
          <summary className="px-4 py-2.5 text-sm font-medium text-ink-600 cursor-pointer hover:bg-ink-50 list-none flex items-center justify-between">
            Model answer <ChevronDown className="w-4 h-4" />
          </summary>
          <div className="px-4 py-3 text-sm text-ink-600 bg-ink-50 border-t border-ink-200">{question.modelAnswer}</div>
        </details>
      )}
      {!achieved2 && (
        <div className="space-y-2">
          {attempts.length > 0 && <p className="text-xs text-ink-400 font-medium">Try again ↓</p>}
          <textarea value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.metaKey && submit()}
            placeholder={attempts.length === 0 ? 'Write your answer here…' : 'Write an improved answer…'}
            rows={attempts.length === 0 ? 4 : 3}
            className="w-full px-4 py-3 rounded-xl border-2 border-ink-200 focus:border-brand-500 focus:outline-none text-sm resize-none transition-colors" />
          <button onClick={submit} disabled={!val.trim() || marking}
            className="flex items-center gap-2 px-5 py-2 bg-ink-900 hover:bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">
            {marking ? <><Loader2 className="w-4 h-4 animate-spin" /> Marking…</> : attempts.length === 0 ? 'Submit answer' : 'Submit improved answer'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Results screen ─────────────────────────────────────────────────────────

function ResultsScreen({ questions, answers, earnedMarks, totalMarks, pct, onRetry, onBack, noteTitle }) {
  const [expanded, setExpanded] = useState(null);
  const grade = pct >= 80 ? { label: 'Excellent', colour: 'text-green-600', bg: 'bg-green-50' }
    : pct >= 60 ? { label: 'Good', colour: 'text-amber-600', bg: 'bg-amber-50' }
    : pct >= 40 ? { label: 'Keep studying', colour: 'text-orange-600', bg: 'bg-orange-50' }
    : { label: 'Needs work', colour: 'text-red-600', bg: 'bg-red-50' };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-sm font-medium transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to notes
      </button>
      <div className="bg-white rounded-2xl border-2 border-ink-900 p-8 text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-ink-900 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-800 text-ink-900 mb-1">{noteTitle}</h1>
        <p className="text-ink-400 text-sm mb-6">Quiz complete</p>
        <div className="text-6xl font-800 text-ink-900 mb-1">{pct}%</div>
        <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4 ${grade.colour} ${grade.bg}`}>{grade.label}</div>
        <p className="text-ink-500 text-sm">{earnedMarks} / {totalMarks} marks</p>
        <div className="grid grid-cols-3 gap-3 mt-6 text-center">
          {[
            { label: 'Correct', val: Object.values(answers).filter(a => (a.score ?? (a.correct ? 1 : 0)) > 0).length, colour: 'text-green-600' },
            { label: 'Partial', val: Object.values(answers).filter(a => a.score === 1).length, colour: 'text-amber-600' },
            { label: 'Incorrect', val: Object.values(answers).filter(a => (a.score ?? (a.correct ? 1 : 0)) === 0).length, colour: 'text-red-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-ink-50 rounded-xl py-3">
              <div className={`text-2xl font-700 ${stat.colour}`}>{stat.val}</div>
              <div className="text-xs text-ink-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 mb-8">
        <button onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-600 font-medium text-sm transition-colors">
          <RotateCcw className="w-4 h-4" /> New quiz
        </button>
        <button onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-ink-900 hover:bg-brand-600 text-white font-medium text-sm transition-colors shadow-sm">
          Back to notes
        </button>
      </div>
      <h2 className="text-base font-600 text-ink-700 mb-3">Review all questions</h2>
      <div className="space-y-2">
        {questions.map((q, i) => {
          const a = answers[i];
          const marks = a ? (a.score ?? (a.correct ? 1 : 0)) : 0;
          const maxMarks = q.type === 'short_answer' ? 2 : 1;
          const correct = marks === maxMarks;
          const partial = marks > 0 && marks < maxMarks;
          return (
            <div key={i} className="bg-white rounded-xl border-2 border-ink-900 overflow-hidden">
              <button onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ink-50 transition-colors">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${correct ? 'bg-green-100' : partial ? 'bg-amber-100' : 'bg-red-100'}`}>
                  {correct ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    : partial ? <span className="text-xs font-bold text-amber-600">~</span>
                    : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                </span>
                <span className="text-sm text-ink-700 flex-1 text-left line-clamp-1">{q.question}</span>
                <span className="text-xs text-ink-400 flex-shrink-0">{marks}/{maxMarks}</span>
                {expanded === i ? <ChevronUp className="w-3.5 h-3.5 text-ink-400" /> : <ChevronDown className="w-3.5 h-3.5 text-ink-400" />}
              </button>
              {expanded === i && (
                <div className="px-4 pb-4 pt-1 border-t border-ink-100 space-y-2 text-sm">
                  <p className="text-ink-500"><span className="font-medium text-ink-700">Your answer: </span>{a?.value ?? '—'}</p>
                  <p className="text-ink-500"><span className="font-medium text-ink-700">Correct answer: </span>
                    {q.type === 'true_false' ? (q.answer ? 'True' : 'False') : q.answer ?? q.modelAnswer}
                  </p>
                  {a?.feedback && <p className="text-ink-500"><span className="font-medium text-ink-700">Feedback: </span>{a.feedback}</p>}
                  {q.explanation && <p className="text-ink-500 italic">{q.explanation}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const map = {
    mcq: { label: 'Multiple Choice', colour: 'bg-blue-50 text-blue-700' },
    true_false: { label: 'True / False', colour: 'bg-purple-50 text-purple-700' },
    fill_blank: { label: 'Fill in the Blank', colour: 'bg-amber-50 text-amber-700' },
    short_answer: { label: 'Short Answer', colour: 'bg-brand-50 text-brand-700' },
  };
  const { label, colour } = map[type] || { label: type, colour: 'bg-ink-100 text-ink-600' };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colour}`}>{label}</span>;
}
