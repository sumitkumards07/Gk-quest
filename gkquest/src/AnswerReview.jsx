import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { fetchLastSession } from './store/quizSlice';
import { Capacitor } from '@capacitor/core';

export default function AnswerReview() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { questions, answers, score, loading, error } = useSelector((state) => state.quiz);
  const [userData, setUserData] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hydrateStatus, setHydrateStatus] = useState(() => (questions.length > 0 ? 'ready' : 'loading'));

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

  useEffect(() => {
    // 1. If we already have questions in Redux (from just finishing a quiz), we are ready.
    if (questions.length > 0) {
      setHydrateStatus('ready');
      return;
    }

    // 2. Otherwise, we try to fetch the last session from Firestore.
    let cancelled = false;
    setHydrateStatus('loading');
    
    dispatch(fetchLastSession())
      .unwrap()
      .then(() => {
        if (!cancelled) setHydrateStatus('ready');
      })
      .catch((err) => {
        console.warn("Session retrieval failed:", err);
        if (!cancelled) setHydrateStatus('empty');
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, questions.length]);

  // Pre-load Ad as soon as the screen is ready
  useEffect(() => {
    if (Capacitor.isNativePlatform() && hydrateStatus === 'ready') {
      (async () => {
        try {
          const { prepareRewardAd } = await import('./unityAds');
          console.log('Review: Pre-loading Unity Reward...');
          await prepareRewardAd();
        } catch (e) {
          console.warn('Review Preload failed:', e);
        }
      })();
    }
  }, [hydrateStatus]);

  const handleUnlockReview = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsUnlocked(true);
      return;
    }

    try {
      const { prepareRewardAd, showRewardAd } = await import('./unityAds');
      await prepareRewardAd();
      const result = await showRewardAd();
      
      // UnityAds returns 'COMPLETED' for successful watches
      if (result && (result === 'COMPLETED' || result.completed)) {
        setIsUnlocked(true);
      } else {
        alert("Ad was not completed. Please watch until the end to unlock history.");
      }
    } catch (e) {
      console.error('UnityAds Error (Review):', e);
      const rawError = e?.message || e?.code || JSON.stringify(e);
      alert(`Unity Ad failed to initialize.\n\nDiagnostic: ${rawError}`);
      setIsUnlocked(true);
    }
  };

  if (hydrateStatus === 'loading' || loading) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center font-body">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="font-headline text-2xl font-black text-gray-900 tracking-tighter italic">Fetching History...</h2>
      </div>
    );
  }

  if (hydrateStatus === 'error' || (hydrateStatus === 'ready' && questions.length === 0)) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center font-body">
        <h2 className="font-headline text-2xl font-black text-gray-900 mb-2">No answer to review</h2>
        <p className="text-gray-500 max-w-sm mb-8 text-sm">
          {error === 'NO_SESSION_FOUND' ? 'Complete a quiz first, then open review from the home screen.' : 'We could not load your last quiz session.'}
        </p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl active:scale-95 transition-all">
          Back to Home
        </button>
      </div>
    );
  }

  const totalQuestions = questions.length;
  const answeredCount = answers.filter((a) => a.selected !== null).length;
  const correctCount = score;
  const wrongCount = answeredCount - correctCount;

  return (
    <div className="bg-white text-gray-900 min-h-screen font-body pb-32 relative">
      {!isUnlocked && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-8 text-center bg-white/60 backdrop-blur-3xl">
          <div className="relative z-10 max-w-sm">
            <div className="w-24 h-24 rounded-[2.5rem] bg-blue-600 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
              <span className="material-symbols-outlined text-white text-5xl font-fill">visibility_off</span>
            </div>
            <h2 className="font-headline text-gray-900 text-4xl font-extrabold tracking-tighter mb-4 italic leading-none">
              Insight <span className="text-blue-600">Locked</span>
            </h2>
            <p className="text-gray-500 font-medium text-base mb-10 leading-relaxed">
              Watch a quick sponsored clip to access the full answer key and performance breakdown.
            </p>
            <button
              onClick={handleUnlockReview}
              className="w-full bg-blue-600 text-white font-headline font-black py-5 rounded-2xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-blue-200"
            >
              <span className="material-symbols-outlined">play_circle</span> UNLOCK ANSWER
            </button>
          </div>
        </div>
      )}

      <div className={`${!isUnlocked ? 'filter blur-2xl opacity-20' : ''} transition-all duration-700`}>
        <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/results')} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h1 className="font-headline text-xl font-bold tracking-tight text-blue-600">Review Answer</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
            <img className="w-full h-full object-cover" src={userData?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${userData?.uid || 'gkquest'}`} alt="Profile" />
          </div>
        </header>

        <main className="pb-10 max-w-2xl mx-auto px-6" style={{ paddingTop: 'calc(6rem + var(--safe-top))' }}>
          <div className="bg-gray-50 rounded-3xl p-6 mb-8 flex flex-wrap gap-6 items-center justify-between border border-gray-100">
            <div className="flex flex-col">
              <span className="font-headline text-4xl font-extrabold text-blue-600 leading-none">
                {answeredCount}
                <span className="text-gray-400 text-xl font-normal">/{totalQuestions}</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Questions Answered</span>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl flex flex-col items-center">
                <span className="font-bold text-lg">{correctCount}</span>
                <span className="text-[10px] uppercase font-bold tracking-tighter">Correct</span>
              </div>
              <div className="px-4 py-2 bg-red-50 text-red-600 rounded-xl flex flex-col items-center">
                <span className="font-bold text-lg">{wrongCount}</span>
                <span className="text-[10px] uppercase font-bold tracking-tighter">Wrong</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, index) => {
              const answer = answers.find((a) => a.qId === q.qId);
              const isSkipped = !answer || answer.selected === null;
              const isCorrect = answer && answer.isCorrect;

              let borderColor = 'border-gray-200';
              if (!isSkipped) borderColor = isCorrect ? 'border-emerald-500' : 'border-red-500';

              return (
                <div key={q.qId} className={`bg-white rounded-2xl p-6 border-l-8 ${borderColor} shadow-sm border border-gray-100`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-headline font-black text-xs text-gray-400 uppercase tracking-widest">
                      Question {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span
                      className={`material-symbols-outlined ${isSkipped ? 'text-gray-300' : isCorrect ? 'text-emerald-500' : 'text-red-500'} font-fill`}
                    >
                      {isSkipped ? 'info' : isCorrect ? 'verified' : 'cancel'}
                    </span>
                  </div>
                  <h3 className="font-headline text-xl font-bold text-gray-900 mb-6 leading-tight">{q.question}</h3>

                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D'].map((opt) => {
                      const isOptCorrect = q.correctAnswer === opt;
                      const isOptSelected = answer?.selected === opt;

                      let optStyle = 'bg-gray-50 text-gray-500';
                      if (isOptCorrect) optStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                      else if (isOptSelected && !isCorrect) optStyle = 'bg-red-50 text-red-700 border border-red-200';

                      return (
                        <div key={opt} className={`p-4 rounded-xl flex items-center gap-4 ${optStyle}`}>
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-headline ${
                              isOptCorrect ? 'bg-emerald-500 text-white' : isOptSelected ? 'bg-red-500 text-white' : 'bg-white text-gray-400'
                            }`}
                          >
                            {opt}
                          </div>
                          <span className="font-medium text-sm">{q[`option${opt}`]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white flex items-center gap-3 px-8 py-4 rounded-full font-headline font-bold shadow-xl shadow-blue-200 active:scale-95 transition-all"
        >
          <span>Finalize Protocol</span>
          <span className="material-symbols-outlined">done_all</span>
        </button>
      </div>
    </div>
  );
}
