import { useState } from 'react';
import { User, Mail, LogOut, Save, Loader2, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';
import { supabase } from '../lib/supabase.js';

export default function ProfilePage({ user, onBack, onSignOut }) {
  const [tab, setTab] = useState('profile'); // 'profile' | 'password'

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const avatarUrl = user?.user_metadata?.avatar_url;

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
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-100 rounded-xl p-1 mb-6">
        {[['profile', 'Profile'], ['password', 'Change password']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-600 transition-all ${tab === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' ? (
        <ProfileTab user={user} />
      ) : (
        <PasswordTab />
      )}

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

// ── Profile details tab ───────────────────────────────────────────────────────

function ProfileTab({ user }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(false);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });
    if (error) setError(error.message);
    else setSuccess(true);
    setSaving(false);
    if (!error) setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <label className="block text-xs font-600 text-ink-600 mb-1.5">Display name</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm text-ink-800 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-600 text-ink-600 mb-1.5">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input value={user?.email || ''} disabled
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-ink-100 bg-ink-50 text-sm text-ink-500 cursor-not-allowed"
          />
        </div>
        <p className="text-[11px] text-ink-400 mt-1">Email cannot be changed here</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-3 py-2.5 text-xs">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Profile updated
        </div>
      )}

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
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm text-ink-800 transition-colors"
            />
          </div>
        </div>
      ))}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-3 py-2.5 text-xs">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Password updated
        </div>
      )}

      <button type="submit" disabled={saving || !password || !confirm}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 disabled:opacity-40 transition-colors">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Update password
      </button>
    </form>
  );
}
