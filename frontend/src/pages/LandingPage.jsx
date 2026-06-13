import { BookOpen, Zap, Youtube, Hash, CheckCircle, ArrowRight, FileText, Image, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import BrainLogo from '../components/BrainLogo.jsx';

const HEADLINES = [
  { top: 'Turn any content into',        bottom: 'perfect study notes' },
  { top: 'Upload your textbook,',         bottom: 'walk away with a quiz' },
  { top: 'From handwritten scrawl',       bottom: 'to structured revision' },
  { top: 'Your notes, built only',        bottom: 'from your material' },
  { top: 'Stop highlighting.',            bottom: 'Start understanding.' },
  { top: 'One upload.',                   bottom: 'A whole term of notes.' },
  { top: 'YouTube lecture?',              bottom: 'Timecoded notes in seconds.' },
  { top: 'Notes that know',               bottom: 'exactly what to test you on' },
  { top: 'Every subject.',                bottom: 'One place. Always organised.' },
  { top: 'Concise or detailed —',         bottom: 'you choose how you study' },
  { top: 'From any source',               bottom: 'to exam-ready in a minute' },
];

// Fisher-Yates shuffle of indices 1..n-1, always keeping 0 first
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
    }, 5000);
    return () => clearInterval(interval);
  }, [order]);

  const headline = HEADLINES[order[step]];

  return (
    <div className="min-h-screen bg-ink-50">

      {/* ── Nav — desktop only ── */}
      <header className="hidden sm:block sticky top-0 z-20 bg-ink-50/90 backdrop-blur-md border-b border-ink-900/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/brain.png" alt="Brain Buffet" className="w-7 h-7" />
            <span className="text-[15px] font-700 tracking-tight text-ink-900">Brain Buffet</span>
            <span className="text-[11px] font-600 text-ink-900 bg-transparent border border-ink-900 px-2 py-0.5 rounded-full">beta</span>
          </div>
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 text-xs text-ink-400 font-500">
            <img src="/fork.png" alt="fork" className="w-5 h-5 opacity-40" />
            Serving up snackable bite-sized brain food
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onLogin}
              className="px-4 py-2 rounded-xl text-sm font-600 text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors">
              Sign in
            </button>
            <button onClick={onGetStarted}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-yellow border border-ink-900 hover:bg-white text-ink-900 text-sm font-600 transition-colors">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pb-8 sm:pb-10 text-center">

        {/* Mobile-only logo lockup */}
        <div className="flex flex-col items-center pt-10 pb-6 sm:hidden">
          <img src="/brain.png" alt="Brain Buffet" className="w-14 h-14 mb-3" />
          <span className="text-[22px] font-700 tracking-tight text-ink-900">Brain Buffet</span>
          <span className="mt-1.5 text-[11px] font-600 text-ink-900 border border-ink-900 px-2.5 py-0.5 rounded-full">beta</span>
        </div>

        <div className="sm:pt-12">
          <h1 className={`font-display text-[2.55rem] sm:text-5xl lg:text-6xl font-600 text-ink-900 leading-[1.1] mb-4 sm:mb-6 transition-opacity duration-400 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {headline.top}
            <br />
            <span className="italic font-500">{headline.bottom}</span>
          </h1>

          <p className="text-[15px] sm:text-xl text-ink-500 max-w-2xl mx-auto mb-7 sm:mb-8 leading-relaxed">
            Upload anything: textbooks, lecture slides, handwritten notes, YouTube videos.
            Brain Buffet structures it into notes and quizzes built entirely from your material.
          </p>

          <div className="flex flex-col items-center justify-center gap-3">
            <button onClick={onGetStarted}
              className="flex items-center gap-2 bg-ink-900 hover:bg-brand-600 text-white px-7 py-3.5 rounded-2xl text-base font-700 transition-colors w-full sm:w-auto justify-center">
              Create Account <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center gap-1 text-[11px] text-ink-400 font-500 tracking-wide sm:flex-row sm:gap-1.5">
              <span>Free during beta</span>
              <span className="hidden sm:block w-0.5 h-0.5 rounded-full bg-ink-300" />
              <span>No credit card needed</span>
              <span className="hidden sm:block w-0.5 h-0.5 rounded-full bg-ink-300" />
              <span>Year 7 to university</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── What makes it different ── */}
      <section className="pt-2 pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-600 text-ink-900 mb-3">
              Why choose <span className="italic">Brain Buffet?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <CheckCircle className="w-4 h-4 text-ink-900" />,
                tile: 'bg-accent-green',
                title: 'Uses only your ingredients',
                body: 'Every note comes directly from what you upload. If it\'s not in your source, it won\'t be in your notes.',
              },
              {
                icon: <FileText className="w-4 h-4 text-ink-900" />,
                tile: 'bg-accent-teal',
                title: 'Intelligent fact extraction',
                body: 'No more trawling through textbooks. Key facts, concepts, terms and formulas pulled out and ready to study.',
              },
              {
                icon: <Zap className="w-4 h-4 text-ink-900" />,
                tile: 'bg-accent-yellow',
                title: 'Quizzes with guided marking',
                body: 'Varied question types with guided, incremental marking that teaches you how to write the perfect answer.',
              },
              {
                icon: <BookOpen className="w-4 h-4 text-ink-900" />,
                tile: 'bg-accent-lightGreen',
                title: 'Build a library of notes',
                body: 'Add sources across the term. By exam time every subject is consolidated in one place, nothing missing.',
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-5 border-2 border-ink-900 shadow-hard">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-7 h-7 rounded-lg border-2 border-ink-900 flex items-center justify-center flex-shrink-0 ${f.tile}`}>
                    {f.icon}
                  </div>
                  <h3 className="font-700 text-ink-900 text-sm leading-tight">{f.title}</h3>
                </div>
                <p className="text-xs text-ink-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-10 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-600 text-ink-900 mb-3">How it works</h2>
          <p className="text-ink-500">From raw material to revision-ready notes in under a minute</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {[
            { step: '1', tile: 'bg-accent-teal',       icon: <FileText className="w-6 h-6 text-ink-900" />, title: 'Upload your content', body: 'PDFs, images of handwritten notes, lecture slides, or paste a YouTube URL' },
            { step: '2', tile: 'bg-accent-lightGreen', icon: <BrainLogo className="w-6 h-6 text-ink-900" />, title: 'Extracts and structures', body: 'Brain Buffet extracts the subject knowledge, organises it into topics and subtopics, and identifies key terms' },
            { step: '3', tile: 'bg-accent-yellow',     icon: <BookOpen className="w-6 h-6 text-ink-900" />, title: 'Review your notes', body: 'Browse structured notes, switch between standard and concise views, download as Word or Markdown' },
            { step: '4', tile: 'bg-accent-green',      icon: <Zap className="w-6 h-6 text-ink-900" />, title: 'Test yourself', body: 'Generate a custom quiz from your chosen topics and get instant feedback on your answers' },
          ].map(s => (
            <div key={s.step} className="flex flex-col items-center text-center gap-3 px-4">
              <div className="relative inline-flex flex-shrink-0 mb-0 sm:mb-4">
                <div className={`w-14 h-14 rounded-2xl border-2 border-ink-900 shadow-hard-sm flex items-center justify-center ${s.tile}`}>
                  {s.icon}
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-500 border border-ink-900 text-white text-[10px] font-700 flex items-center justify-center">
                  {s.step}
                </span>
              </div>
              <div className="max-w-[260px] sm:max-w-none">
                <h3 className="font-700 text-ink-900 mb-1 text-[15px] sm:text-sm sm:mb-1.5">{s.title}</h3>
                <p className="text-[13px] sm:text-xs text-ink-500 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Source types ── */}
      <section className="py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-600 text-ink-400 uppercase tracking-wider mb-5">Works with</p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            {[
              { icon: <FileText className="w-4 h-4" />, label: 'PDF Textbooks' },
              { icon: <Image className="w-4 h-4" />,    label: 'Photos & Screenshots' },
              { icon: <Monitor className="w-4 h-4" />,   label: 'Slide Decks' },
              { icon: <Youtube className="w-4 h-4" />,  label: 'YouTube Videos' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 bg-white border-2 border-ink-900 rounded-full px-4 py-2 text-sm font-600 text-ink-700">
                {s.icon}{s.label}
              </div>
            ))}
          </div>
          <p className="text-center text-xs font-500 text-ink-400 mt-4">...and more</p>
        </div>
      </section>


      {/* ── Feature list ── */}
      <section className="py-10 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-4">
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
            <div key={f} className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
              <span className="text-sm text-ink-700">{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-12 bg-ink-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
            <BrainLogo className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-600 text-white mb-4">
            Ready to feed your <span className="italic">brain?</span>
          </h2>
          <p className="text-ink-300 mb-8 text-base">
            Create your free account and turn your first set of notes into a full study spread in under a minute.
          </p>
          <button onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-accent-yellow hover:bg-white text-ink-900 px-7 py-3.5 rounded-2xl text-base font-700 transition-colors">
            Get started for free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 border-t border-ink-900/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-ink-900 flex items-center justify-center">
              <BrainLogo className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-600 text-ink-600">Brain Buffet</span>
          </div>
          <p className="text-xs text-ink-400">Study notes, only from your source material</p>
        </div>
      </footer>

    </div>
  );
}
