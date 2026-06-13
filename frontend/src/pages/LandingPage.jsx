import { Zap, Youtube, Hash, CheckCircle, ArrowRight, FileText, Image, Monitor, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import BrainLogo from '../components/BrainLogo.jsx';

const HEADLINES = [
  { top: 'Turn any content into',         bottom: 'perfect study notes' },
  { top: 'Not flashcards.',               bottom: 'Structured curriculum notes.' },
  { top: 'Only facts from your source',   bottom: 'never adding extra information' },
  { top: 'Quizzes that teach you',        bottom: 'how to write the perfect answer' },
  { top: 'Your YouTube lecture,',         bottom: 'with notes at every timestamp' },
  { top: 'From handwritten scrawl',       bottom: 'to structured revision' },
  { top: 'Upload once.',                  bottom: 'Study all term.' },
  { top: 'Every subject. Colour-coded.',  bottom: 'Nothing gets lost.' },
  { top: 'Concise or detailed —',         bottom: 'the notes adapt to you' },
  { top: 'PDF, photo, slide deck,',       bottom: 'YouTube — all become notes' },
  { top: 'From any source',               bottom: 'to exam-ready in under a minute' },
  { top: 'Custom quizzes',                bottom: 'from your handwritten notes' },
  { top: 'Build your study library',      bottom: 'across the year' },
];

function buildOrder() {
  const rest = Array.from({ length: HEADLINES.length - 1 }, (_, i) => i + 1);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [0, ...rest];
}

export default function LandingPage({ onGetStarted, onLogin }) {
  const [order] = useState(buildOrder);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStep(s => (s + 1) % order.length);
        setVisible(true);
      }, 400);
    }, 10000);
    return () => clearInterval(interval);
  }, [order]);

  const headline = HEADLINES[order[step]];

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-black/8">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/brain.png" alt="Brain Buffet" className="w-7 h-7" />
            <span className="text-[15px] font-700 tracking-tight text-ink-900">Brain Buffet</span>
            <span className="text-[10px] font-700 text-white bg-brand-500 px-2 py-0.5 rounded-full uppercase tracking-wider">beta</span>
          </div>
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1.5 text-xs text-ink-400 font-500">
            <img src="/fork.png" alt="fork" className="w-4 h-4 opacity-30" />
            Serving up snackable bite-sized brain food
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onLogin}
              className="px-4 py-2 rounded-xl text-sm font-600 text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors">
              Sign in
            </button>
            <button onClick={onGetStarted}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 transition-colors">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-10 sm:pt-16 sm:pb-14">
        <div className="grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-16 items-center">

          {/* Left: headline + CTA */}
          <div>
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-6 sm:hidden">
              <img src="/brain.png" alt="Brain Buffet" className="w-9 h-9" />
              <span className="text-lg font-700 tracking-tight text-ink-900">Brain Buffet</span>
            </div>

            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-600 text-xs font-600 px-3 py-1.5 rounded-full mb-5">
              <Zap className="w-3 h-3" /> Free during beta — no credit card needed
            </div>

            <h1 className={`font-display text-[2.4rem] sm:text-5xl lg:text-[3.4rem] font-600 text-ink-900 leading-[1.08] mb-5 transition-opacity duration-400 ${visible ? 'opacity-100' : 'opacity-0'}`}>
              {headline.top}
              <br />
              <span className="italic font-500 text-brand-500">{headline.bottom}</span>
            </h1>

            <p className="text-base sm:text-lg text-ink-500 max-w-xl mb-8 leading-relaxed">
              Upload anything: textbooks, lecture slides, handwritten notes, YouTube videos.
              Brain Buffet structures it into notes and quizzes built entirely from your material.
            </p>

            <div className="flex flex-col items-start gap-2">
              <button onClick={onGetStarted}
                className="flex items-center gap-2 bg-ink-900 hover:bg-brand-600 text-white px-7 py-3.5 rounded-2xl text-base font-700 transition-colors">
                Create free account <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-ink-400 font-500">Free during beta &nbsp;·&nbsp; No credit card needed &nbsp;·&nbsp; Year 7 to university</p>
            </div>
          </div>

          {/* Right: 2×2 step cards */}
          <div className="hidden lg:grid grid-cols-2 gap-3">
            {[
              { n: '01', color: 'bg-[#2E90FA]', title: 'Upload your content', body: 'PDFs, handwritten notes, slides or a YouTube URL', icon: '📄' },
              { n: '02', color: 'bg-brand-500',  title: 'Extracts and structures', body: 'Key facts, terms and concepts pulled out and organised into topics and subtopics', icon: '🧩' },
              { n: '03', color: 'bg-accent-yellow', title: 'Review your notes', body: 'Standard and concise views, download as Word or Markdown', icon: '📖' },
              { n: '04', color: 'bg-[#1DB870]',  title: 'Test yourself', body: 'Pick your topics, generate a quiz, get instant feedback on your answers', icon: '⚡' },
            ].map(s => (
              <div key={s.n} className={`${s.color} rounded-2xl p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl">{s.icon}</span>
                  <span className={`text-xs font-800 ${s.n === '03' ? 'text-ink-400' : 'text-white/40'}`}>{s.n}</span>
                </div>
                <h3 className={`font-700 text-sm mb-1.5 leading-snug ${s.n === '03' ? 'text-ink-900' : 'text-white'}`}>{s.title}</h3>
                <p className={`text-xs leading-relaxed ${s.n === '03' ? 'text-ink-600' : 'text-white/75'}`}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Works with ── */}
      <div className="py-6">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center gap-3 flex-wrap justify-center">
          <span className="text-[10px] font-700 text-ink-400 uppercase tracking-widest mr-1">Works with</span>
          {[
            { icon: <FileText className="w-3.5 h-3.5" />, label: 'PDF Textbooks' },
            { icon: <Image className="w-3.5 h-3.5" />,    label: 'Photos & Screenshots' },
            { icon: <Monitor className="w-3.5 h-3.5" />,  label: 'Slide Decks' },
            { icon: <Youtube className="w-3.5 h-3.5" />,  label: 'YouTube Videos' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 bg-ink-100 border border-ink-200 text-ink-700 text-xs font-600 px-3 py-1.5 rounded-full">
              <span className="text-ink-500">{s.icon}</span>{s.label}
            </div>
          ))}
          <span className="text-ink-400 text-xs font-500">…and more</span>
        </div>
      </div>

      {/* ── Why different ── */}
      <section className="py-16 sm:py-20 max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-[11px] font-700 text-ink-400 uppercase tracking-widest">01 /</span>
            <h2 className="font-display text-3xl sm:text-4xl font-600 text-ink-900 mt-1">
              Why choose<br /><span className="italic font-500">Brain Buffet?</span>
            </h2>
          </div>
          <p className="hidden sm:block text-sm text-ink-400 max-w-xs text-right leading-relaxed">
            Most study tools generate generic summaries. Brain Buffet builds structured curriculum notes — only from what you give it.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { color: 'bg-accent-yellow', icon: '🎯', title: 'Uses only your ingredients', body: "Every note comes directly from what you upload. If it's not in your source, it won't be in your notes." },
            { color: 'bg-brand-500',     icon: '🧠', title: 'Intelligent fact extraction', body: 'No more trawling through textbooks. Key facts, concepts, terms and formulas pulled out and ready to study.', light: true },
            { color: 'bg-[#F2654E]',     icon: '⚡', title: 'Quizzes with guided marking', body: 'Varied question types with guided, incremental marking that teaches you how to write the perfect answer.', light: true },
            { color: 'bg-ink-900',       icon: '📚', title: 'Build a library of notes', body: 'Add sources across the term. By exam time every subject is consolidated in one place, nothing missing.', light: true },
          ].map(f => (
            <div key={f.title} className={`${f.color} rounded-2xl p-5 flex flex-col gap-3`}>
              <span className="text-2xl">{f.icon}</span>
              <div>
                <h3 className={`font-700 text-sm leading-snug mb-1 ${f.light ? 'text-white' : 'text-ink-900'}`}>{f.title}</h3>
                <p className={`text-xs leading-relaxed ${f.light ? 'text-white/75' : 'text-ink-700'}`}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature list ── */}
      <section className="py-16 sm:py-20 max-w-6xl mx-auto px-5 sm:px-8">
        <div className="mb-10">
          <span className="text-[11px] font-700 text-ink-400 uppercase tracking-widest">03 /</span>
          <h2 className="font-display text-3xl sm:text-4xl font-600 text-ink-900 mt-1">
            Everything you need<br /><span className="italic font-500">to actually revise</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-1">
          {[
            'Structured notes with topics, subtopics, and key terms',
            'Standard + concise note modes for different study phases',
            'YouTube video panel with timecoded navigation',
            'Merge video content into existing topic notes with one click',
            'Custom quiz generation: pick exactly which topics to test',
            'Download as Word (.docx) or Markdown',
            'Organise topics into colour-coded subjects',
            'Quiz scoring tracked over time per topic',
          ].map(f => (
            <div key={f} className="flex items-start gap-3 py-3 border-b border-ink-100">
              <CheckCircle className="w-4 h-4 text-[#1DB870] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-ink-700">{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-20 bg-brand-500">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <BrainLogo className="w-12 h-12 text-white mx-auto mb-6 opacity-80" />
          <h2 className="font-display text-3xl sm:text-5xl font-600 text-white leading-[1.1] mb-5">
            Ready to feed<br /><span className="italic font-500">your brain?</span>
          </h2>
          <p className="text-white/70 mb-8 text-base max-w-md mx-auto leading-relaxed">
            Create your free account and turn your first set of notes into a full study spread in under a minute.
          </p>
          <button onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-accent-yellow hover:bg-white text-ink-900 px-8 py-4 rounded-2xl text-base font-700 transition-colors">
            Get started for free <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-white/40 text-xs mt-4 font-500">Free during beta · No credit card · Year 7 to university</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-6 border-t border-ink-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/brain.png" alt="Brain Buffet" className="w-5 h-5" />
            <span className="text-sm font-700 text-ink-600">Brain Buffet</span>
          </div>
          <p className="text-xs text-ink-400">Study notes, only from your source material</p>
        </div>
      </footer>

    </div>
  );
}
