import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useBackNavigation } from './useBackNavigation';
import { SettingsContext } from './App';
import { useContext } from 'react';

export default function Wallet() {
  const navigate = useNavigate();
  const handleBack = useBackNavigation();
  const { weeklyPrizeAmount } = useContext(SettingsContext);
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setUserData(snap.data());
      setLoading(false);
    });

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10),
    );
    const unsubscribeTx = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    () => {
      setTransactions([]);
    });

    return () => {
      unsubscribe();
      unsubscribeTx();
    };
  }, [navigate]);

  return (
    <div className="bg-white font-body text-gray-900 antialiased min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 active:scale-95 transition-all" aria-label="Go back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-blue-50 overflow-hidden border-2 border-blue-600/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-xl font-fill">emoji_events</span>
            </div>
            <span className="font-headline text-xl font-bold tracking-tight text-blue-600 uppercase italic">Trophy Room</span>
          </div>
        </div>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-8" style={{ paddingTop: 'calc(5.5rem + var(--safe-top))' }}>
        {/* Balance Card */}
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 w-full">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Total XP Earned</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-black italic tracking-tighter leading-none">{userData?.totalScore || 0}</span>
              <span className="text-white/60 text-sm font-bold">XP</span>
            </div>
            
            <div className="mt-6 flex gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm font-fill">local_fire_department</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{userData?.streak || 0} Day Streak</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm font-fill">leaderboard</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Weekly: {userData?.weeklyTotal || 0}</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        </section>

        {/* Weekly Competition Rule Card */}
        <section className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="material-symbols-outlined text-white font-fill">workspace_premium</span>
            </div>
            <h3 className="font-headline text-blue-600 text-xl font-black italic">Weekly #1 Reward</h3>
          </div>
          <p className="text-gray-600 text-sm font-medium leading-relaxed mb-6">
            Compete on the global leaderboard! Every Sunday, the scholar ranked <span className="text-blue-600 font-black">#1 Overall</span> is manually awarded <span className="text-blue-600 font-black">₹{weeklyPrizeAmount}</span> by the Admin.
          </p>
          <button onClick={() => navigate('/ranks')} className="w-full py-4 bg-white text-blue-600 font-headline font-black rounded-xl border border-blue-200 active:scale-95 transition-all">
            VIEW RANKINGS
          </button>
        </section>

        {/* Payout Information */}
        <section className={`p-8 rounded-[2.5rem] border-2 ${userData?.upiId ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100 animate-pulse'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userData?.upiId ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                <span className="material-symbols-outlined font-fill">{userData?.upiId ? 'verified' : 'warning'}</span>
              </div>
              <h3 className={`font-headline text-lg font-black italic ${userData?.upiId ? 'text-emerald-700' : 'text-amber-700'}`}>
                Payout Protocol
              </h3>
            </div>
            {userData?.upiId && (
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Secure</span>
            )}
          </div>
          
          {userData?.upiId ? (
            <div className="space-y-2">
              <p className="text-emerald-700/70 text-[10px] font-black uppercase tracking-[0.2em]">Connected UPI ID</p>
              <p className="text-emerald-900 font-headline font-black text-xl italic truncate">{userData.upiId}</p>
              <button 
                onClick={() => navigate('/profile')}
                className="mt-4 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Change UPI Details →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-amber-700 text-xs font-semibold leading-relaxed">
                You haven't set a UPI ID yet! Without this, the admin cannot send your rewards. Please configure it in your profile.
              </p>
              <button 
                onClick={() => navigate('/profile')}
                className="w-full py-3 bg-amber-500 text-white font-headline font-black rounded-xl shadow-lg shadow-amber-200 active:scale-95 transition-all"
              >
                CONFIGURE UPI ID
              </button>
            </div>
          )}
        </section>

        {/* History */}
        <section className="bg-gray-50 rounded-[2.5rem] p-6 border border-gray-100">
          <h3 className="font-headline font-black text-xs uppercase tracking-widest text-gray-400 mb-6 px-2">Activity Audit</h3>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((tx) => {
                const isXP = tx.type === 'Quiz XP' || tx.type === 'Quiz Points';
                const dateStr = tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleDateString() : 'Recent';
                const displayAmount = isXP ? `+${tx.xp || tx.points || 0} XP` : `+₹${tx.amount || 0}`;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100/50 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isXP ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        <span className="material-symbols-outlined text-lg font-fill">
                          {isXP ? 'bolt' : 'payments'}
                        </span>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-gray-900">{isXP ? 'Quiz XP' : tx.type}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{dateStr}</p>
                      </div>
                    </div>
                    <span className={`font-headline text-lg font-black italic ${isXP ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {displayAmount}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 italic text-sm">No activity protocols recorded.</div>
          )}
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-4 bg-white/95 backdrop-blur-2xl border-t border-gray-100 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] pb-8" style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}>
        <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">home</span>
          <span className="font-headline text-[10px] font-bold mt-1">Home</span>
        </button>
        <button onClick={() => navigate('/ranks')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">leaderboard</span>
          <span className="font-headline text-[10px] font-bold mt-1">Ranks</span>
        </button>
        <button className="flex flex-col items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-2xl py-2 px-6 active:scale-90 transition-transform">
          <span className="material-symbols-outlined font-fill">emoji_events</span>
          <span className="font-headline text-[10px] font-bold mt-1">Prize Room</span>
        </button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">person</span>
          <span className="font-headline text-[10px] font-bold mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}
