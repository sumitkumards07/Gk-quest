import React, { useEffect, useState, lazy, Suspense, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { fetchPlatformSettings } from './store/quizSlice';
import { useWeeklyReset } from './hooks/useWeeklyReset';

// Settings Context for dynamic values (Weekly Prize, etc.)
export const SettingsContext = React.createContext({
  weeklyPrizeAmount: 100,
  minWithdrawal: 500,
  maintenanceMode: false
});
import { Capacitor } from '@capacitor/core';

// Lazy loading for split bundles
const Login = lazy(() => import('./Login'));
const Home = lazy(() => import('./Home'));
const Quiz = lazy(() => import('./Quiz'));
const Results = lazy(() => import('./Results'));
const AnswerReview = lazy(() => import('./AnswerReview'));
const Ranks = lazy(() => import('./Ranks'));
const Wallet = lazy(() => import('./Wallet'));
const Maintenance = lazy(() => import('./Maintenance'));
const Profile = lazy(() => import('./Profile'));
const Legal = lazy(() => import('./Legal'));
const Support = lazy(() => import('./Support'));

// Auth-gated route wrapper
function PrivateRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Minimal splash — no artificial progress bar, dismiss ASAP
function SplashScreen({ onReady }) {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center font-body p-6">
      <div className="mb-6 w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center shadow-xl shadow-blue-200 overflow-hidden p-4">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
      </div>
      <h1 className="font-headline text-4xl font-black italic tracking-tighter text-blue-600 mb-8">GK Quest</h1>
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

// Main app content
function AppContent() {
  const dispatch = useDispatch();
  const [user, setUser] = useState(undefined);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({ weeklyPrizeAmount: 100, minWithdrawal: 500 });
  const [userData, setUserData] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [splashDismissed, setSplashDismissed] = useState(false);

  // Trigger Weekly Reset Logic
  useWeeklyReset(user, userData);

  // 1. Native UI + AdMob — completely fire-and-forget, NEVER blocks UI
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // StatusBar — fire and forget
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
      }).catch(() => {});

      // UnityAds — fire and forget (runs entirely in background)
      import('./unityAds').then(m => m.initializeUnityAds()).catch(() => {});
    }
  }, []);

  // 2. Auth & Settings — these are what actually gate the splash
  useEffect(() => {
    // Fallback: If Firebase takes too long, dismiss splash after 4.5s
    const fallbackTimer = setTimeout(() => {
      setSettingsLoaded(true);
      setUser(prev => prev === undefined ? null : prev); 
    }, 4500);

    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u || null), () => setUser(null));
    dispatch(fetchPlatformSettings());
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.maintenanceMode !== undefined) setMaintenanceMode(data.maintenanceMode);
          setGlobalSettings(data);
          
          // Keep UnityAds configuration synced with Admin Settings
          import('./unityAds').then(m => m.setUnityConfig(data)).catch(() => {});
        }
        setSettingsLoaded(true);
      },
      (err) => {
        console.error('Settings fetch error:', err);
        setSettingsLoaded(true);
      }
    );

    let unsubUser = () => {};
    if (user) {
      unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) setUserData(snap.data());
      });
    }

    return () => { clearTimeout(fallbackTimer); unsubAuth(); unsubSettings(); unsubUser(); };
  }, [dispatch, user]);

  // Dismiss splash the instant auth + settings are resolved
  const isReady = user !== undefined && settingsLoaded;

  useEffect(() => {
    if (isReady && !splashDismissed) {
      setSplashDismissed(true);
    }
  }, [isReady, splashDismissed]);

  if (!splashDismissed) return <SplashScreen />;
  if (maintenanceMode) return <Maintenance />;

  return (
    <SettingsContext.Provider value={globalSettings}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={ user ? <Navigate to="/" replace /> : <Login /> } />
          <Route path="/" element={ <PrivateRoute user={user}><Home /></PrivateRoute> } />
          <Route path="/quiz" element={ <PrivateRoute user={user}><Quiz /></PrivateRoute> } />
          <Route path="/results" element={ <PrivateRoute user={user}><Results /></PrivateRoute> } />
          <Route path="/review" element={ <PrivateRoute user={user}><AnswerReview /></PrivateRoute> } />
          <Route path="/ranks" element={ <PrivateRoute user={user}><Ranks /></PrivateRoute> } />
          <Route path="/wallet" element={ <PrivateRoute user={user}><Wallet /></PrivateRoute> } />
          <Route path="/profile" element={ <PrivateRoute user={user}><Profile /></PrivateRoute> } />
          <Route path="/legal" element={<Legal />} />
          <Route path="/privacy" element={<Legal />} />
          <Route path="/support" element={<PrivateRoute user={user}><Support /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </SettingsContext.Provider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
