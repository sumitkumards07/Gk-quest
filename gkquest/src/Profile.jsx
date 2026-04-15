import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { signOut, updateProfile } from 'firebase/auth';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setNewName(data.displayName || '');
        setUpiId(data.upiId || '');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      await signOut(auth);
      navigate('/login');
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName: newName });
        await updateDoc(doc(db, 'users', user.uid), { 
          displayName: newName,
          upiId: upiId 
        });
        setIsEditing(false);
        alert("Quest Identity updated successfully!");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update name.");
    }
  };

  const mastery = userData?.totalCorrect && userData?.questionsAttempted 
    ? Math.round((userData.totalCorrect / userData.questionsAttempted) * 100) 
    : 0;

  const getTier = (score = 0) => {
    if (score >= 10000) return { name: 'Grandmaster', color: 'bg-amber-400 text-white', icon: 'military_tech' };
    if (score >= 5000) return { name: 'Elite Player', color: 'bg-emerald-400 text-white', icon: 'verified' };
    if (score >= 2000) return { name: 'Adept', color: 'bg-indigo-400 text-white', icon: 'school' };
    if (score >= 500) return { name: 'Apprentice', color: 'bg-blue-400 text-white', icon: 'book' };
    return { name: 'Novice', color: 'bg-gray-400 text-white', icon: 'edit_note' };
  };

  const tier = getTier(userData?.totalScore);

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center font-body">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white font-body text-gray-900 antialiased min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline text-lg font-bold tracking-tight">Quest Identity</h1>
        </div>
        <button onClick={handleSignOut} className="p-2 rounded-full hover:bg-red-50 text-red-500 active:scale-95 transition-all">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-8" style={{ paddingTop: 'calc(5rem + var(--safe-top))' }}>
        {/* Profile Identity Card */}
        <section className="relative group overflow-hidden rounded-[2.5rem] p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl transition-transform duration-500">
                <img 
                  src={userData?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${userData?.uid || "gkquest"}`} 
                  alt="" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.target.src = '/logo.png'; }}
                />
              </div>
              <div className={`absolute -bottom-2 -right-2 ${tier.color} px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl border border-white/20`}>
                <span className="material-symbols-outlined text-[14px] font-fill">{tier.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{tier.name}</span>
              </div>
            </div>

            {isEditing ? (
              <div className="flex flex-col items-center gap-4 w-full max-w-[240px]">
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-bold text-center focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="Enter New Name"
                />
                <input 
                  type="text" 
                  value={upiId} 
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-bold text-center focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="Enter UPI ID (user@bank)"
                />
                <div className="flex gap-2">
                  <button onClick={handleUpdateName} className="bg-white text-blue-600 px-6 py-2 rounded-full font-bold text-xs uppercase shadow-lg">Save</button>
                  <button onClick={() => setIsEditing(false)} className="bg-white/10 text-white px-6 py-2 rounded-full font-bold text-xs uppercase">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="font-headline text-3xl font-black tracking-tighter italic">{userData?.displayName}</h2>
                <button onClick={() => setIsEditing(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
              </div>
            )}
            
            <p className="text-white/60 text-[10px] font-bold mt-2 tracking-wide uppercase">{userData?.email}</p>
            {userData?.upiId && (
              <p className="text-white/40 text-[9px] font-black mt-1 uppercase tracking-widest">{userData.upiId}</p>
            )}
            
            <div className="mt-8 flex gap-3">
               <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                 <span className="material-symbols-outlined text-sm font-fill">emoji_events</span>
                 <span className="text-[10px] font-black uppercase tracking-widest">Global Player</span>
               </div>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total XP</span>
            <p className="mt-2 text-3xl font-black italic text-blue-600">{userData?.totalScore || 0} <span className="text-lg text-gray-400 not-italic">XP</span></p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Knowledge Accuracy</span>
            <p className="mt-2 text-3xl font-black italic text-gray-900">{mastery}%</p>
          </div>
        </section>

        {/* Details List */}
        <section className="bg-gray-50 rounded-[2.5rem] border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
             <h3 className="font-headline text-xs font-black uppercase tracking-widest text-gray-400">Account Protocols</h3>
             <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">V1.0.9 SAFE</span>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { 
                label: 'Terms & Conditions', 
                icon: 'gavel', 
                sub: 'Terms of engagement',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                onClick: () => navigate('/legal')
              },
              { 
                label: 'Privacy Policy', 
                icon: 'shield', 
                sub: 'How we protect your data',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                onClick: () => navigate('/privacy')
              },
              { 
                label: 'Security Clearance', 
                icon: 'shield_lock', 
                sub: userData?.isVerified ? 'Authorized Scholar' : 'Standard Access',
                color: userData?.isVerified ? 'text-emerald-600' : 'text-blue-600',
                bg: userData?.isVerified ? 'bg-emerald-50' : 'bg-blue-50',
                onClick: () => alert(`Security Level: ${userData?.isVerified ? 'Elite Clear' : 'Level 1'}\nUID: ${userData?.uid?.slice(0, 8)}...`)
              },
              { 
                label: 'Help Desk', 
                icon: 'support_agent', 
                sub: 'Submit a support ticket',
                onClick: () => navigate('/support')
              },
              { 
                label: 'System Configuration', 
                icon: 'settings', 
                sub: 'Production Build V1.0.9',
                onClick: () => alert(`Build: GKQUEST-STABLE-V1.0.9\nPlatform: Capacitor Native\nEnvironment: Production`)
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className="p-5 flex items-center gap-4 bg-white hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100"
                onClick={item.onClick}
              >
                <div className={`p-3 rounded-2xl ${item.bg || 'bg-blue-50'} ${item.color || 'text-blue-600'}`}>
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-900">{item.label}</p>
                  <p className={`text-[10px] font-medium tracking-tight uppercase ${item.color || 'text-gray-400'}`}>{item.sub}</p>
                </div>
                <span className="material-symbols-outlined text-gray-200 text-base">chevron_right</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-4 bg-white/95 backdrop-blur-2xl border-t border-gray-100 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] pb-8" style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}>
        <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">home</span>
          <span className="font-headline text-[10px] font-bold mt-1">Home</span>
        </button>
        <button onClick={() => navigate('/ranks')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">leaderboard</span>
          <span className="font-headline text-[10px] font-bold mt-1">Ranks</span>
        </button>
        <button onClick={() => navigate('/wallet')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">payments</span>
          <span className="font-headline text-[10px] font-bold mt-1">Wallet</span>
        </button>
        <button className="flex flex-col items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-2xl py-2 px-6 active:scale-90 transition-transform">
          <span className="material-symbols-outlined font-fill">person</span>
          <span className="font-headline text-[10px] font-bold mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}
