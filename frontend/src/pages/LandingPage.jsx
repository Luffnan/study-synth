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
              Upload anything — textbooks, lecture slides, handwritten notes, YouTube videos.
              Brain Buffet turns it into structured notes and custom quizzes, built entirely from your material.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button onClick={onGetStarted}
                className="flex items-center gap-2 bg-ink-900 hover:bg-brand-600 text-white px-7 py-3.5 rounded-2xl text-base font-700 transition-colors">
                Create free account <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-ink-400 font-500">Year 7 to university</span>
            </div>
          </div>

          {/* Right: mosaic grid */}
          <div className="hidden lg:grid grid-cols-2 grid-rows-3 gap-3 h-[420px]">
            <div className="bg-accent-yellow rounded-2xl p-5 flex flex-col justify-between row-span-2">
              <Zap className="w-8 h-8 text-ink-900" strokeWidth={2.5} />
              <div>
                <p className="text-ink-900 font-800 text-xl leading-tight">Quiz yourself on anything</p>
                <p className="text-ink-700 text-xs mt-1.5">Custom questions from your exact material</p>
              </div>
            </div>
            <div className="bg-brand-500 rounded-2xl p-4 flex flex-col justify-between">
              <BrainLogo className="w-7 h-7 text-white" />
              <p className="text-white font-700 text-sm leading-snug">Topics, subtopics + key terms extracted</p>
            </div>
            <div className="bg-ink-900 rounded-2xl p-4 flex flex-col justify-between">
              <Youtube className="w-6 h-6 text-red-400" />
              <p className="text-white font-700 text-sm leading-snug">YouTube → timecoded notes</p>
            </div>
            <div className="bg-[#1DB870] rounded-2xl p-4 flex items-center justify-center col-span-2">
              <div className="flex flex-wrap gap-2 justify-center">
                {['PDF', 'Photos', 'Slides', 'YouTube', 'Handwriting'].map(t => (
                  <span key={t} className="bg-white/25 text-white text-xs font-700 px-3 py-1.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Works with strip ── */}
      <div className="bg-ink-900 py-4 overflow-hidden">
        <div className="flex items-center gap-6 px-6 sm:justify-center flex-wrap sm:flex-nowrap">
          <span className="text-[10px] font-700 text-ink-500 uppercase tracking-widest flex-shrink-0">Works with</span>
          {[
            { icon: <FileText className="w-3.5 h-3.5" />, label: 'PDF Textbooks' },
            { icon: <Image className="w-3.5 h-3.5" />,    label: 'Photos & Screenshots' },
            { icon: <Monitor className="w-3.5 h-3.5" />,  label: 'Slide Decks' },
            { icon: <Youtube className="w-3.5 h-3.5" />,  label: 'YouTube Videos' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 text-white text-xs font-600 flex-shrink-0">
              <span className="text-ink-400">{s.icon}</span>{s.label}
            </div>
          ))}
          <span className="text-ink-600 text-xs font-500">…and more</span>
        </div>
      </div>

      {/* ── Why different ── */}
      <section className="py-16 sm:py-20 max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-[11px] font-700 text-ink-400 uppercase tracking-widest">01 /</span>
            <h2 className="font-display text-3xl sm:text-4xl font-600 text-ink-900 mt-1">
              Why Brain Buffet<br /><span className="italic font-500">is different</span>
            </h2>
          </div>
          <p className="hidden sm:block text-sm text-ink-400 max-w-xs text-right leading-relaxed">
            Most study tools generate generic summaries. Brain Buffet builds structured curriculum notes — only from what you give it.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { color: 'bg-accent-yellow', icon: '🎯', title: 'Your material only', body: 'Every note comes from what you upload. Nothing invented, nothing added.' },
            { color: 'bg-brand-500',     icon: '🧠', title: 'Not flashcards', body: 'Topics, subtopics and key terms — structured like a real curriculum, not a deck of cards.', light: true },
            { color: 'bg-[#F2654E]',     icon: '⚡', title: 'Quizzes that mark and teach', body: 'Guided, incremental marking that teaches you how to write the perfect answer.', light: true },
            { color: 'bg-ink-900',       icon: '📚', title: 'Your whole study library', body: 'Colour-coded subjects. Everything in one place, all term long.', light: true },
          ].map(f => (
            <div key={f.title} className={`${f.color} rounded-2xl p-6 flex flex-col gap-4`}>
              <span className="text-3xl">{f.icon}</span>
              <div>
                <h3 className={`font-700 text-[15px] leading-tight mb-1.5 ${f.light ? 'text-white' : 'text-ink-900'}`}>{f.title}</h3>
                <p className={`text-xs leading-relaxed ${f.light ? 'text-white/75' : 'text-ink-700'}`}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 sm:py-20 bg-ink-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-700 text-ink-400 uppercase tracking-widest">02 /</span>
            <h2 className="font-display text-3xl sm:text-4xl font-600 text-ink-900 mt-1">
              From upload<br /><span className="italic font-500">to exam-ready</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: '01', color: 'bg-[#2E90FA]', title: 'Upload your content', body: 'PDF, photo, slide deck or YouTube link — drop it in and hit go.', icon: '📄' },
              { n: '02', color: 'bg-brand-500',  title: 'Extracts & structures', body: 'Brain Buffet pulls out facts, concepts, formulas and key terms — organised into topics.', icon: '🧩' },
              { n: '03', color: 'bg-accent-yellow', title: 'Review your notes', body: 'Switch between standard and concise views. Download as Word or Markdown.', icon: '📖', dark: false },
              { n: '04', color: 'bg-[#1DB870]',  title: 'Quiz yourself', body: 'Generate a custom quiz from chosen topics. Get feedback that actually teaches you.', icon: '⚡' },
            ].map(s => (
              <div key={s.n} className={`${s.color} rounded-2xl p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-2xl`}>{s.icon}</span>
                  <span className={`text-xs font-800 ${s.n === '03' ? 'text-ink-400' : 'text-white/40'}`}>{s.n}</span>
                </div>
                <h3 className={`font-700 text-base mb-2 leading-tight ${s.n === '03' ? 'text-ink-900' : 'text-white'}`}>{s.title}</h3>
                <p className={`text-xs leading-relaxed ${s.n === '03' ? 'text-ink-600' : 'text-white/75'}`}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature list ── */}
      <section className="py-16 sm:py-20 max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 items-start">
          <div>
            <span className="text-[11px] font-700 text-ink-400 uppercase tracking-widest">03 /</span>
            <h2 className="font-display text-3xl sm:text-4xl font-600 text-ink-900 mt-1 mb-4">
              Everything you need<br /><span className="italic font-500">to actually revise</span>
            </h2>
            <p className="text-ink-500 text-base leading-relaxed">
              Brain Buffet isn't just a note summariser. It's a full revision toolkit — structured notes, quizzes, YouTube integration, and organised subjects.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              { icon: '📝', text: 'Structured notes with topics, subtopics, and key terms' },
              { icon: '⚡', text: 'Standard + concise note modes for different study phases' },
              { icon: '🎬', text: 'YouTube panel with timecoded note navigation' },
              { icon: '🔀', text: 'Merge video content into existing topic notes with one click' },
              { icon: '🎯', text: 'Custom quiz generation — pick exactly which topics to test' },
              { icon: '⬇️', text: 'Download as Word (.docx) or Markdown' },
              { icon: '🗂️', text: 'Colour-coded subjects to organise your library' },
              { icon: '📈', text: 'Quiz scores tracked over time per topic' },
            ].map(f => (
              <div key={f.text} className="flex items-start gap-3 py-3 border-b border-ink-100 last:border-0">
                <span className="text-lg flex-shrink-0 mt-0.5">{f.icon}</span>
                <span className="text-sm text-ink-700 leading-snug">{f.text}</span>
              </div>
            ))}
          </div>
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
