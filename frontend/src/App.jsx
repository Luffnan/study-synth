import { useState } from 'react';
import UploadPage from './pages/UploadPage.jsx';
import NotesPage from './pages/NotesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BrainLogo from './components/BrainLogo.jsx';

export default function App() {
  const [notes, setNotes] = useState(null);
  const [view, setView] = useState('dashboard');

  function handleNotes(data) { setNotes(data); setView('notes'); }
  function handleOpenNote(record) { setNotes(record.notes); setView('notes'); }
  function handleReset() { setNotes(null); setView('dashboard'); }

  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <Header onLogoClick={handleReset} onUploadClick={() => setView('upload')} view={view} />
      <main className="flex-1">
        {view === 'dashboard' && <DashboardPage onUpload={() => setView('upload')} onOpenNote={handleOpenNote} />}
        {view === 'upload'    && <UploadPage onNotes={handleNotes} onBack={handleReset} />}
        {view === 'notes'     && <NotesPage notes={notes} onBack={handleReset} />}
      </main>
    </div>
  );
}

function Header({ onLogoClick, onUploadClick, view }) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-ink-200/60 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Logo */}
        <button onClick={onLogoClick} className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-ink-900 flex items-center justify-center group-hover:bg-brand-600 transition-colors duration-200">
            <BrainLogo className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="text-[15px] font-700 tracking-tight text-ink-900 group-hover:text-brand-600 transition-colors hidden sm:block">
            StudySynth
          </span>
        </button>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 ml-2">
          <button
            onClick={onLogoClick}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'dashboard'
                ? 'bg-ink-100 text-ink-800'
                : 'text-ink-500 hover:text-ink-800 hover:bg-ink-100'
            }`}
          >
            Dashboard
          </button>
        </nav>

        {/* CTA */}
        <button
          onClick={onUploadClick}
          className="ml-auto flex items-center gap-1.5 bg-ink-900 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors duration-200 shadow-sm"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2.2">
            <path d="M8 3v10M3 8l5-5 5 5"/>
          </svg>
          <span className="hidden sm:inline">New Notes</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
}
