import { useState, useRef, useCallback } from 'react';
import { Search, X, ChevronRight, Loader2, School, GraduationCap, CheckCircle, MapPin } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';
import { YEAR_LEVELS, searchSchools, saveProfile } from '../lib/profile.js';

const STATES = [
  { code: 'NSW', label: 'NSW' },
  { code: 'VIC', label: 'VIC' },
  { code: 'QLD', label: 'QLD' },
  { code: 'WA',  label: 'WA'  },
  { code: 'SA',  label: 'SA'  },
  { code: 'TAS', label: 'TAS' },
  { code: 'ACT', label: 'ACT' },
  { code: 'NT',  label: 'NT'  },
];

export default function OnboardingPage({ user, onComplete }) {
  const [step, setStep] = useState(1);       // 1 = state, 2 = school, 3 = year level
  const [state, setState] = useState(null);  // e.g. 'NSW'
  const [school, setSchool] = useState(null);
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
      onComplete({ yearLevel: selectedYear, school });
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/brain.png" alt="Brain Buffet" className="w-10 h-10" />
          <span className="text-xl font-800 text-ink-900 tracking-tight">Brain Buffet</span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`rounded-full transition-all duration-300 ${
              s === step ? 'w-6 h-2 bg-ink-900' : s < step ? 'w-2 h-2 bg-brand-500' : 'w-2 h-2 bg-ink-200'
            }`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-ink-100 p-8">
          {step === 1 && (
            <StateStep
              displayName={displayName}
              selected={state}
              onSelect={s => { setState(s); setStep(2); }}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <SchoolStep
              state={state}
              school={school}
              schoolCustom={schoolCustom}
              onSchoolChange={setSchool}
              onCustomChange={setSchoolCustom}
              onNext={() => setStep(3)}
              onSkip={() => setStep(3)}
            />
          )}
          {step === 3 && (
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

// ── Step 1: State ─────────────────────────────────────────────────────────────

function StateStep({ displayName, selected, onSelect, onSkip }) {
  return (
    <>
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-ink-100 mx-auto mb-4">
        <MapPin className="w-6 h-6 text-ink-700" />
      </div>
      <h1 className="font-display text-xl font-600 text-ink-900 text-center mb-1">
        Hey {displayName}! What state are you in?
      </h1>
      <p className="text-sm text-ink-400 text-center mb-6">
        We'll use this to find your school
      </p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {STATES.map(s => (
          <button
            key={s.code}
            onClick={() => onSelect(s.code)}
            className={`py-3 rounded-xl border-2 text-sm font-700 transition-all ${
              selected === s.code
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-ink-200 hover:border-brand-400 hover:bg-brand-50/40 text-ink-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <button onClick={onSkip} className="w-full text-center text-xs text-ink-400 hover:text-ink-600 transition-colors mt-1">
        Skip for now
      </button>
    </>
  );
}

// ── Step 2: School ────────────────────────────────────────────────────────────

function SchoolStep({ state, school, schoolCustom, onSchoolChange, onCustomChange, onNext, onSkip }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      setResults(await searchSchools(q, state));
    } finally {
      setSearching(false);
    }
  }, [state]);

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
      <h1 className="font-display text-xl font-600 text-ink-900 text-center mb-1">
        What school do you go to?
      </h1>
      <p className="text-sm text-ink-400 text-center mb-6">
        {state ? `Showing schools in ${state}` : 'Search all Australian schools'}
      </p>

      {/* Search input */}
      <div className="relative mb-2">
        <div className={`flex items-center gap-2 border-2 rounded-xl px-3 transition-colors ${
          school ? 'border-green-400' : query ? 'border-brand-400' : 'border-ink-200'
        }`}>
          {school
            ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            : <Search className="w-4 h-4 text-ink-400 flex-shrink-0" />
          }
          <input
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="Start typing your school name…"
            autoFocus
            className="flex-1 py-3 bg-transparent text-sm text-ink-800 placeholder-ink-400 focus:outline-none"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-ink-300 flex-shrink-0" />}
          {query && !searching && (
            <button onClick={clearSchool} className="text-ink-300 hover:text-ink-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {results.length > 0 && !school && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ink-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-56 overflow-y-auto">
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

      {!school && (
        <button
          onClick={() => setShowCustom(c => !c)}
          className="text-xs text-ink-400 hover:text-ink-600 transition-colors mb-3"
        >
          Can't find your school? Enter it manually
        </button>
      )}

      {showCustom && !school && (
        <input
          value={schoolCustom}
          onChange={e => onCustomChange(e.target.value)}
          placeholder="Type your school name"
          className="w-full px-3 py-2.5 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm text-ink-800 placeholder-ink-400 transition-colors mb-3"
        />
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

// ── Step 3: Year level ────────────────────────────────────────────────────────

function YearStep({ yearLevel, saving, onSelect, onSkip }) {
  return (
    <>
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-ink-100 mx-auto mb-4">
        <GraduationCap className="w-6 h-6 text-ink-700" />
      </div>
      <h1 className="font-display text-xl font-600 text-ink-900 text-center mb-1">
        What year are you in?
      </h1>
      <p className="text-sm text-ink-400 text-center mb-6">
        We'll tailor your notes and quizzes to match your level
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
