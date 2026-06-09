import { BookOpen, Zap, Youtube, Hash, Download, Brain, CheckCircle, ArrowRight, Sparkles, FileText, Image } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';

export default function LandingPage({ onGetStarted, onLogin }) {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-ink-900 flex items-center justify-center">
              <BrainLogo className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="text-[15px] font-700 tracking-tight text-ink-900">StudySynth</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onLogin}
              className="px-4 py-2 rounded-xl text-sm font-600 text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors">
              Sign in
            </button>
            <button onClick={onGetStarted}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 transition-colors shadow-sm">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">

        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-600 px-3 py-1.5 rounded-full mb-6 border border-brand-200">
          <Sparkles className="w-3.5 h-3.5" />
          AI-powered study notes — only from your source material
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-800 text-ink-900 leading-tight mb-6">
          Turn any content into
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-violet-600">
            perfect study notes
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-ink-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          Upload your textbooks, lecture slides, photos of notes, or paste a YouTube lecture.
          StudySynth reads it and builds structured, quizzable notes — no hallucinations,
          only what's actually in your material.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={onGetStarted}
            className="flex items-center gap-2 bg-ink-900 hover:bg-brand-600 text-white px-7 py-3.5 rounded-2xl text-base font-700 transition-colors shadow-lg shadow-ink-900/20">
            Create free account <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-sm text-ink-400">No credit card · Free forever</p>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-1.5 mt-8">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          ))}
          <span className="text-sm text-ink-500 ml-2">Loved by students studying everything from A-levels to university degrees</span>
        </div>
      </section>

      {/* ── What makes it different ── */}
      <section className="bg-ink-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-800 text-ink-900 mb-3">
              Why students choose StudySynth
            </h2>
            <p className="text-ink-500 max-w-xl mx-auto">
              Most AI tools make things up. StudySynth only summarises what's actually in your uploaded content — no invented facts, no hallucinations.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: <CheckCircle className="w-5 h-5" />,
                color: 'text-emerald-600 bg-emerald-100',
                title: 'Source-faithful only',
                body: 'Every bullet point comes directly from your uploaded material. Zero hallucination — if it wasn\'t in your textbook, it won\'t be in your notes.',
              },
              {
                icon: <Zap className="w-5 h-5" />,
                color: 'text-amber-600 bg-amber-100',
                title: 'Quiz yourself in seconds',
                body: 'Instantly generate a quiz from any combination of your topics. Multiple choice, true/false, fill-in-the-blank, and short answer — auto-marked.',
              },
              {
                icon: <BookOpen className="w-5 h-5" />,
                color: 'text-blue-600 bg-blue-100',
                title: 'Organised by subject',
                body: 'Group your topics into subjects — History, Biology, Economics. Everything you need for each subject in one place.',
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-ink-100">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-700 text-ink-900 mb-2">{f.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-800 text-ink-900 mb-3">How it works</h2>
          <p className="text-ink-500">From raw material to revision-ready notes in under a minute</p>
        </div>

        <div className="grid sm:grid-cols-4 gap-6">
          {[
            { step: '1', icon: <FileText className="w-6 h-6" />, title: 'Upload your content', body: 'PDFs, images of handwritten notes, lecture slides — or paste a YouTube URL' },
            { step: '2', icon: <BrainLogo className="w-6 h-6" />, title: 'AI reads and structures', body: 'Claude extracts the subject knowledge, organises it into topics and subtopics, and identifies key terms' },
            { step: '3', icon: <BookOpen className="w-6 h-6" />, title: 'Review your notes', body: 'Browse structured notes, switch between standard and concise views, download as Word or Markdown' },
            { step: '4', icon: <Zap className="w-6 h-6" />, title: 'Test yourself', body: 'Generate a custom quiz from your chosen topics and get instant AI feedback on your answers' },
          ].map((s, i) => (
            <div key={s.step} className="text-center">
              <div className="relative inline-flex mb-4">
                <div className="w-14 h-14 rounded-2xl bg-ink-900 flex items-center justify-center text-white shadow-md">
                  {s.icon}
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-700 flex items-center justify-center">
                  {s.step}
                </span>
              </div>
              <h3 className="font-700 text-ink-900 mb-1.5 text-sm">{s.title}</h3>
              <p className="text-xs text-ink-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Source types ── */}
      <section className="bg-ink-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-800 text-ink-900 mb-3">
              Works with anything you study from
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <FileText className="w-6 h-6 text-blue-600" />, bg: 'bg-blue-50 border-blue-200', label: 'PDF Textbooks', sub: 'School or university textbooks, lecture handouts' },
              { icon: <Image className="w-6 h-6 text-purple-600" />, bg: 'bg-purple-50 border-purple-200', label: 'Photos & Screenshots', sub: 'Handwritten notes, whiteboard snaps, slide screenshots' },
              { icon: <Youtube className="w-6 h-6 text-red-600" />, bg: 'bg-red-50 border-red-200', label: 'YouTube Lectures', sub: 'Crash Course, university lectures, documentaries' },
              { icon: <Hash className="w-6 h-6 text-amber-600" />, bg: 'bg-amber-50 border-amber-200', label: 'Any subject, any level', sub: 'GCSE, A-level, university, professional exams' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-5 ${s.bg}`}>
                <div className="mb-3">{s.icon}</div>
                <h3 className="font-700 text-ink-900 text-sm mb-1">{s.label}</h3>
                <p className="text-xs text-ink-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature list ── */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-5">
          {[
            'Structured notes with topics, subtopics, and key terms',
            'Standard + concise note modes for different study phases',
            'YouTube video panel with timecoded navigation',
            'Merge video content into existing topic notes with one click',
            'Custom quiz generation — pick exactly which topics to test',
            'Download as Word (.docx) or Markdown',
            'Organise topics into colour-coded subjects',
            'Quiz scoring tracked over time per topic',
          ].map(f => (
            <div key={f} className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-ink-700">{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-ink-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
            <BrainLogo className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-800 text-white mb-4">
            Ready to study smarter?
          </h2>
          <p className="text-ink-300 mb-8 text-base">
            Create your free account and transform your first set of notes in under a minute.
          </p>
          <button onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-white hover:bg-ink-100 text-ink-900 px-7 py-3.5 rounded-2xl text-base font-700 transition-colors shadow-lg">
            Get started for free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 border-t border-ink-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-ink-900 flex items-center justify-center">
              <BrainLogo className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-600 text-ink-600">StudySynth</span>
          </div>
          <p className="text-xs text-ink-400">AI study notes — only from your source material</p>
        </div>
      </footer>

    </div>
  );
}
