import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

export default function AccessDenied() {
  const navigate = useNavigate();

  const handleReturn = async () => {
    await signOut(auth);
    window.location.href = 'https://gk-quest-with-rewards.web.app';
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-error/5 via-transparent to-transparent font-body text-on-surface">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Animated Error Icon */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-error/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative w-24 h-24 bg-surface-container-high rounded-[32px] flex items-center justify-center shadow-xl border border-error/10">
            <span className="material-symbols-outlined text-error text-5xl font-black">gpp_maybe</span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="font-headline text-4xl font-black tracking-tighter italic text-on-surface">
            Permission <span className="text-error">Denied</span>
          </h1>
          <p className="text-on-surface-variant font-bold text-sm tracking-widest uppercase opacity-60">
             Clearance Level: Scholar Only
          </p>
          <div className="h-1 w-12 bg-error/20 mx-auto rounded-full"></div>
        </div>

        <div className="bg-surface-container-low p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm leading-relaxed">
          <p className="text-on-surface-variant text-sm font-medium">
            Your current account credentials are not authorized for the <span className="font-bold text-on-surface">Administrative Terminal</span>. This area is reserved for verified platform controllers.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={handleReturn}
            className="w-full bg-primary text-on-primary py-5 rounded-2xl font-headline font-black text-lg shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">auto_stories</span>
            Return to Scholar App
          </button>
          
          <button 
            onClick={() => { signOut(auth); navigate('/login'); }}
            className="w-full bg-surface-container-high text-on-surface-variant py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-all"
          >
            Sign in with different account
          </button>
        </div>

        <p className="pt-8 text-[10px] font-black uppercase tracking-[0.3em] text-outline opacity-40">
          Kinetic Intelligence Systems v1.0
        </p>
      </div>
    </div>
  );
}
