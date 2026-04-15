import { useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Calculates the most recent Sunday at 00:00:00 UTC.
 * If today is Sunday, it returns today's midnight UTC.
 */
export const getLastSundayUTC = () => {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = now.getUTCDate() - day; // Move back to the nearest Sunday
  const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
  return sunday.getTime();
};

export const useWeeklyReset = (user, userData) => {
  // Tracks whether we've already triggered a reset this session.
  // This prevents an infinite loop caused by Firestore emitting an intermediate
  // "pending" snapshot after serverTimestamp() is written, where lastWeeklyReset
  // temporarily appears as null (making userLastReset = 0 < lastSunday, retriggering the reset).
  const resetAttempted = useRef(false);

  useEffect(() => {
    if (!user || !userData) return;

    // Once reset has been attempted this session, bail out immediately.
    if (resetAttempted.current) return;

    const lastSunday = getLastSundayUTC();

    // Resilient time extraction — handles Firestore Timestamp, raw seconds obj, and Date strings.
    const getTime = (val) => {
      if (!val) return 0;
      if (typeof val.toMillis === 'function') return val.toMillis();
      if (val.seconds) return val.seconds * 1000;
      return new Date(val).getTime() || 0;
    };

    const userLastReset = getTime(userData.lastWeeklyReset);

    // If the user's last reset was before the most recent Sunday, trigger a reset.
    if (userLastReset < lastSunday) {
      // Set the guard BEFORE the async call to block any re-runs from pending snapshots.
      resetAttempted.current = true;

      const performReset = async () => {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            weeklyTotal: 0,
            totalScore: 0,
            lastWeeklyReset: serverTimestamp(),
          });
          console.log(
            '[WeeklyReset] Score reset for new week starting:',
            new Date(lastSunday).toISOString()
          );
        } catch (error) {
          console.error('[WeeklyReset] Failed to reset weekly score:', error);
          // On failure, clear the guard so it can retry on the next page load.
          resetAttempted.current = false;
        }
      };

      performReset();
    }
  }, [user, userData]);
};
