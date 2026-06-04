import { useState } from 'react';
import UploadPage from './pages/UploadPage.jsx';
import NotesPage from './pages/NotesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

export default function App() {
  const [notes, setNotes] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'upload' | 'notes'

  function handleNotes(data) {
    setNotes(data);
    setView('notes');
  }

  function handleOpenNote(record) {
    setNotes(record.notes);
    setView('notes');
  }

  function handleReset() {
    setNotes(null);
    setView('dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onLogoClick={handleReset}
        onUploadClick={() => setView('upload')}
        view={view}
      />
      <main className="flex-1">
        {view === 'dashboard' && (
          <DashboardPage onUpload={() => setView('upload')} onOpenNote={handleOpenNote} />
        )}
        {view === 'upload' && (
          <UploadPage onNotes={handleNotes} onBack={handleReset} />
        )}
        {view === 'notes' && (
          <NotesPage notes={notes} onBack={handleReset} />
        )}
      </main>
    </div>
  );
}

function Header({ onLogoClick, onUploadClick, view }) {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <button onClick={onLogoClick} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
            StudySynth
          </span>
        </button>

        <nav className="flex items-center gap-1 ml-4">
          <button
            onClick={onLogoClick}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'dashboard' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            Dashboard
          </button>
        </nav>

        <div className="ml-auto">
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7-7 7 7"/>
            </svg>
            New Notes
          </button>
        </div>
      </div>
    </header>
  );
}
