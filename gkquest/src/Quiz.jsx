import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { tickTimer, submitAnswer, fetchPlatformSettings } from './store/quizSlice';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useBackNavigation } from './useBackNavigation';

export default function Quiz() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleBack = useBackNavigation();
  const { questions, currentIndex, timeRemaining, isFinished, loading, error } = useSelector((state) => state.quiz);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userData, setUserData] = useState(null);
  const [validationState, setValidationState] = useState('idle');

  const currentQ = questions[currentIndex];
  const timerZeroHandledRef = useRef(false);

  useEffect(() => {
    dispatch(fetchPlatformSettings());
    const user = auth.currentUser;
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        setUserData(snap.data());
      });
      return () => unsubscribe();
    }
  }, [dispatch]);

  useEffect(() => {
    timerZeroHandledRef.current = false;
  }, [currentIndex]);

  useEffect(() => {
    if (isFinished) {
      navigate('/results');
      return;
    }
    if (questions.length > 0) {
      const timerInterval = setInterval(() => {
        dispatch(tickTimer());
      }, 1000);
      return () => clearInterval(timerInterval);
    }
  }, [isFinished, dispatch, navigate, questions.length]);

  const isSubmittingRef = useRef(false);

  const handleNext = useCallback(() => {
    if (isSubmittingRef.current || !currentQ) return;
    
    isSubmittingRef.current = true;
    // SILENT SUBMISSION: No green/red feedback during quiz
    dispatch(submitAnswer(selectedOption));
    setSelectedOption(null);
    
    // Clear the guard after a tick to allow the next question
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 10);
  }, [currentQ, selectedOption, dispatch]);

  useEffect(() => {
    if (isFinished || questions.length === 0) return;
    if (timeRemaining > 0) return;
    if (timerZeroHandledRef.current || isSubmittingRef.current) return;
    
    timerZeroHandledRef.current = true;
    isSubmittingRef.current = true;
    
    dispatch(submitAnswer(selectedOption));
    setSelectedOption(null);

    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 10);
  }, [
    timeRemaining,
    isFinished,
    questions.length,
    selectedOption,
    dispatch,
  ]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center font-body">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="font-headline text-2xl font-black text-gray-900">Assembling Your Quest...</h2>
      </div>
    );
  }

  if (error) {
    const msg =
      error === 'CAMPAIGN_EMPTY'
        ? 'Campaign is active, but no questions were found!'
        : error === 'NO_QUESTIONS'
          ? 'No quiz questions are available yet. Please try again later.'
          : error === 'ALREADY_PLAYED'
            ? 'You have already completed this quiz.'
            : 'There are no active quiz campaigns right now.';
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center font-body">
        <h2 className="font-headline text-2xl font-black text-gray-900 mb-2">No Active Quiz Found</h2>
        <p className="text-gray-500 max-w-sm mb-8">{msg}</p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl active:scale-95 transition-all">
          Return Home
        </button>
      </div>
    );
  }

  if (isFinished || !currentQ) return null;

  return (
    <div className="bg-white text-gray-900 font-body min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 active:scale-95 transition-all" aria-label="Go back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-label text-xs font-bold uppercase tracking-widest">Question</span>
            <span className="font-headline text-xl font-bold text-blue-600 tracking-tight">
              {currentIndex + 1} <span className="text-gray-300 font-normal">/ {questions.length}</span>
            </span>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-1.5 rounded-full flex items-center gap-2 border border-gray-100">
          <span className="material-symbols-outlined text-blue-600 text-sm">schedule</span>
          <span
            className={`font-headline font-extrabold tabular-nums tracking-tighter ${timeRemaining < 30 ? 'text-red-500' : 'text-blue-600'}`}
          >
            {formatTime(timeRemaining)}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
          <img alt="User" src={userData?.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${userData?.uid || 'gkquest'}`} />
        </div>
      </header>

      <main className="flex-grow pb-32 px-6 max-w-2xl mx-auto w-full flex flex-col justify-center" style={{ paddingTop: 'calc(5.5rem + var(--safe-top))' }}>
        <div className="w-full h-2 bg-gray-100 rounded-full mb-12 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
        </div>

        <section className="mb-12">
          <h1 className="font-headline text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">{currentQ.question}</h1>
        </section>

        <section className="space-y-4">
          {['A', 'B', 'C', 'D'].map((opt) => {
            const isSelected = selectedOption === opt;
            const optionText = currentQ[`option${opt}`];
            let stateStyle = 'bg-gray-50 hover:bg-gray-100 active:scale-[0.98]';

            if (isSelected) {
              stateStyle = 'bg-blue-600 text-white shadow-lg shadow-blue-200';
            }

            return (
              <button
                key={opt}
                onClick={() => setSelectedOption(opt)}
                className={`w-full text-left p-5 min-h-[4.5rem] rounded-2xl transition-all flex items-center gap-4 duration-300 ${stateStyle}`}
              >
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-xl font-headline font-bold text-lg ${isSelected ? 'bg-white/20' : 'bg-white text-blue-600 shadow-sm'}`}
                >
                  {opt}
                </div>
                <span className="font-medium text-lg flex-grow">{optionText}</span>
                {isSelected && (
                  <span className="material-symbols-outlined font-fill">check_circle</span>
                )}
              </button>
            );
          })}
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-6 bg-white" style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleNext}
            className="w-full bg-blue-600 text-white font-headline font-extrabold text-xl py-5 rounded-2xl shadow-lg active:scale-95 flex items-center justify-center gap-3"
          >
            <span>{currentIndex === questions.length - 1 ? 'Submit Quiz' : 'Next Question'}</span>
            <span className="material-symbols-outlined">{currentIndex === questions.length - 1 ? 'check_circle' : 'arrow_forward'}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
