import { useEffect, useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Loader2, Crown, AlertCircle } from 'lucide-react';
import { supabase, type AppUser } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  onAuthed: (user: AppUser) => void;
}

export function AuthModal({ open, onClose, onAuthed }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setConfirm('');
      setError(null);
      setLoading(false);
      setGoogleLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (err) throw err;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setError(friendlyError(msg));
      setGoogleLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        if (data.user) onAuthed({ id: data.user.id, email: data.user.email ?? '' });
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        if (data.user) {
          onAuthed({ id: data.user.id, email: data.user.email ?? '' });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(friendlyError(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-navy-700 shadow-card-lg backdrop-blur-2xl animate-pop-in">
        {/* header band */}
        <div className="relative overflow-hidden bg-blue-grad px-6 pb-8 pt-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
              <Crown size={18} className="text-white" />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold leading-none text-white">Gambit Royale</p>
              <p className="mt-1 text-xs font-medium text-royal-100">
                {mode === 'login' ? 'Welcome back' : 'Create your account & claim $50 bonus'}
              </p>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="px-6 py-6">
          {/* mode toggle */}
          <div className="mb-5 flex rounded-full bg-navy-600 p-1">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 rounded-full py-2 text-sm font-bold transition-all ${
                mode === 'login' ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-400 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 rounded-full py-2 text-sm font-bold transition-all ${
                mode === 'signup' ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Google sign-in */}
          <button
            onClick={signInWithGoogle}
            disabled={googleLoading || loading}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-navy-600 py-3 text-sm font-bold text-white transition-all hover:bg-navy-500 hover:shadow-card disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-semibold text-navy-400">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <Field icon={Mail} type="email" placeholder="Email address" value={email} onChange={setEmail} autoComplete="email" />
            <Field icon={Lock} type="password" placeholder="Password" value={password} onChange={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {mode === 'signup' && (
              <Field icon={Lock} type="password" placeholder="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Please wait…
                </>
              ) : mode === 'login' ? (
                <>
                  <UserIcon size={18} />
                  Log In
                </>
              ) : (
                <>
                  <Crown size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>

          {mode === 'signup' && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 py-2.5 text-xs font-semibold text-amber-400">
              <Crown size={14} />
              Get $50 welcome bonus on sign-up!
            </div>
          )}

          <p className="mt-4 text-center text-xs text-navy-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
              className="font-bold text-royal-400 hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  icon: typeof Mail;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400">
        <Icon size={18} />
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-white/10 bg-navy-600 py-3 pl-11 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
      />
    </div>
  );
}

function friendlyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (lower.includes('user already registered')) return 'An account with this email already exists.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email before logging in.';
  if (lower.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  if (lower.includes('network') || lower.includes('fetch')) return 'Network error. Check your connection and try again.';
  return msg;
}
