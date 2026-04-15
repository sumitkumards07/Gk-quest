import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { submitQuizResults } from './store/quizSlice';
import confetti from 'canvas-confetti';
import { Capacitor } from '@capacitor/core';
import { useBackNavigation } from './useBackNavigation';

export default function Results() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const handleBack = useBackNavigation();
  const { score: correctAnswers, questions, answers, resultsSubmitted, submitInFlight, submitQuizError } =
    useSelector((state) => state.quiz);
  const [userData, setUserData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const confettiFiredRef = useRef(false);

  const totalQuestions = questions.length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const displayScore = userData?.lastSession?.xpEarned ?? userData?.lastSession?.earnedPoints ?? 0;
  const timeBonus = userData?.lastSession?.timeBonus || 0;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setUserData(snap.data());
    });
    return () => unsubscribe();
  }, [navigate]);

  const submissionStartedRef = useRef(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    if (totalQuestions === 0) {
      navigate('/', { replace: true });
      return;
    }

    if (resultsSubmitted || submitQuizError || submitInFlight || submissionStartedRef.current) return;

    submissionStartedRef.current = true;
    dispatch(submitQuizResults({ score: correctAnswers, answers, questions }));
  }, [
    dispatch,
    navigate,
    totalQuestions,
    correctAnswers,
    answers,
    questions,
    resultsSubmitted,
    submitQuizError,
    submitInFlight
  ]);

  // Watchdog Timer for Submission
  useEffect(() => {
    let timer;
    if (submitInFlight && !resultsSubmitted && !submitQuizError) {
      timer = setTimeout(() => {
        setHasTimedOut(true);
      }, 10000); 
    } else {
      setHasTimedOut(false);
    }
    return () => clearTimeout(timer);
  }, [submitInFlight, resultsSubmitted, submitQuizError]);

  useEffect(() => {
    if (submitInFlight) return;
    if (resultsSubmitted || submitQuizError || hasTimedOut) {
      setIsSubmitting(false);
    }
  }, [submitInFlight, resultsSubmitted, submitQuizError, hasTimedOut]);

  useEffect(() => {
    if (confettiFiredRef.current) return;
    if (isSubmitting) return;
    if (totalQuestions > 0 && correctAnswers > 0 && correctAnswers === totalQuestions) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isSubmitting, totalQuestions, correctAnswers]);

  // Pre-load Ad as soon as the screen is ready
  // Silent background refresh (UnityAds)
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !isSubmitting) {
      import('./unityAds').then(m => m.prepareRewardAd()).catch(() => {});
    }
  }, [isSubmitting]);

  const handleReveal = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsUnlocked(true);
      return;
    }

    try {
      const { showRewardAd } = await import('./unityAds');
      const result = await showRewardAd();

      // unity-ads returns 'COMPLETED' for successful watches
      if (result && (result === 'COMPLETED' || result === 'SKIPPED' || result.completed)) {
        setIsUnlocked(true);
      } else {
        alert("Ad was not completed. Please watch until the end for rewards.");
      }
    } catch (e) {
      console.error('UnityAds Error (Results):', e);
      // Don't block the user forever
      setIsUnlocked(true);
    }
  };

  const handleRetry = () => {
    setHasTimedOut(false);
    setIsSubmitting(true);
    submissionStartedRef.current = false;
    dispatch(submitQuizResults({ score: correctAnswers, answers, questions }));
  };

  if (submitQuizError || hasTimedOut) {
    const errorMsg = hasTimedOut 
      ? "The connection timed out while saving your progress. Please try again."
      : submitQuizError === "ALREADY_PLAYED"
        ? "You have already completed this event and earned your rewards."
        : submitQuizError;

    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center font-body">
        <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center mb-6 border border-red-100">
          <span className="material-symbols-outlined text-red-500 text-4xl">
            {submitQuizError === "ALREADY_PLAYED" ? "verified" : "cloud_off"}
          </span>
        </div>
        <h2 className="font-headline text-2xl font-black text-gray-900 mb-2">
          {submitQuizError === "ALREADY_PLAYED" ? "Quest Already Logged" : "Sync Connection Failed"}
        </h2>
        <p className="text-gray-500 max-w-sm mb-8 text-sm lowercase">
          {errorMsg}
        </p>
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={handleRetry}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-200"
          >
            Retry Connection
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl active:scale-95 transition-all"
          >
            Discard & Exit
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center font-body">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="font-headline text-2xl font-black text-gray-900">Saving Your Progress...</h2>
      </div>
    );
  }

  return (
    <div className="bg-white font-body text-gray-900 min-h-screen pb-32">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 active:scale-95 transition-all" aria-label="Go back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div onClick={() => navigate('/profile')} className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-blue-50 overflow-hidden border-2 border-blue-600/10">
              <img alt="User" className="w-full h-full object-cover" src={userData?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${userData?.uid || 'gkquest'}`} />
            </div>
            <span className="text-blue-600 font-headline text-xl font-bold tracking-tight italic uppercase">GK Quest</span>
          </div>
        </div>
        <div onClick={() => navigate('/wallet')} className="p-2 rounded-full hover:bg-gray-100 text-blue-600 cursor-pointer transition-all">
          <span className="material-symbols-outlined font-fill">account_balance_wallet</span>
        </div>
      </header>

      <main className="px-6 max-w-md mx-auto" style={{ paddingTop: 'calc(5.5rem + var(--safe-top))' }}>
        <section className="text-center mb-10">
          <h1 className="font-headline text-blue-600 text-5xl font-black leading-tight tracking-tighter mb-2 italic">Quest<br/>Complete!</h1>
          <p className="text-gray-400 font-medium text-sm">Your XP has been added to your weekly total.</p>
        </section>

        <div className="relative mb-12">
          {!isUnlocked && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-3xl rounded-[2.5rem] border border-gray-100 p-8 text-center">
              <div className="w-20 h-20 rounded-[2rem] bg-blue-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-200">
                <span className="material-symbols-outlined text-white text-4xl font-fill">visibility_off</span>
              </div>
              <h3 className="font-headline text-gray-900 text-2xl font-black mb-3 italic leading-none">Access Restricted</h3>
              <p className="text-gray-500 font-medium text-sm mb-10 leading-relaxed max-w-[200px]">Unlock the breakdown to view points earned and global rank progress.</p>
              <button
                onClick={handleReveal}
                className="w-full bg-blue-600 text-white font-headline font-black py-5 rounded-2xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-blue-200"
              >
                <span className="material-symbols-outlined">play_circle</span> UNLOCK BREAKDOWN
              </button>
            </div>
          )}

          <div className={`${!isUnlocked ? 'filter blur-3xl opacity-10' : 'animate-in zoom-in duration-500'} transition-all duration-1000`}>
            <section className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 flex flex-col items-center text-center relative overflow-hidden group mb-6">
              <div className="relative z-10 w-full">
                <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-gray-400">XP Earned</span>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <span className="font-headline text-6xl font-black italic tracking-tighter text-blue-600 leading-none">
                    {displayScore}
                  </span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="font-headline text-xl font-black text-gray-300 italic -mb-1">XP</span>
                    {timeBonus > 0 && <span className="text-emerald-500 font-black text-[10px] uppercase">+{timeBonus} Speed</span>}
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-200/50 flex justify-between items-center w-full">
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Accuracy</span>
                    <span className="font-headline text-xl font-black text-gray-900">{accuracy}%</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</span>
                    <span className="font-headline text-emerald-500 text-xl font-black italic">SUCCESS</span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-colors"></div>
            </section>

            <div className="p-6 bg-blue-600 rounded-[2rem] text-white flex justify-between items-center shadow-lg shadow-blue-100 mb-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Weekly Progress</span>
                <span className="font-headline text-2xl font-black italic tracking-tighter text-white">Ranking Up...</span>
              </div>
              <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
            </div>
          </div>
        </div>

        <div className={`space-y-4 mb-20 ${!isUnlocked ? 'opacity-20 pointer-events-none' : ''}`}>
          <button onClick={() => navigate('/ranks')} className="w-full bg-white text-blue-600 py-5 rounded-2xl font-headline font-black text-lg flex items-center justify-center gap-4 border-2 border-blue-600/10 shadow-sm active:scale-95 transition-all">
            GLOBAL LEADERBOARD <span className="material-symbols-outlined font-fill">leaderboard</span>
          </button>
          <button onClick={() => navigate('/review')} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-headline font-black text-lg flex items-center justify-center gap-4 shadow-xl shadow-blue-200 active:scale-95 transition-all">
            REVIEW ANSWER <span className="material-symbols-outlined">analytics</span>
          </button>
        </div>
      </main>

      <div className="fixed bottom-10 left-0 w-full flex justify-center px-6 z-50">
         <button onClick={() => navigate('/')} className="px-10 py-4 bg-gray-900 text-white font-headline font-black rounded-full shadow-2xl active:scale-90 transition-all flex items-center gap-4">
            <span>RETURN TO HQ</span>
            <span className="material-symbols-outlined">home</span>
         </button>
      </div>
    </div>
  );
}
