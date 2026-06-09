import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronRight, Loader2, School, GraduationCap, CheckCircle } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';
import { YEAR_LEVELS, searchSchools, saveProfile } from '../lib/profile.js';

/**
 * Post-registration onboarding — shown once after first login.
 * Two steps: (1) school, (2) year level.
 * Both steps are optional — users can skip either.
 */
export default function OnboardingPage({ user, onComplete }) {
  const [step, setStep] = useState(1); // 1 = school, 2 = year level
  const [school, setSchool] = useState(null);      // { id, name, suburb, state } or null
  const [schoolCustom, setSchoolCustom] = useState('');
  const [yearLevel, setYearLevel] = useState(null);
  const [saving, setSaving] = useState(false);

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  async function handleFinish(selectedYear) {
    setSaving(true);
    try {
      await saveProfile(user.id, {
        schoolId: school?.id ?? null,
        schoolNameCustom: school ? null : (schoolCustom.trim() || null),
        yearLevel: selectedYear,
      });
      onComplete({ yearLevel: selectedYear, school });
    } catch (e) {
      console.error('Profile save failed', e);
      // Don't block the user — complete anyway
      onComplete({ yearLevel: selectedYear, school });
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center shadow-md">
            <BrainLogo className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-800 text-ink-900 tracking-tight">StudySynth</span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className={`rounded-full transition-all duration-300 ${
              s === step ? 'w-6 h-2 bg-ink-900' : s < step ? 'w-2 h-2 bg-brand-500' : 'w-2 h-2 bg-ink-200'
            }`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-ink-100 p-8">
          {step === 1 && (
            <SchoolStep
              displayName={displayName}
              school={school}
              schoolCustom={schoolCustom}
              onSchoolChange={setSchool}
              onCustomChange={setSchoolCustom}
              onNext={() => setStep(2)}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <YearStep
              yearLevel={yearLevel}
              saving={saving}
              onSelect={y => { setYearLevel(y); handleFinish(y); }}
              onSkip={() => handleFinish(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: School ────────────────────────────────────────────────────────────

function SchoolStep({ displayName, school, schoolCustom, onSchoolChange, onCustomChange, onNext, onSkip }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await searchSchools(q);
      setResults(data);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQuery(val) {
    setQuery(val);
    onSchoolChange(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function selectSchool(s) {
    onSchoolChange(s);
    setQuery(s.name);
    setResults([]);
    setShowCustom(false);
  }

  function clearSchool() {
    onSchoolChange(null);
    setQuery('');
    setResults([]);
  }

  return (
    <>
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-ink-100 mx-auto mb-4">
        <School className="w-6 h-6 text-ink-700" />
      </div>
      <h1 className="text-xl font-800 text-ink-900 text-center mb-1">
        Hey {displayName}! What school do you go to?
      </h1>
      <p className="text-sm text-ink-400 text-center mb-6">
        This helps us understand who's using StudySynth
      </p>

      {/* Search input */}
      <div className="relative mb-2">
        <div className={`flex items-center gap-2 border-2 rounded-xl px-3 transition-colors ${query && !school ? 'border-brand-400' : school ? 'border-green-400' : 'border-ink-200'}`}>
          {school
            ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            : <Search className="w-4 h-4 text-ink-400 flex-shrink-0" />
          }
          <input
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="Start typing your school name…"
            className="flex-1 py-3 bg-transparent text-sm text-ink-800 placeholder-ink-400 focus:outline-none"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-ink-300 flex-shrink-0" />}
          {(query && !searching) && (
            <button onClick={clearSchool} className="text-ink-300 hover:text-ink-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {results.length > 0 && !school && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ink-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {results.map(s => (
              <button
                key={s.id}
                onClick={() => selectSchool(s)}
                className="w-full text-left px-4 py-3 hover:bg-ink-50 transition-colors border-b border-ink-100 last:border-0"
              >
                <p className="text-sm font-600 text-ink-800">{s.name}</p>
                <p className="text-xs text-ink-400">{[s.suburb, s.state].filter(Boolean).join(', ')} · {s.sector}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Can't find school? */}
      {!school && (
        <button
          onClick={() => setShowCustom(c => !c)}
          className="text-xs text-ink-400 hover:text-ink-600 transition-colors mb-4"
        >
          Can't find your school? Enter it manually
        </button>
      )}

      {showCustom && !school && (
        <div className="mb-4">
          <input
            value={schoolCustom}
            onChange={e => onCustomChange(e.target.value)}
            placeholder="Type your school name"
            className="w-full px-3 py-2.5 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm text-ink-800 placeholder-ink-400 transition-colors"
          />
        </div>
      )}

      {school && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="font-600">{school.name}</p>
            <p className="text-xs text-green-600">{[school.suburb, school.state].filter(Boolean).join(', ')}</p>
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!school && !schoolCustom.trim()}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-600 transition-all ${
          school || schoolCustom.trim()
            ? 'bg-ink-900 hover:bg-brand-600 text-white shadow-sm'
            : 'bg-ink-100 text-ink-400 cursor-not-allowed'
        }`}
      >
        Continue <ChevronRight className="w-4 h-4" />
      </button>

      <button onClick={onSkip} className="w-full text-center text-xs text-ink-400 hover:text-ink-600 transition-colors mt-3">
        Skip for now
      </button>
    </>
  );
}

// ── Step 2: Year level ────────────────────────────────────────────────────────

function YearStep({ yearLevel, saving, onSelect, onSkip }) {
  return (
    <>
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-ink-100 mx-auto mb-4">
        <GraduationCap className="w-6 h-6 text-ink-700" />
      </div>
      <h1 className="text-xl font-800 text-ink-900 text-center mb-1">
        What year are you in?
      </h1>
      <p className="text-sm text-ink-400 text-center mb-6">
        We'll tailor the language and difficulty of your notes and quizzes to match your level
      </p>

      <div className="space-y-2 mb-4">
        {YEAR_LEVELS.map(y => (
          <button
            key={y.value}
            onClick={() => onSelect(y.value)}
            disabled={saving}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-ink-200 hover:border-brand-400 hover:bg-brand-50/40 text-left transition-all group"
          >
            <div>
              <p className="text-sm font-700 text-ink-800 group-hover:text-brand-700">{y.label}</p>
              <p className="text-xs text-ink-400">{y.detail}</p>
            </div>
            {saving && yearLevel === y.value
              ? <Loader2 className="w-4 h-4 animate-spin text-ink-400" />
              : <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-brand-500 transition-colors" />
            }
          </button>
        ))}
      </div>

      <button onClick={onSkip} disabled={saving} className="w-full text-center text-xs text-ink-400 hover:text-ink-600 transition-colors">
        Skip for now
      </button>
    </>
  );
}
