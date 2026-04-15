import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError(`Auth Error: ${err.code || 'Unknown'}. Check console for details.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-on-primary rounded-2xl shadow-xl shadow-primary/20 mb-6 rotate-3">
            <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
          </div>
          <h1 className="text-4xl font-black font-headline tracking-tighter text-on-surface italic">GK QUEST Admin</h1>
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mt-2 opacity-60 italic">Strategic Management Terminal</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-bright p-10 rounded-[2.5rem] border border-outline-variant/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20">
            <div className="h-full bg-primary animate-pulse" style={{ width: loading ? '100%' : '30%' }}></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Command Protocol (ID)</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gkquest.com"
                  className="w-full bg-surface-container-lowest border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all"
                  required
                />
                <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-outline-variant text-lg">alternate_email</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1">Access Cipher (Secret)</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-lowest border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all"
                  required
                />
                <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-outline-variant text-lg">enhanced_encryption</span>
              </div>
            </div>

            {error && (
              <div className="bg-error/5 border border-error/10 p-4 rounded-xl flex gap-3 text-error animate-shake">
                <span className="material-symbols-outlined text-[20px] font-bold">warning</span>
                <p className="text-xs font-black uppercase tracking-wider">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-on-surface text-surface py-5 rounded-2xl font-headline font-black text-lg tracking-tight shadow-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-surface border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined font-bold">bolt</span>
                  Initialize Session
                </>
              )}
            </button>
          </form>

          {/* Abstract decoration */}
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
        </div>

        <p className="text-center mt-10 text-[10px] font-black text-outline uppercase tracking-[0.3em] opacity-40">
          Unauthorized Access is Strictly Logged
        </p>
      </div>
    </div>
  );
}
