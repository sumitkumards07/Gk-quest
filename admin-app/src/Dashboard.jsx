import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getCountFromServer, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0,
    questions: 0,
    payouts: 0,
    todayParticipation: 0,
    participationBins: Array(24).fill(0)
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [topScholars, setTopScholars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const usersCount = await getCountFromServer(collection(db, 'users'));
        const questionsCount = await getCountFromServer(collection(db, 'questions'));
        
        // 1. Calculate Real Payout Volume (Sum of all Completed payouts)
        const payoutQ = query(collection(db, 'payout_requests'), where('status', '==', 'Completed'));
        const payoutSnap = await getDocs(payoutQ);
        const totalPaid = payoutSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
        
        // 2. Calculate real participation (Users who played today UTC)
        const todayAtMidnight = new Date();
        todayAtMidnight.setUTCHours(0, 0, 0, 0);
        const participationQuery = query(
          collection(db, 'users'), 
          where('lastAttemptDate', '>=', todayAtMidnight)
        );
        const participationCount = await getCountFromServer(participationQuery);

        // 3. Hourly Participation Binning (Last 1000 today)
        const participantsSnap = await getDocs(query(participationQuery, limit(1000)));
        const bins = Array(24).fill(0);
        participantsSnap.docs.forEach(doc => {
          const date = doc.data().lastAttemptDate?.toDate();
          if (date) {
            const hour = date.getHours();
            bins[hour] += 1;
          }
        });

        setStats({
          users: usersCount.data().count,
          questions: questionsCount.data().count,
          totalPaid: totalPaid,
          todayParticipation: participationCount.data().count,
          participationBins: bins
        });
      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
      }
    };

    const q = query(collection(db, 'payout_requests'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentActivities(activities);
      setLoading(false);
    });

    const topQ = query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(5));
    const unsubscribeTop = onSnapshot(topQ, (snapshot) => {
      const scholars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTopScholars(scholars);
    });

    fetchCounts();
    return () => {
      unsubscribe();
      unsubscribeTop();
    };
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-body">
      {/* Hero Section / Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat Card 1 */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined">person_play</span>
            </div>
            <span className="text-secondary text-xs font-bold bg-secondary-container/30 px-2 py-1 rounded">+12%</span>
          </div>
          <h3 className="text-on-surface-variant text-sm font-medium">Active Users</h3>
          <p className="text-3xl font-black font-headline text-on-surface mt-1">{loading ? '...' : stats.users.toLocaleString()}</p>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-secondary/10 rounded-lg text-secondary">
              <span className="material-symbols-outlined">quiz</span>
            </div>
            <span className="text-secondary text-xs font-bold bg-secondary-container/30 px-2 py-1 rounded">New</span>
          </div>
          <h3 className="text-on-surface-variant text-sm font-medium">Total Questions</h3>
          <p className="text-3xl font-black font-headline text-on-surface mt-1">{loading ? '...' : stats.questions.toLocaleString()}</p>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-tertiary/10 rounded-lg text-tertiary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-error text-xs font-bold bg-error-container/10 px-2 py-1 rounded">Pending</span>
          </div>
          <h3 className="text-on-surface-variant text-sm font-medium">Total Payouts</h3>
          <p className="text-3xl font-black font-headline text-on-surface mt-1">₹{loading ? '...' : ((stats.totalPaid || 0) > 1000 ? ((stats.totalPaid || 0) / 1000).toFixed(1) + 'M' : (stats.totalPaid || 0).toLocaleString())}</p>
        </div>

        {/* Stat Card 4 */}
        <div className="bg-primary text-on-primary p-6 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #2444eb 0%, #8999ff 100%)' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <span className="material-symbols-outlined">bolt</span>
            </div>
          </div>
          <h3 className="text-on-primary/70 text-sm font-medium">Today's Participation</h3>
          <p className="text-3xl font-black font-headline mt-1">{loading ? '...' : stats.todayParticipation.toLocaleString()}</p>
          <div className="mt-4 w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-secondary-container h-full w-3/4 shadow-[0_0_8px_#45fec9]"></div>
          </div>
        </div>
      </section>

      {/* Middle Section: Chart and Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Chart (Visual Representation) */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 relative overflow-hidden">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl font-black font-headline">Quiz Participation Growth</h2>
              <p className="text-on-surface-variant text-sm">Hourly engagement tracking across regions</p>
            </div>
            <div className="flex gap-2">
              <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-surface-container text-on-surface">Weekly</button>
              <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-on-primary">Daily</button>
            </div>
          </div>
          
          {/* Abstract Chart Visual */}
          <div className="h-64 flex items-end gap-2 px-2 relative">
            {stats.participationBins.slice(0, 12).map((count, i) => {
              const maxCount = Math.max(...stats.participationBins, 1);
              const height = (count / maxCount) * 100;
              const isCurrentHour = new Date().getHours() === i;
              
              return (
                <div 
                  key={i} 
                  title={`${i}:00 - ${count} scholars`}
                  className={`flex-1 rounded-t-lg transition-colors ${isCurrentHour ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-surface-container-low hover:bg-primary/20'}`} 
                  style={{height: `${Math.max(height, 5)}%`}}
                ></div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-bold text-outline-variant uppercase tracking-widest px-1">
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>00:00</span>
          </div>
        </div>

        {/* Quick Actions Bento */}
        <div className="flex flex-col gap-6">
          <div onClick={() => navigate('/questions')} className="bg-surface-container-highest p-6 rounded-xl flex flex-col justify-between min-h-[160px] group transition-all hover:bg-primary hover:text-on-primary cursor-pointer">
            <div className="flex justify-between">
              <span className="material-symbols-outlined text-3xl">add_circle</span>
              <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
            </div>
            <div>
              <h4 className="font-headline font-extrabold text-lg">Create New Quiz</h4>
              <p className="text-sm opacity-70">Deploy fresh content to users</p>
            </div>
          </div>
          <div onClick={() => navigate('/payouts')} className="bg-secondary-container p-6 rounded-xl flex flex-col justify-between min-h-[160px] group transition-all hover:bg-secondary hover:text-on-secondary cursor-pointer">
            <div className="flex justify-between">
              <span className="material-symbols-outlined text-3xl text-secondary group-hover:text-on-secondary">verified_user</span>
              <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
            </div>
            <div>
              <h4 className="font-headline font-extrabold text-lg text-on-secondary-container group-hover:text-on-secondary">Approve Payouts</h4>
              <p className="text-sm text-on-secondary-container opacity-70 group-hover:text-on-secondary">Manage pending verifications</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section: Recent Activity & Live Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Table-like List */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center">
            <h2 className="text-lg font-black font-headline">Recent Transactions & Scores</h2>
            <button onClick={() => navigate('/payouts')} className="text-primary text-xs font-bold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {loading ? (
              <div className="p-10 text-center text-outline-variant italic">Syncing with global ledger...</div>
            ) : recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="px-8 py-5 flex items-center gap-4 hover:bg-surface-container-low transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center font-bold text-primary">
                    {activity.userName?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-sm">{activity.userName}</h5>
                    <p className="text-xs text-on-surface-variant">{activity.method} Withdrawal</p>
                  </div>
                  <div className="text-right">
                    <p className="font-headline font-bold text-primary">₹{activity.amount?.toLocaleString()}</p>
                    <p className="text-[10px] text-outline-variant">{activity.timestamp ? new Date(activity.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</p>
                  </div>
                  <span className={`material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity ${activity.status === 'Completed' ? 'text-secondary' : 'text-outline-variant'}`}>
                    {activity.status === 'Completed' ? 'check_circle' : 'hourglass_empty'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-outline-variant">No recent activity detected.</div>
            )}
          </div>
        </div>

        {/* Live Performance Insight */}
        <div className="bg-surface-container flex flex-col p-8 rounded-xl border border-outline-variant/10">
          <h3 className="font-headline font-black text-lg mb-4">System Performance</h3>
          <div className="space-y-6 flex-1">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold">API Latency</span>
                <span className="text-xs text-secondary font-bold">24ms</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full">
                <div className="h-full bg-secondary rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold">Database Load</span>
                <span className="text-xs text-on-surface-variant font-bold">42%</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full">
                <div className="h-full bg-primary rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold">Payment Gateway</span>
                <span className="text-xs text-secondary font-bold">Healthy</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full">
                <div className="h-full bg-secondary-container rounded-full shadow-[0_0_8px_#45fec9]" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-outline-variant/20">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-tighter">AI Insight</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">Engagement is steady today. Keep an eye on flagged payouts.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
