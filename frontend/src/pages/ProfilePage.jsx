import { useState, useRef, useCallback } from 'react';
import { User, Mail, LogOut, Save, Loader2, CheckCircle, AlertCircle, Lock, Search, X, School, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { YEAR_LEVELS, saveProfile, searchSchools, yearLevelLabel } from '../lib/profile.js';

export default function ProfilePage({ user, profile, onBack, onSignOut, onProfileSaved }) {
  const [tab, setTab] = useState('profile'); // 'profile' | 'password'

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const avatarUrl = user?.user_metadata?.avatar_url;

  const schoolDisplay = profile?.schools?.name || profile?.school_name_custom || null;
  const yearDisplay = yearLevelLabel(profile?.year_level);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-full object-cover shadow-md" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-ink-900 flex items-center justify-center shadow-md">
            <span className="text-white text-2xl font-700">{displayName[0]?.toUpperCase()}</span>
          </div>
        )}
        <div>
          <h1 className="text-xl font-800 text-ink-900">{displayName}</h1>
          <p className="text-sm text-ink-400">{user?.email}</p>
          {(schoolDisplay || profile?.year_level) && (
            <p className="text-xs text-ink-400 mt-0.5">
              {[schoolDisplay, yearDisplay !== 'Not set' ? yearDisplay : null].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-100 rounded-xl p-1 mb-6">
        {[['profile', 'Profile'], ['password', 'Password']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-600 transition-all ${tab === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab user={user} profile={profile} onSaved={onProfileSaved} />}
      {tab === 'password' && <PasswordTab />}

      {/* Sign out */}
      <div className="mt-8 pt-6 border-t border-ink-100">
        <button onClick={onSignOut}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-500 transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

// ── Profile tab (name, email, school, year) ───────────────────────────────────

function ProfileTab({ user, profile, onSaved }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [school, setSchool] = useState(profile?.schools ?? null);
  const [schoolCustom, setSchoolCustom] = useState(profile?.school_name_custom ?? '');
  const [yearLevel, setYearLevel] = useState(profile?.year_level ?? null);
  const [query, setQuery] = useState(profile?.schools?.name ?? profile?.school_name_custom ?? '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showCustom, setShowCustom] = useState(!profile?.school_id && !!profile?.school_name_custom);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try { setResults(await searchSchools(q)); }
    finally { setSearching(false); }
  }, []);

  function handleQuery(val) {
    setQuery(val); setSchool(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function selectSchool(s) {
    setSchool(s); setQuery(s.name); setResults([]); setShowCustom(false); setSchoolCustom('');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError(null); setSuccess(false);
    try {
      const [authRes, updated] = await Promise.all([
        supabase.auth.updateUser({ data: { full_name: name.trim() } }),
        saveProfile(user.id, {
          schoolId: school?.id ?? null,
          schoolNameCustom: school ? null : (schoolCustom.trim() || null),
          yearLevel,
        }),
      ]);
      if (authRes.error) throw authRes.error;
      setSuccess(true);
      onSaved({ ...updated, schools: school });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Name */}
      <div>
        <label className="block text-xs font-600 text-ink-600 mb-1.5">Display name</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm text-ink-800 transition-colors" />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-600 text-ink-600 mb-1.5">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input value={user?.email || ''} disabled
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-ink-100 bg-ink-50 text-sm text-ink-500 cursor-not-allowed" />
        </div>
        <p className="text-[11px] text-ink-400 mt-1">Email cannot be changed here</p>
      </div>

      {/* School */}
      <div>
        <label className="block text-xs font-600 text-ink-600 mb-1.5 flex items-center gap-1.5">
          <School className="w-3.5 h-3.5" /> School
        </label>
        <div className="relative">
          <div className={`flex items-center gap-2 border-2 rounded-xl px-3 transition-colors ${school ? 'border-green-400' : query ? 'border-brand-400' : 'border-ink-200'}`}>
            {school ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> : <Search className="w-4 h-4 text-ink-400 flex-shrink-0" />}
            <input value={query} onChange={e => handleQuery(e.target.value)}
              placeholder="Search for your school…"
              className="flex-1 py-2.5 bg-transparent text-sm text-ink-800 placeholder-ink-400 focus:outline-none" />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-ink-300 flex-shrink-0" />}
            {query && !searching && (
              <button type="button" onClick={() => { setSchool(null); setQuery(''); setResults([]); }}
                className="text-ink-300 hover:text-ink-500 transition-colors"><X className="w-4 h-4" /></button>
            )}
          </div>
          {results.length > 0 && !school && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ink-200 rounded-xl shadow-lg z-10 overflow-hidden">
              {results.map(s => (
                <button key={s.id} type="button" onClick={() => selectSchool(s)}
                  className="w-full text-left px-4 py-3 hover:bg-ink-50 transition-colors border-b border-ink-100 last:border-0">
                  <p className="text-sm font-600 text-ink-800">{s.name}</p>
                  <p className="text-xs text-ink-400">{[s.suburb, s.state].filter(Boolean).join(', ')} · {s.sector}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        {!school && (
          <button type="button" onClick={() => setShowCustom(c => !c)}
            className="text-xs text-ink-400 hover:text-ink-600 transition-colors mt-1.5">
            Can't find your school? Enter it manually
          </button>
        )}
        {showCustom && !school && (
          <input value={schoolCustom} onChange={e => setSchoolCustom(e.target.value)}
            placeholder="Type your school name"
            className="mt-2 w-full px-3 py-2.5 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm text-ink-800 placeholder-ink-400 transition-colors" />
        )}
      </div>

      {/* Year level */}
      <div>
        <label className="block text-xs font-600 text-ink-600 mb-2 flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" /> Year level
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {YEAR_LEVELS.map(y => (
            <button key={y.value} type="button" onClick={() => setYearLevel(y.value)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                yearLevel === y.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50'
              }`}>
              <div>
                <p className="text-sm font-700">{y.label}</p>
                <p className="text-xs text-ink-400">{y.detail}</p>
              </div>
              {yearLevel === y.value && <CheckCircle className="w-4 h-4 text-brand-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message="Profile saved" />}

      <button type="submit" disabled={saving || !name.trim()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 disabled:opacity-40 transition-colors">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save changes
      </button>
    </form>
  );
}

// ── Change password tab ───────────────────────────────────────────────────────

function PasswordTab() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSaving(true); setError(null); setSuccess(false);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else { setSuccess(true); setPassword(''); setConfirm(''); }
    setSaving(false);
    if (!error) setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-sm text-ink-500">Choose a strong password of at least 8 characters.</p>
      {[
        { label: 'New password', value: password, onChange: setPassword },
        { label: 'Confirm password', value: confirm, onChange: setConfirm },
      ].map(f => (
        <div key={f.label}>
          <label className="block text-xs font-600 text-ink-600 mb-1.5">{f.label}</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input type="password" value={f.value} onChange={e => f.onChange(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm text-ink-800 transition-colors" />
          </div>
        </div>
      ))}
      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message="Password updated" />}
      <button type="submit" disabled={saving || !password || !confirm}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 disabled:opacity-40 transition-colors">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Update password
      </button>
    </form>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-xs">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{message}</span>
    </div>
  );
}

function SuccessBanner({ message }) {
  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-3 py-2.5 text-xs">
      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />{message}
    </div>
  );
}
