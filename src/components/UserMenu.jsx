import { useState, useRef, useEffect } from 'react';
import { signOut, updateDisplayName, deleteAccount, isAuthAvailable } from '../services/authService';

export default function UserMenu({ user, onSignInClick }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setEditing(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  if (!user) {
    return (
      <button
        onClick={onSignInClick}
        className="glass-panel rounded-xl h-10 px-3 flex items-center gap-2 hover:bg-white/[0.06] transition-colors shrink-0"
      >
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">Sign in</span>
      </button>
    );
  }

  const initial = (user.displayName || user.email || '?')[0].toUpperCase();
  const photoURL = user.photoURL;

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const handleUpdateName = async () => {
    if (newName.trim()) {
      await updateDisplayName(newName.trim());
      setEditing(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      setOpen(false);
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        alert('For security, please sign out and sign back in before deleting your account.');
      }
    }
  };

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-10 h-10 rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/[0.15] transition-all flex items-center justify-center"
      >
        {photoURL ? (
          <img src={photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-emerald-900/40 flex items-center justify-center text-emerald-400 font-semibold text-sm">
            {initial}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-60 glass-panel rounded-xl overflow-hidden z-50 animate-slide-up">
          <div className="px-3.5 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/[0.08]">
                {photoURL ? (
                  <img src={photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-emerald-900/40 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                    {initial}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Display name"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-emerald-500/30"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                    />
                    <button onClick={handleUpdateName} className="text-emerald-400 text-[10px] font-bold px-1">OK</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-slate-200 truncate">
                      {user.displayName || 'Anonymous'}
                    </p>
                    <button
                      onClick={() => { setNewName(user.displayName || ''); setEditing(true); }}
                      className="text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3.5 py-2 text-[12px] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors flex items-center gap-2.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>

            {confirmDelete ? (
              <div className="px-3.5 py-2.5 bg-red-950/30">
                <p className="text-[10px] text-red-300/80 mb-2">Permanently delete your account and all data?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    className="text-[10px] font-semibold text-red-400 bg-red-900/40 px-3 py-1 rounded-lg hover:bg-red-900/60 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 px-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-left px-3.5 py-2 text-[12px] text-red-400/50 hover:bg-red-950/20 hover:text-red-400 transition-colors flex items-center gap-2.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
