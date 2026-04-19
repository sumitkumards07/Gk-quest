import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { SettingsContext } from './App';
import { fetchDailyQuestions, fetchLastSession } from './store/quizSlice';

function toDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    const parsed = value.toDate();
    return Number.isNaN(parsed?.getTime?.()) ? null : parsed;
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const parsed = new Date(value.seconds * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameUtcDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { weeklyPrizeAmount } = useContext(SettingsContext);
  const [userData, setUserData] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [playedToday, setPlayedToday] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeCampaignTitle, setActiveCampaignTitle] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  /** true when there are active campaigns but user has played all of them */
  const [allCampaignsAttempted, setAllCampaignsAttempted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/login'); return; }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data();
      setUserData(data);
      const lastAttempt = toDateSafe(data?.lastAttemptStartDate || data?.lastAttemptDate);
      if (lastAttempt) {
        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const lastUTC = new Date(Date.UTC(lastAttempt.getUTCFullYear(), lastAttempt.getUTCMonth(), lastAttempt.getUTCDate()));
        setPlayedToday(todayUTC.getTime() === lastUTC.getTime());
      } else {
        setPlayedToday(false);
      }
      setUserLoaded(true);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), where('status', 'in', ['Active', 'active']));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setActiveCampaignId(null);
        setActiveCampaignTitle(null);
        setAllCampaignsAttempted(false);
        setCampaignsLoaded(true);
        return;
      }

      const getTime = (val) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (val.seconds) return val.seconds * 1000;
        return new Date(val).getTime() || 0;
      };

      const sortedDocs = [...snap.docs].sort((a, b) => {
        const timeA = getTime(a.data().createdAt);
        const timeB = getTime(b.data().createdAt);
        return timeB - timeA;
      });

      const now = new Date().toISOString().split('T')[0];
      // IF userData is not yet loaded, we don't know what campaigns are done. 
      // Skip selection until userData arrives to prevent showing already-played quizzes.
      if (!userData) {
        setCampaignsLoaded(false);
        return;
      }
      const doneIds = Array.isArray(userData?.completedCampaignIds) ? userData.completedCampaignIds : [];

      const nextCampaign = sortedDocs.find(d => {
        const data = d.data();
        const notPlayed = !doneIds.includes(d.id);
        const notExpired = !data.endDate || data.endDate >= now;
        return notPlayed && notExpired;
      });

      if (nextCampaign) {
        setActiveCampaignId(nextCampaign.id);
        setActiveCampaignTitle(nextCampaign.data().title);
        setAllCampaignsAttempted(false);
      } else {
        // There ARE active campaigns, but user has finished them all
        setActiveCampaignId(null);
        setActiveCampaignTitle(null);
        setAllCampaignsAttempted(true);
      }
      setCampaignsLoaded(true);
    }, (err) => {
      console.error('Campaign listener error:', err);
      setCampaignsLoaded(true);
    });
    return () => unsub();
  }, [userData]);

  // Derived state — only completedCampaignIds gates the lockout (not attemptedCampaignIds)
  const completedIds = Array.isArray(userData?.completedCampaignIds) ? userData.completedCampaignIds : [];
  const hasFinished = activeCampaignId && completedIds.includes(activeCampaignId);
  const canStartQuiz = activeCampaignId ? !hasFinished : !playedToday;

  // Show "completed" hero when: user played today's daily OR finished all campaigns
  const showCompletedHero = (!canStartQuiz && !activeCampaignId) || hasFinished || allCampaignsAttempted;
  const dailyLockout = showCompletedHero && !activeCampaignId && !allCampaignsAttempted;
  const lastCompletedAt = toDateSafe(userData?.lastSession?.timestamp) || toDateSafe(userData?.lastAttemptDate);
  const todaysXp = lastCompletedAt && isSameUtcDay(lastCompletedAt, new Date())
    ? (userData?.todayScore || 0)
    : 0;

  // Show Rank + Session buttons when the hero says "completed" AND user has session data
  const showRankAndSession = showCompletedHero;

  // Countdown timer for daily lockout
  useEffect(() => {
    if (!dailyLockout) { setTimeLeft(''); return; }
    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [dailyLockout]);

  const handleStartQuiz = async () => {
    if (!canStartQuiz || isStarting) return;
    setIsStarting(true);
    try {
      await dispatch(fetchDailyQuestions()).unwrap();
      navigate('/quiz');
    } catch (err) {
      console.error("Quiz Start Error:", err);
      if (err === 'CAMPAIGN_EMPTY') alert("This challenge has no active questions yet.");
      else if (err === 'NO_QUESTIONS') alert("No questions found for today's quiz.");
      else if (err === 'ALREADY_PLAYED') alert("You've already attempted this quiz.");
      else alert(typeof err === 'string' ? err : "Could not start quiz. Please try again.");
      setIsStarting(false);
    }
  };

  const handleReviewToday = async () => {
    await dispatch(fetchLastSession());
    navigate('/review');
  };

  return (
    <div className="bg-white font-body text-gray-900 antialiased min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
        <div onClick={() => navigate('/profile')} className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-600/10">
            <img 
              alt="User profile" 
              className="w-full h-full object-cover" 
              src={userData?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${userData?.uid || 'gkquest'}`} 
              onError={(e) => { e.target.src = '/logo.png'; }}
            />
          </div>
          <span className="font-headline text-lg font-bold tracking-tight text-gray-900 truncate max-w-[120px] group-hover:text-blue-600 transition-colors">
            {userData?.displayName?.split(' ')[0] || 'Player'}
          </span>
        </div>
        <div onClick={() => navigate('/wallet')} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full shadow-sm cursor-pointer active:scale-95 transition-all">
          <span className="material-symbols-outlined text-blue-600 text-xl font-fill">emoji_events</span>
          <span className="font-headline font-extrabold text-gray-900">₹{userData?.walletBalance || 0}</span>
        </div>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-8" style={{ paddingTop: 'calc(5.5rem + var(--safe-top))' }}>
        {/* Hero Section */}
        <section className={`relative group overflow-hidden rounded-[2.5rem] p-8 shadow-xl transition-transform active:scale-95 duration-200 ${showCompletedHero ? 'bg-gray-100 text-gray-600' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'}`}>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className={`inline-block px-3 py-1 rounded-full font-headline text-[10px] font-bold uppercase tracking-widest ${showCompletedHero ? 'bg-gray-200 text-gray-500' : 'bg-white/20 text-white'}`}>
                {showCompletedHero ? (allCampaignsAttempted ? 'All Done' : 'Completed') : 'Live Now'}
              </span>
              {userData?.streak > 0 && (
                <div className="flex items-center gap-1.5 bg-orange-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-orange-500/30">
                  <span className="material-symbols-outlined text-orange-500 text-sm font-fill">local_fire_department</span>
                  <span className="font-headline text-[10px] font-black text-white">{userData.streak} DAY STREAK</span>
                </div>
              )}
            </div>

            <h1 className="font-headline text-4xl font-extrabold tracking-tight mb-2 leading-tight">
              {showCompletedHero
                ? (allCampaignsAttempted ? 'All Quizzes Done!' : 'Quiz Completed!')
                : (activeCampaignTitle || "Today's Quiz is Live!")}
            </h1>

            <p className={`font-medium max-w-[260px] mb-6 ${showCompletedHero ? 'text-gray-500' : 'text-white/80'}`}>
              {showCompletedHero ? (
                allCampaignsAttempted
                  ? 'Great work! Check your rank or review your last answer below.'
                  : dailyLockout
                    ? <>Next daily quiz in <span className="inline-block min-w-[11ch] tabular-nums tracking-tight">{timeLeft || '—'}</span>.</>
                    : "You've finished this event. Check your rank or review your answer."
              ) : (
                'Test your knowledge and climb the ranks today.'
              )}
            </p>

            {!showCompletedHero && (
              <div className="mb-6 space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-bold text-white/90">
                  <span className="material-symbols-outlined text-sm font-fill">emoji_events</span>
                  <span>WEEKLY TOP SCHOLAR WINS ₹{weeklyPrizeAmount} REWARD!</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-white/90">
                  <span className="material-symbols-outlined text-sm font-fill">payments</span>
                  <span>100% FREE ENTRY - NO FEES</span>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3">
              {showRankAndSession ? (
                <>
                  {/* Always show Rank button when all quizzes are done */}
                  <button
                    onClick={() => navigate('/ranks')}
                    className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white text-blue-600 border border-blue-600/10 font-headline font-extrabold text-lg shadow-lg active:scale-95 transition-all"
                  >
                    <span>See Rank</span>
                    <span className="material-symbols-outlined font-bold font-fill">leaderboard</span>
                  </button>
                  {/* Show Session button only if user has session data */}
                  {userData?.lastSession && (
                    <button
                      onClick={handleReviewToday}
                      className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white text-blue-600 border border-blue-600/10 font-headline font-extrabold text-lg shadow-lg active:scale-95 transition-all"
                    >
                      <span>Review Answer</span>
                      <span className="material-symbols-outlined font-bold">analytics</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleStartQuiz}
                  disabled={!canStartQuiz || !campaignsLoaded || isStarting}
                  className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-headline font-extrabold text-lg transition-all active:scale-95 ${
                    !canStartQuiz || !campaignsLoaded || isStarting
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-white text-blue-600 shadow-lg hover:brightness-105'
                  }`}
                >
                  {isStarting ? (
                    <React.Fragment>
                      <span>Assembling...</span>
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <span>{!campaignsLoaded ? 'Loading…' : 'Start Quiz'}</span>
                      <span className="material-symbols-outlined font-bold">{!campaignsLoaded ? 'lock' : 'play_arrow'}</span>
                    </React.Fragment>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="z-10">
              <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-gray-400">Today's XP</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-headline text-3xl font-black text-blue-600">{todaysXp}</span>
                <span className="font-headline text-xl font-bold text-gray-300">XP</span>
              </div>
            </div>
          </div>

          <div onClick={() => navigate('/ranks')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden cursor-pointer active:scale-95 transition-all">
            <div className="z-10">
              <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-gray-400">Weekly Total</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-headline text-3xl font-black text-gray-900">{userData?.weeklyTotal || 0}</span>
                <span className="material-symbols-outlined text-blue-600 text-sm font-bold font-fill">stars</span>
              </div>
            </div>
          </div>

          <div className="col-span-2 bg-gray-50 p-6 rounded-[2rem]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline font-bold text-gray-900">Weekly Goal</h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{Math.min(Math.round(((userData?.weeklyTotal || 0) / 500) * 100), 100)}%</span>
            </div>
            <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden p-[2px]">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(((userData?.weeklyTotal || 0) / 500) * 100, 100)}%` }}></div>
            </div>
          </div>
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-4 bg-white/95 backdrop-blur-2xl border-t border-gray-100 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] pb-8" style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}>
        <button className="flex flex-col items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-2xl py-2 px-6 active:scale-90 transition-transform">
          <span className="material-symbols-outlined font-fill">home</span>
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
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">person</span>
          <span className="font-headline text-[10px] font-bold mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}
