import { useState } from 'react';
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import BrainLogo from '../components/BrainLogo.jsx';
import { supabase } from '../lib/supabase.js';

// ── Google icon (SVG) ─────────────────────────────────────────────────────────
function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ── Main auth page ────────────────────────────────────────────────────────────

export default function AuthPage({ onBack }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot'

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/brain.png" alt="Brain Buffet" className="w-10 h-10" />
          <span className="text-xl font-800 text-ink-900 tracking-tight">Brain Buffet</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-ink-100">
          {tab === 'login'    && <LoginForm onSwitch={setTab} />}
          {tab === 'register' && <RegisterForm onSwitch={setTab} />}
          {tab === 'forgot'   && <ForgotForm onSwitch={setTab} />}
        </div>

        {onBack && (
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-sm font-500 mx-auto mt-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </button>
        )}
      </div>
    </div>
  );
}

// ── Google OAuth button ───────────────────────────────────────────────────────

function GoogleButton({ loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border-2 border-ink-200 hover:border-ink-300 hover:bg-ink-50 text-ink-700 font-600 text-sm transition-all disabled:opacity-50"
    >
      <GoogleIcon className="w-5 h-5" />
      Continue with Google
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-ink-100" />
      <span className="text-xs text-ink-400 font-500">or</span>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGoogleLogin() {
    setGoogleLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
    // On success, App.jsx's onAuthStateChange fires → navigates automatically
  }

  return (
    <>
      <h1 className="font-display text-xl font-600 text-ink-900 mb-1">Welcome back</h1>
      <p className="text-ink-400 text-sm mb-6">Sign in to your Brain Buffet account</p>

      <GoogleButton loading={googleLoading} onClick={handleGoogleLogin} />
      <Divider />

      <form onSubmit={handleLogin} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <PasswordField label="Password" value={password} onChange={setPassword}
          show={showPw} onToggle={() => setShowPw(p => !p)} />

        {error && <ErrorBanner message={error} />}

        <button type="submit" disabled={loading || !email || !password}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 disabled:opacity-40 transition-colors">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign in'}
        </button>
      </form>

      <div className="mt-5 text-center space-y-2">
        <button onClick={() => onSwitch('forgot')} className="text-xs text-ink-400 hover:text-ink-700 transition-colors">
          Forgot password?
        </button>
        <p className="text-sm text-ink-500">
          Don't have an account?{' '}
          <button onClick={() => onSwitch('register')} className="text-brand-600 hover:text-brand-700 font-600">
            Create one
          </button>
        </p>
      </div>
    </>
  );
}

// ── Register form ─────────────────────────────────────────────────────────────

function RegisterForm({ onSwitch }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleGoogleLogin() {
    setGoogleLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) setError(error.message);
    else setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-lg font-700 text-ink-900 mb-2">Check your email</h2>
        <p className="text-sm text-ink-500 mb-5">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </p>
        <button onClick={() => onSwitch('login')} className="text-sm text-brand-600 hover:text-brand-700 font-600">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-xl font-600 text-ink-900 mb-1">Create account</h1>
      <p className="text-ink-400 text-sm mb-6">Start studying smarter — it's free</p>

      <GoogleButton loading={googleLoading} onClick={handleGoogleLogin} />
      <Divider />

      <form onSubmit={handleRegister} className="space-y-4">
        <Field label="Full name" type="text" value={name} onChange={setName} placeholder="Jane Smith" />
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <PasswordField label="Password" value={password} onChange={setPassword}
          show={showPw} onToggle={() => setShowPw(p => !p)}
          hint="Minimum 8 characters" />

        {error && <ErrorBanner message={error} />}

        <button type="submit" disabled={loading || !email || !password || !name}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 disabled:opacity-40 transition-colors">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <button onClick={() => onSwitch('login')} className="text-brand-600 hover:text-brand-700 font-600">
          Sign in
        </button>
      </p>
    </>
  );
}

// ── Forgot password form ──────────────────────────────────────────────────────

function ForgotForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-lg font-700 text-ink-900 mb-2">Reset link sent</h2>
        <p className="text-sm text-ink-500 mb-5">
          Check <strong>{email}</strong> for a password reset link.
        </p>
        <button onClick={() => onSwitch('login')} className="text-sm text-brand-600 hover:text-brand-700 font-600">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => onSwitch('login')}
        className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700 text-xs font-500 mb-5 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
      </button>
      <h1 className="font-display text-xl font-600 text-ink-900 mb-1">Reset password</h1>
      <p className="text-ink-400 text-sm mb-6">
        Enter your email and we'll send you a reset link.
      </p>
      <form onSubmit={handleReset} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        {error && <ErrorBanner message={error} />}
        <button type="submit" disabled={loading || !email}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-600 text-white text-sm font-600 disabled:opacity-40 transition-colors">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send reset link'}
        </button>
      </form>
    </>
  );
}

// ── Shared field components ───────────────────────────────────────────────────

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-600 text-ink-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full px-3 py-2.5 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm text-ink-800 placeholder-ink-300 transition-colors"
      />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, hint }) {
  return (
    <div>
      <label className="block text-xs font-600 text-ink-600 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full px-3 py-2.5 pr-10 rounded-xl border-2 border-ink-200 focus:border-brand-400 focus:outline-none text-sm text-ink-800 placeholder-ink-300 transition-colors"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-ink-400 mt-1">{hint}</p>}
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-xs">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
