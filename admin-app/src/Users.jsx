import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const getTier = (score = 0) => {
    if (score >= 10000) return { name: 'Grandmaster', color: 'bg-amber-400 text-amber-900', icon: 'military_tech' };
    if (score >= 5000) return { name: 'Elite Scholar', color: 'bg-emerald-400 text-emerald-950', icon: 'verified' };
    if (score >= 2000) return { name: 'Adept', color: 'bg-indigo-400 text-indigo-950', icon: 'school' };
    if (score >= 500) return { name: 'Apprentice', color: 'bg-slate-200 text-slate-700', icon: 'book' };
    return { name: 'Novice', color: 'bg-slate-100 text-slate-400', icon: 'edit_note' };
  };

  useEffect(() => {
    // Try query with weeklyTotal ordering first, with fallback
    try {
      const q = query(collection(db, 'users'), orderBy('weeklyTotal', 'desc'), limit(100));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const uList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUsers(uList);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching users with weeklyTotal ordering:", error);
          // Fallback: fetch users without specific ordering
          const fallbackQ = query(collection(db, 'users'), limit(100));
          const fallbackUnsub = onSnapshot(
            fallbackQ,
            (snapshot) => {
              const uList = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.weeklyTotal || 0) - (a.weeklyTotal || 0));
              setUsers(uList);
              setLoading(false);
            },
            (fallbackError) => {
              console.error("Fallback query also failed:", fallbackError);
              setLoading(false);
            }
          );
          return () => fallbackUnsub();
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up query:", err);
      setLoading(false);
    }
  }, []);

  const toggleVerification = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: !currentStatus
      });
    } catch (error) {
      console.error("Verification Toggle Failed:", error);
      alert("Failed to update verification status.");
    }
  };

  // Stats calculation
  const stats = {
    total: users.length,
    verified: users.filter(u => u.isVerified).length,
    totalPoints: users.reduce((acc, u) => acc + (u.totalScore || 0), 0),
    totalAttempts: users.reduce((acc, u) => acc + (u.questionsAttempted || 0), 0),
    walletPool: users.reduce((acc, u) => acc + (u.walletBalance || 0), 0)
  };

  const globalAccuracy = stats.totalAttempts ? Math.round((stats.totalPoints / stats.totalAttempts) * 100) : 0;

  return (
    <div className="font-body space-y-8">
      {/* Stats Overview (Asymmetric Layout) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4 bg-gradient-to-br from-primary to-primary-container p-6 rounded-xl text-on-primary relative overflow-hidden shadow-xl shadow-primary/10">
          <div className="relative z-10">
            <p className="text-sm font-bold opacity-80 mb-1">Total Active Scholars</p>
            <h3 className="text-4xl font-black font-headline">{loading ? '...' : stats.total.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-2 py-1 rounded-full">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              14% increase this month
            </div>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-white/10 text-9xl rotate-12">groups</span>
        </div>
        
        <div className="col-span-12 md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-center">
            <p className="text-outline text-xs font-bold uppercase tracking-wider mb-2">Verified Status</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-on-surface font-headline">{loading ? '--' : Math.round((stats.verified / stats.total) * 100 || 0)}%</span>
              <span className="text-secondary text-xs font-bold mb-1">Authentic</span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-secondary h-full" style={{ width: `${(stats.verified / stats.total) * 100 || 0}%` }}></div>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-center">
            <p className="text-outline text-xs font-bold uppercase tracking-wider mb-2">Platform Points</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-on-surface font-headline">{loading ? '--' : (stats.totalPoints / 1000).toFixed(1)}k</span>
              <span className="text-primary text-xs font-bold mb-1">Total Circ.</span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-primary h-full" style={{ width: '65%' }}></div>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-center">
            <p className="text-outline text-xs font-bold uppercase tracking-wider mb-2">Total Wallet Pool</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-on-surface font-headline">₹{loading ? '--' : stats.walletPool.toLocaleString()}</span>
              <span className="text-tertiary text-xs font-bold mb-1">Pending</span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-tertiary h-full" style={{ width: '40%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_12px_32px_rgba(44,42,81,0.04)]">
        <div className="px-6 py-5 border-b border-surface-container flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface font-headline">Verified Scholar Registry</h3>
            <p className="text-sm text-outline">Manage ranking, verification, and credit balances</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search scholars..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-surface-container border-none rounded-xl py-2 pl-10 pr-4 text-sm font-bold w-48 focus:ring-2 focus:ring-primary/20" 
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-outline">search</span>
            </div>
            <button className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-dim transition-all shadow-md shadow-primary/10">
              <span className="material-symbols-outlined text-sm">ios_share</span>
              Export List
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Scholar</th>
                <th className="px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Verification</th>
                <th className="px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Performance</th>
                <th className="px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest">Wallet Balance</th>
                <th className="px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-on-surface-variant italic">Syncing with global registry...</td>
                </tr>
              ) : users.filter(u => {
                const searchTerm = search.toLowerCase();
                return u.displayName?.toLowerCase().includes(searchTerm) || u.email?.toLowerCase().includes(searchTerm);
              }).map((user, index) => (
                <tr key={user.id} className="hover:bg-surface-container-low/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img className="w-10 h-10 rounded-xl object-cover" src={user.photoURL || "https://i.pravatar.cc/150"} alt={user.displayName} />
                      <div>
                        <p className="text-sm font-bold text-on-surface">{user.displayName || 'Anonymous'}</p>
                        <p className="text-xs text-outline">{user.email || 'No Email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${user.isVerified ? 'text-secondary' : 'text-outline'}`}>
                        {user.isVerified ? 'Verified Scholar' : 'Unverified'}
                      </span>
                      <button 
                        onClick={() => toggleVerification(user.id, user.isVerified)}
                        className={`w-10 h-5 rounded-full relative p-0.5 transition-colors ${user.isVerified ? 'bg-secondary-container' : 'bg-surface-container-highest'}`}
                      >
                        <div className={`w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ${user.isVerified ? 'bg-secondary translate-x-5' : 'bg-outline-variant translate-x-0'}`}></div>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-on-surface">{user.totalScore || 0} pts</span>
                        <span className="text-[10px] font-bold text-primary">Global Rank #{index + 1}</span>
                      </div>
                      <div className="w-32 bg-surface-container h-1 rounded-full">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(((user.totalScore || 0) / 1000) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-on-surface font-headline">₹{user.walletBalance?.toLocaleString() || 0}</p>
                    <p className="text-[10px] text-secondary font-bold truncate max-w-[120px]">Weekly +{user.weeklyTotal || 0}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-outline-variant hover:text-primary transition-colors hover:bg-primary/5 rounded-lg" title="Adjust Rank">
                        <span className="material-symbols-outlined text-xl">edit_square</span>
                      </button>
                      <button className="p-2 text-outline-variant hover:text-primary transition-colors hover:bg-primary/5 rounded-lg" title="View History">
                        <span className="material-symbols-outlined text-xl">history</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-surface-container-lowest flex items-center justify-between border-t border-surface-container">
          <p className="text-xs text-outline font-medium">Showing {users.length} scholars</p>
          <div className="flex gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-container text-on-surface-variant hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-on-primary font-bold text-xs">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-container text-on-surface-variant hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Logs */}
      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-3xl">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-black font-headline text-white">System Audit Log</h4>
            <span className="text-[10px] bg-white/10 text-white/60 px-2 py-1 rounded font-bold uppercase tracking-widest">Real-time</span>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="mt-1 w-2 h-2 rounded-full bg-secondary-fixed shadow-[0_0_10px_rgba(44,254,201,0.5)]"></div>
              <div>
                <p className="text-sm font-bold text-white">Rank Override Applied</p>
                <p className="text-xs text-white/50">Admin 'Alex' added ₹100 reward to Jane Doe</p>
                <p className="text-[10px] text-white/30 mt-1 uppercase font-bold">2 minutes ago</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 w-2 h-2 rounded-full bg-primary-fixed shadow-[0_0_10px_rgba(137,153,255,0.5)]"></div>
              <div>
                <p className="text-sm font-bold text-white">New Scholar Verified</p>
                <p className="text-xs text-white/50">Scholar 'Meera Sharma' passed verification</p>
                <p className="text-[10px] text-white/30 mt-1 uppercase font-bold">14 minutes ago</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 w-2 h-2 rounded-full bg-tertiary-fixed shadow-[0_0_10px_rgba(255,148,121,0.5)]"></div>
              <div>
                <p className="text-sm font-bold text-white">Wallet Payout Initiated</p>
                <p className="text-xs text-white/50">System sent ₹250.00 to scholar 'Marcus Smith'</p>
                <p className="text-[10px] text-white/30 mt-1 uppercase font-bold">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
