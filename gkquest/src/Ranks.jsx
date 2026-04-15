import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, getCountFromServer, where, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Capacitor } from '@capacitor/core';
import { useBackNavigation } from './useBackNavigation';

export default function Ranks() {
  const navigate = useNavigate();
  const handleBack = useBackNavigation();
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [userRank, setUserRank] = useState('--');
  const [isRankUnlocked, setIsRankUnlocked] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    // 1. Fetch top 50 users by weeklyTotal
    const q = query(collection(db, 'users'), orderBy('weeklyTotal', 'desc'), limit(50));
    const unsubscribeTop = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTopUsers(users);
      setLoading(false);
    });

    // 2. Fetch current user and calculate Rank
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, async (snap) => {
      const data = snap.data();
      setUserData(data);
      
      if (data?.weeklyTotal !== undefined) {
        const countQ = query(collection(db, 'users'), where('weeklyTotal', '>', data.weeklyTotal));
        const countSnap = await getCountFromServer(countQ);
        setUserRank(countSnap.data().count + 1);
      }
    });

    return () => {
      unsubscribeTop();
      unsubscribeUser();
    };
  }, [navigate]);

  // Manage Ads (Rewarded Preload - UnityAds)
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !loading) {
      import('./unityAds').then(m => m.prepareRewardAd()).catch(() => {});
    }
  }, [loading]);

  const handleUnlockRank = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsRankUnlocked(true);
      return;
    }

    try {
      const { showRewardAd } = await import('./unityAds');
      const result = await showRewardAd();
      
      // UnityAds returns 'COMPLETED' for success
      if (result && (result === 'COMPLETED' || result.completed)) {
        setIsRankUnlocked(true);
        const user = auth.currentUser;
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), {
            'adWatchCount.ranking': increment(1),
          });
        }
      } else {
        alert("Ad was not completed. Please watch until the end to see rankings.");
      }
    } catch (e) {
      console.error("UnityAds Error (Ranks):", e);
      alert("Unity Ad system failed. Please try again later.");
      setIsRankUnlocked(true); // Don't block user if SDK fails
    }
  };

  const podium = topUsers.slice(0, 3);
  const others = topUsers.slice(3);

  return (
    <div className="bg-white font-body text-gray-900 antialiased min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 active:scale-95 transition-all" aria-label="Go back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div onClick={() => navigate('/profile')} className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-blue-600/10">
              <img alt="User" className="w-full h-full object-cover" src={userData?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${userData?.uid || 'gkquest'}`} />
            </div>
            <span className="font-headline text-xl font-bold tracking-tight text-blue-600">GK Quest</span>
          </div>
        </div>
        <div onClick={() => navigate('/wallet')} className="bg-gray-50 px-4 py-2 rounded-full flex items-center gap-2 text-blue-600 font-bold active:scale-95 transition-all cursor-pointer">
          <span className="material-symbols-outlined text-lg font-fill">account_balance_wallet</span>
          <span className="text-sm">₹{userData?.walletBalance || 0}</span>
        </div>
      </header>

      <main className="px-4 max-w-2xl mx-auto pb-8 relative" style={{ paddingTop: 'calc(5rem + var(--safe-top))' }}>
        {!isRankUnlocked && (
          <div className="absolute inset-x-4 top-20 bottom-0 z-[40] flex flex-col items-center justify-start pt-32 text-center">
            <div className="absolute inset-0 bg-white/60 backdrop-blur-3xl rounded-[3rem] border border-gray-100"></div>
            <div className="relative z-10 flex flex-col items-center px-8">
              <div className="w-20 h-20 rounded-[2rem] bg-blue-600 flex items-center justify-center mb-8 shadow-xl shadow-blue-200">
                <span className="material-symbols-outlined text-white text-4xl font-fill">leaderboard</span>
              </div>
              <h2 className="font-headline text-gray-900 text-4xl font-extrabold tracking-tighter leading-none mb-4 italic">
                Global <span className="text-blue-600">Tier</span> Locked
              </h2>
              <p className="text-gray-500 font-medium text-sm leading-relaxed mb-10 max-w-[240px]">
                Watch a quick sponsored video to unlock the global rankings and see where you stand!
              </p>
              <button 
                onClick={handleUnlockRank}
                className="w-full max-w-[260px] bg-blue-600 text-white font-headline font-black py-5 rounded-2xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-blue-200"
              >
                <span className="material-symbols-outlined">ads_click</span>
                UNLOCK NOW
              </button>
            </div>
          </div>
        )}

        <div className={`${!isRankUnlocked ? 'filter blur-[30px] opacity-20 pointer-events-none' : ''} transition-all duration-700`}>
          {/* Podium */}
          <div className="flex items-end justify-center gap-2 mb-10 mt-8 h-64">
             {/* Rank 2 */}
            <div className="flex flex-col items-center flex-1 max-w-[100px]">
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-50">
                  <img alt="2nd" className="w-full h-full object-cover" src={podium[1]?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${podium[1]?.uid || '2'}`} />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Silver</div>
              </div>
              <div className="w-full bg-gray-50 h-20 rounded-t-xl flex flex-col items-center pt-3 text-center">
                <span className="text-[10px] font-bold truncate w-full px-1">{podium[1]?.displayName?.split(' ')[0] || '--'}</span>
                <span className="text-blue-600 font-black text-sm">{podium[1]?.weeklyTotal || 0}</span>
              </div>
            </div>

            {/* Rank 1 */}
            <div className="flex flex-col items-center flex-1 max-w-[120px]">
              <div className="relative mb-4 scale-110">
                <div className="w-20 h-20 rounded-full border-4 border-amber-400 overflow-hidden bg-gray-50">
                  <img alt="1st" className="w-full h-full object-cover" src={podium[0]?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${podium[0]?.uid || '1'}`} />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Gold</div>
              </div>
              <div className="w-full bg-blue-600 h-28 rounded-t-2xl flex flex-col items-center pt-4 text-center shadow-lg">
                <span className="text-white text-xs font-bold truncate w-full px-2">{podium[0]?.displayName?.split(' ')[0] || '--'}</span>
                <span className="text-white font-black text-lg">{podium[0]?.weeklyTotal || 0}</span>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center flex-1 max-w-[100px]">
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full border-4 border-orange-300 overflow-hidden bg-gray-50">
                  <img alt="3rd" className="w-full h-full object-cover" src={podium[2]?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${podium[2]?.uid || '3'}`} />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-300 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Bronze</div>
              </div>
              <div className="w-full bg-gray-50 h-16 rounded-t-xl flex flex-col items-center pt-3 text-center">
                <span className="text-[10px] font-bold truncate w-full px-1">{podium[2]?.displayName?.split(' ')[0] || '--'}</span>
                <span className="text-blue-600 font-black text-sm">{podium[2]?.weeklyTotal || 0}</span>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {others.map((u, i) => (
              <div key={u.id} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                <span className="w-8 font-headline font-black text-gray-400">{i + 4}</span>
                <div className="w-10 h-10 rounded-xl bg-white overflow-hidden border border-gray-100">
                  <img alt="User" className="w-full h-full object-cover" src={u.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${u.id}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm truncate">{u.displayName}</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Weekly Scholar</p>
                </div>
                <span className="font-black text-blue-600">{u.weeklyTotal || 0}</span>
              </div>
            ))}

            {/* Current User Rank */}
            <div className="bg-blue-50 border-2 border-blue-600/10 rounded-2xl p-4 flex items-center gap-3 mt-6">
              <span className="w-8 font-headline font-black text-blue-600">#{userRank}</span>
              <div className="w-10 h-10 rounded-xl bg-blue-600 overflow-hidden">
                <img alt="You" className="w-full h-full object-cover" src={userData?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${userData?.uid || "gkquest"}`} />
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-sm">You</h4>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Global Rank</p>
              </div>
              <span className="font-black text-blue-600">{userData?.weeklyTotal || 0}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-4 bg-white/95 backdrop-blur-2xl border-t border-gray-100 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] pb-8" style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}>
        <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">home</span>
          <span className="font-headline text-[10px] font-bold mt-1">Home</span>
        </button>
        <button className="flex flex-col items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-2xl py-2 px-6 active:scale-90 transition-transform">
          <span className="material-symbols-outlined font-fill">leaderboard</span>
          <span className="font-headline text-[10px] font-bold mt-1">Ranks</span>
        </button>
        <button onClick={() => navigate('/wallet')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">payments</span>
          <span className="font-headline text-[10px] font-bold mt-1">Wallet</span>
        </button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">person</span>
          <span className="font-headline text-[10px] font-bold mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}
