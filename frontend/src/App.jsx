import { useState, useEffect } from 'react';
import UploadPage from './pages/UploadPage.jsx';
import NotesPage from './pages/NotesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SubjectPage from './pages/SubjectPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import BrainLogo from './components/BrainLogo.jsx';
import { supabase } from './lib/supabase.js';
import { getProfile, yearLevelLabel } from './lib/profile.js';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = no profile yet
  const [notes, setNotes] = useState(null);
  const [noteId, setNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState(null);
  const [conciseNotes, setConciseNotes] = useState(null);
  const [view, setView] = useState('dashboard');

  // Subject page state
  const [currentSubject, setCurrentSubject] = useState(null);
  const [allRecords, setAllRecords] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);

  // Convenience: the student's year level (null if not set)
  const yearLevel = profile?.year_level ?? null;

  // ── Auth: listen for session changes ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setProfile(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setView('dashboard');
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    try {
      const p = await getProfile(userId);
      setProfile(p); // null means no profile row yet → show onboarding
    } catch {
      setProfile(null);
    }
  }

  // ── App navigation ───────────────────────────────────────────────────────────
  function handleNotes(data) {
    setNotes(data.notes ?? data);
    setNoteId(data.id ?? null);
    setNoteTitle((data.notes ?? data).title ?? null);
    setConciseNotes(null);
    setView('notes');
  }

  function handleOpenNote(record) {
    setNotes(record.notes);
    setNoteId(record.id);
    setNoteTitle(record.notes.title);
    setConciseNotes(null);
    setView('notes');
  }

  function handleStartQuiz(id, title) {
    setNoteId(id);
    setNoteTitle(title);
    setView('quiz');
  }

  function handleReset() {
    setNotes(null);
    setConciseNotes(null);
    setView('dashboard');
  }

  function handleOpenSubject(subject, records, subjects) {
    setCurrentSubject(subject);
    setAllRecords(records || []);
    setAllSubjects(subjects || []);
    setView('subject');
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setView('dashboard');
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (session === undefined || (session && profile === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not authenticated ────────────────────────────────────────────────────────
  if (!session) {
    if (view === 'auth') return <AuthPage onBack={() => setView('landing')} />;
    return <LandingPage onGetStarted={() => setView('auth')} onLogin={() => setView('auth')} />;
  }

  // ── Onboarding (first login — no profile row yet) ────────────────────────────
  if (profile === null) {
    return (
      <OnboardingPage
        user={session.user}
        onComplete={({ yearLevel: yl, school }) => {
          // Optimistically set profile state so we don't re-show onboarding
          setProfile({ year_level: yl, school_id: school?.id ?? null, schools: school ?? null });
          setView('dashboard');
        }}
      />
    );
  }

  // ── Authenticated ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-ink-50">
      <Header
        onLogoClick={handleReset}
        onUploadClick={() => setView('upload')}
        onProfileClick={() => setView('profile')}
        view={view}
        user={session.user}
        yearLevel={yearLevel}
      />
      <main className="flex-1">
        {view === 'dashboard' && (
          <DashboardPage
            onUpload={() => setView('upload')}
            onOpenNote={handleOpenNote}
            onQuiz={handleStartQuiz}
            onOpenSubject={handleOpenSubject}
            yearLevel={yearLevel}
          />
        )}
        {view === 'subject' && currentSubject && (
          <SubjectPage
            subject={currentSubject}
            allRecords={allRecords}
            subjects={allSubjects}
            onBack={handleReset}
            onOpenNote={handleOpenNote}
            onQuiz={handleStartQuiz}
            onRecordsChange={setAllRecords}
            yearLevel={yearLevel}
          />
        )}
        {view === 'upload'   && <UploadPage onNotes={handleNotes} onBack={handleReset} yearLevel={yearLevel} />}
        {view === 'notes'    && <NotesPage notes={notes} noteId={noteId} conciseNotesProp={conciseNotes} onConciseNotes={setConciseNotes} onBack={handleReset} onQuiz={() => handleStartQuiz(noteId, noteTitle)} />}
        {view === 'quiz'     && <QuizPage noteId={noteId} noteTitle={noteTitle} notes={notes} yearLevel={yearLevel} onBack={() => setView(notes ? 'notes' : 'dashboard')} />}
        {view === 'profile'  && (
          <ProfilePage
            user={session.user}
            profile={profile}
            onBack={handleReset}
            onSignOut={handleSignOut}
            onProfileSaved={p => setProfile(p)}
          />
        )}
      </main>
    </div>
  );
}

function Header({ onLogoClick, onUploadClick, onProfileClick, view, user, yearLevel }) {
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const initials = displayName.split(' ')[0] || '?';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-ink-200/60 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center">
        {/* Logo — left */}
        <button onClick={onLogoClick} className="flex items-center gap-2 group flex-shrink-0">
          <img src="/brain.png" alt="Brain Buffet" className="w-7 h-7 opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="text-[15px] font-700 tracking-tight text-ink-900 group-hover:text-brand-600 transition-colors hidden sm:block">
            Brain Buffet
          </span>
        </button>

        {/* Nav — centred absolutely so it's always mid-header regardless of logo/avatar widths */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <button
            onClick={onLogoClick}
            className={`px-4 py-2 rounded-xl text-sm font-600 transition-colors ${
              view === 'dashboard' ? 'bg-ink-100 text-ink-800' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={onUploadClick}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-600 transition-colors duration-200 ${
              view === 'upload' ? 'bg-ink-900 text-white' : 'bg-ink-900 hover:bg-brand-600 text-white shadow-sm'
            }`}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2.2">
              <path d="M8 3v10M3 8l5-5 5 5"/>
            </svg>
            <span className="hidden sm:inline">Upload Notes</span>
            <span className="sm:hidden">New</span>
          </button>
        </nav>

        {/* Profile — right */}
        <div className="ml-auto flex items-center">
          {/* Profile avatar */}
          <button onClick={onProfileClick}
            className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl transition-colors ${view === 'profile' ? 'bg-ink-100' : 'hover:bg-ink-100'}`}
            title="Profile">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-700">{initials[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="hidden sm:flex flex-col items-start leading-none">
              <span className="text-sm font-600 text-ink-700">{initials}</span>
              {yearLevel && yearLevelLabel(yearLevel) && (
                <span className="text-[10px] text-ink-400 mt-0.5">{yearLevelLabel(yearLevel)}</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
