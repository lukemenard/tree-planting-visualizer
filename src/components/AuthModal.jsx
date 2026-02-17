import { useState, useRef, useEffect } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resetPassword,
  isAuthAvailable,
} from '../services/authService';

export default function AuthModal({ open, onClose, onSignIn }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setResetSent(false);
    }
  }, [open, mode]);

  if (!open) return null;

  if (!isAuthAvailable()) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm glass-panel rounded-2xl overflow-hidden animate-slide-up">
          <div className="px-6 py-6 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-xl">
              🔐
            </div>
            <h2 className="text-slate-200 font-semibold text-[15px] mb-2">Set Up Authentication</h2>
            <p className="text-slate-500 text-[12px] leading-relaxed mb-4">
              User accounts require Firebase. Create a free project and add your config to <code className="text-emerald-400/80 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">.env</code>
            </p>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-left text-[10px] font-mono text-slate-500 mb-4 space-y-0.5">
              <p>VITE_FIREBASE_API_KEY=...</p>
              <p>VITE_FIREBASE_AUTH_DOMAIN=...</p>
              <p>VITE_FIREBASE_PROJECT_ID=...</p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-400 font-medium text-[12px] rounded-xl px-4 py-2.5 transition-colors text-center border border-emerald-500/10"
              >
                Firebase Console
              </a>
              <button onClick={onClose} className="px-4 py-2.5 text-[12px] text-slate-600 hover:text-slate-400 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setResetSent(true);
      } else if (mode === 'signup') {
        const user = await signUpWithEmail(email, password, displayName);
        onSignIn?.(user);
        onClose();
      } else {
        const user = await signInWithEmail(email, password);
        onSignIn?.(user);
        onClose();
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onSignIn?.(user);
      onClose();
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(friendlyError(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 placeholder-slate-700 outline-none focus:border-emerald-500/30 transition-colors";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm glass-panel rounded-2xl overflow-hidden animate-slide-up"
      >
        <div className="px-6 py-6">
          <div className="text-center mb-5">
            <h2 className="text-slate-200 font-semibold text-[16px]">
              {mode === 'reset' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-slate-600 text-[12px] mt-1">
              {mode === 'reset'
                ? "We'll send a reset link"
                : mode === 'signup'
                ? 'Save planting plans to the cloud'
                : 'Sign in to sync your projects'}
            </p>
          </div>

          {mode !== 'reset' && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.08] text-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50 border border-white/[0.06]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-slate-700 font-medium">OR</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === 'signup' && (
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className={inputClass} />
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className={inputClass} />
            {mode !== 'reset' && (
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className={inputClass} />
            )}

            {error && (
              <p className="text-red-400/80 text-[11px] bg-red-950/30 border border-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}
            {resetSent && (
              <p className="text-emerald-400/80 text-[11px] bg-emerald-950/30 border border-emerald-500/10 rounded-lg px-3 py-2">
                Reset email sent! Check your inbox.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-400 font-medium text-[13px] rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50 border border-emerald-500/10"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
              ) : mode === 'reset' ? 'Send Reset Link' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-1">
            {mode === 'signin' && (
              <>
                <button onClick={() => setMode('signup')} className="text-[11px] text-slate-600 hover:text-emerald-400 transition-colors">
                  Don&apos;t have an account? <span className="font-semibold">Sign up</span>
                </button>
                <br />
                <button onClick={() => setMode('reset')} className="text-[10px] text-slate-700 hover:text-slate-500 transition-colors">
                  Forgot password?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => setMode('signin')} className="text-[11px] text-slate-600 hover:text-emerald-400 transition-colors">
                Already have an account? <span className="font-semibold">Sign in</span>
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => setMode('signin')} className="text-[11px] text-slate-600 hover:text-emerald-400 transition-colors">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-blocked': 'Pop-up blocked. Please allow pop-ups for this site.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
