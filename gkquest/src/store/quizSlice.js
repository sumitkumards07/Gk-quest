import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  addDoc,
  serverTimestamp,
  limit,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    const parsed = value.toDate();
    return Number.isNaN(parsed?.getTime?.()) ? null : parsed;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const parsed = new Date(value.seconds * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Async Thunk to fetch platform settings (timer, rewards, etc)
export
const fetchPlatformSettings = createAsyncThunk(
  "quiz/fetchSettings",
  async (_, { rejectWithValue }) => {
    try {
const docRef = doc(db, "settings", "global");
const docSnap = await getDoc(docRef);
if (docSnap.exists()) {
return docSnap.data();
      }
return { secondsPerQuestion: 15, correctAnswerPoints: 10 }; // Defaults
    } catch (error) {
return rejectWithValue(error.message);
    }
  },
);

// Async Thunk to fetch questions from Firestore
export
const fetchDailyQuestions = createAsyncThunk(
  "quiz/fetchQuestions",
  async (_, { rejectWithValue }) => {
const user = auth.currentUser;
if (!user)
return rejectWithValue("Authentication required");

    try {
      // 1. Determine Active Campaign
      const campQuery = query(collection(db, 'campaigns'), where('status', 'in', ['Active', 'active']));
      const campSnap = await getDocs(campQuery);
      
      // 2. Read user profile once
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const doneIds = Array.isArray(userData.completedCampaignIds) ? userData.completedCampaignIds : [];

      let activeCampId = null;
      if (!campSnap.empty) {
        const getTime = (val) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (val.seconds) return val.seconds * 1000;
          return new Date(val).getTime() || 0;
        };

        const sortedDocs = [...campSnap.docs].sort((a, b) => {
          const timeA = getTime(a.data().createdAt);
          const timeB = getTime(b.data().createdAt);
          return timeB - timeA;
        });

        const now = new Date().toISOString().split('T')[0];
        for (const campDoc of sortedDocs) {
          const cid = campDoc.id;
          const cData = campDoc.data();
          const notPlayed = !doneIds.includes(cid);
          const notExpired = !cData.endDate || cData.endDate >= now;
          
          if (notPlayed && notExpired) {
            activeCampId = cid;
            break;
          }
        }
      }

      // 3. Check lockout
      if (activeCampId) {
        // Active unplayed campaign found — proceed
      } else if (!campSnap.empty) {
        // All active campaigns completed
        return rejectWithValue("ALREADY_PLAYED");
      } else {
        // No campaigns exist — daily fallback, limit 1 per day
        const lastDate = toDateSafe(userData.lastAttemptStartDate || userData.lastAttemptDate);
        if (lastDate) {
          const today = new Date();
          if (
            lastDate.getUTCFullYear() === today.getUTCFullYear() &&
            lastDate.getUTCMonth() === today.getUTCMonth() &&
            lastDate.getUTCDate() === today.getUTCDate()
          ) {
            return rejectWithValue("ALREADY_PLAYED");
          }
        }
      }

      // 4. Fetch questions
      let q;
      if (activeCampId) {
        q = query(
          collection(db, "questions"),
          where("campaignId", "==", activeCampId),
        );
      } else {
        q = query(collection(db, "questions"), limit(100));
      }
      const querySnapshot = await getDocs(q);
      let availableQuestions = querySnapshot.docs.map((d) => ({
        qId: d.id,
        ...d.data(),
      }));
      if (!activeCampId) {
        availableQuestions = availableQuestions.filter((q) => !q.campaignId);
      }

      // 4b. For campaigns: serve ALL questions. For daily fallback: cap at 10.
      const selectedQuestions = activeCampId
        ? shuffleArray(availableQuestions)
        : shuffleArray(availableQuestions).slice(0, 10);

      if (selectedQuestions.length === 0) {
        if (activeCampId) return rejectWithValue("CAMPAIGN_EMPTY");
        return rejectWithValue("NO_QUESTIONS");
      }

      // 5. Track attempt (NON-BLOCKING — never prevents quiz from starting)
      updateDoc(userRef, {
        lastAttemptStartDate: serverTimestamp(),
        ...(activeCampId ? { attemptedCampaignIds: arrayUnion(activeCampId) } : {}),
      }).catch(e => {
        console.warn("Attempt tracking write failed (non-blocking):", e.message);
      });

      return selectedQuestions;
    } catch (error) {
      console.error("Fetch Questions Error:", error);
      return rejectWithValue(error.message);
    }
  },
);

// Helper: strip question objects to only Firestore-safe essential fields
function sanitizeQuestion(q) {
  return {
    qId: q.qId || '',
    question: q.question || '',
    optionA: q.optionA || '',
    optionB: q.optionB || '',
    optionC: q.optionC || '',
    optionD: q.optionD || '',
    correctAnswer: q.correctAnswer || '',
    campaignId: q.campaignId || null,
  };
}

function sanitizeAnswer(a) {
  return {
    qId: a.qId || '',
    selected: a.selected ?? null,
    correct: a.correct || '',
    isCorrect: !!a.isCorrect,
  };
}

// Async Thunk to submit results and update user profile
export
const submitQuizResults = createAsyncThunk(
  "quiz/submitResults",
  async ({ score, answers, questions }, { getState, rejectWithValue }) => {
    const user = auth.currentUser;
    if (!user) return rejectWithValue("User not authenticated");

    try {
      const userRef = doc(db, "users", user.uid);
      const { totalTimeSeconds, settings } = getState().quiz;
      const parTime = questions.length * (settings?.secondsPerQuestion || 15);

      const xpFromCorrect = (score || 0) * (settings?.correctAnswerPoints || 10);
      const completionBonus = 10;

      let timeBonus = 0;
      if (score > 0 && totalTimeSeconds > 0) {
        if (totalTimeSeconds < parTime * 0.5) timeBonus = 5;
        else if (totalTimeSeconds < parTime * 0.75) timeBonus = 2;
      }

      const xpEarned = (xpFromCorrect || 0) + (timeBonus || 0) + completionBonus;
      const finishedCampaignId = questions[0]?.campaignId || null;

      // 1. Read user profile — failures here should NOT block the write
      let newStreak = 1;
      let todayScoreUpdate = xpEarned; // safe default: set directly
      let userExists = false;

      try {
        const userSnap = await getDoc(userRef);
        userExists = userSnap.exists();

        if (userExists) {
          const data = userSnap.data();

          // Check if already completed this campaign
          if (finishedCampaignId) {
            const ids = Array.isArray(data.completedCampaignIds) ? data.completedCampaignIds : [];
            if (ids.includes(finishedCampaignId)) {
              return { success: true, alreadyRecorded: true };
            }
          }

          // Calculate streak
          const lastDate = toDateSafe(data?.lastSession?.timestamp) || toDateSafe(data.lastAttemptDate);
          if (lastDate) {
            const today = new Date();
            const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
            const lastDateUTC = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), lastDate.getUTCDate()));
            const diffDays = Math.floor((todayUTC - lastDateUTC) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) newStreak = (data.streak || 0) + 1;
            else if (diffDays === 0) newStreak = data.streak || 1;
            else newStreak = 1;

            // Same-day: increment todayScore. New day: reset it.
            const isSameDay =
              lastDate.getUTCFullYear() === today.getUTCFullYear() &&
              lastDate.getUTCMonth() === today.getUTCMonth() &&
              lastDate.getUTCDate() === today.getUTCDate();
            todayScoreUpdate = isSameDay ? increment(xpEarned) : xpEarned;
          }
        }
      } catch (readErr) {
        console.warn("Pre-read failed (proceeding with defaults):", readErr.message);
        // Continue with safe defaults — the write is what matters
      }

      // 2. Sanitize session data (strip undefined values that Firestore rejects)
      const cleanQuestions = questions.map(sanitizeQuestion);
      const cleanAnswers = answers.map(sanitizeAnswer);

      const updatePayload = {
        totalScore: increment(xpEarned),
        weeklyTotal: increment(xpEarned),
        todayScore: todayScoreUpdate,
        questionsAttempted: increment(questions.length),
        totalCorrect: increment(score),
        lastAttemptDate: serverTimestamp(),
        lastCampaignPlayed: finishedCampaignId,
        streak: newStreak,
        lastSession: {
          questions: cleanQuestions,
          answers: cleanAnswers,
          score: score || 0,
          timeBonus: timeBonus || 0,
          xpEarned: xpEarned || 0,
          totalTimeSeconds: totalTimeSeconds || 0,
          timestamp: new Date().toISOString(),
        },
      };

      if (finishedCampaignId) {
        updatePayload.completedCampaignIds = arrayUnion(finishedCampaignId);
      }

      // 3. Write profile — this is the critical path
      try {
        await setDoc(userRef, updatePayload, { merge: true });
      } catch (writeErr) {
        console.error("Profile write failed:", writeErr.code, writeErr.message);
        return rejectWithValue(writeErr.message || "DATABASE_ERROR");
      }

      // 4. Transaction log — fire-and-forget
      addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "Quiz XP",
        xp: xpEarned,
        score: score || 0,
        status: "Success",
        timestamp: serverTimestamp(),
      }).catch(e => console.warn("Transaction log failed (non-blocking):", e));

      return { success: true };
    } catch (error) {
      console.error("Submission Error:", error);
      return rejectWithValue(error.message || "SUBMISSION_ERROR");
    }
  },
);

// Async Thunk to fetch persisted session
export
const fetchLastSession = createAsyncThunk(
  "quiz/fetchLastSession",
  async (_, { rejectWithValue }) => {
const user = auth.currentUser;
if (!user)
return rejectWithValue("Authentication required");

    try {
const userRef = doc(db, "users", user.uid);
const userSnap = await getDoc(userRef);
if (userSnap.exists() && userSnap.data().lastSession) {
return userSnap.data().lastSession;
      }
return rejectWithValue("NO_SESSION_FOUND");
    } catch (error) {
return rejectWithValue(error.message);
    }
  },
);
const initialState = {
  questions: [],
  currentIndex: 0,
  timeRemaining: 15,
  settings: {
    secondsPerQuestion: 15,
    correctAnswerPoints: 10,
  },
  answers: [],
  score: 0,
  totalTimeSeconds: 0,
  isFinished: false,
  loading: false,
  error: null,
  resultsSubmitted: false,
  submitInFlight: false,
  submitQuizError: null,
};
export
const quizSlice = createSlice({
  name: "quiz",
  initialState,
  reducers: {
    tickTimer: (state) => {
if (state.timeRemaining > 0 && !state.isFinished) {
        state.timeRemaining -= 1;
        state.totalTimeSeconds += 1;
      }
    },
    submitAnswer: (state, action) => {
const selectedOption = action.payload;
const currentQ = state.questions[state.currentIndex];
const isCorrect = selectedOption === currentQ.correctAnswer;

      state.answers.push({
        qId: currentQ.qId,
        selected: selectedOption,
        correct: currentQ.correctAnswer,
        isCorrect,
      });
if (isCorrect) state.score += 1;
if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex += 1;
        state.timeRemaining = state.settings.secondsPerQuestion;
      } else {
        state.isFinished = true;
      }
    },
    resetQuiz: () => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailyQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.totalTimeSeconds = 0;
      })
      .addCase(fetchDailyQuestions.fulfilled, (state, action) => {
        state.questions = action.payload;
        state.loading = false;
        state.error = null;
        state.currentIndex = 0;
        state.isFinished = false;
        state.answers = [];
        state.score = 0;
        state.totalTimeSeconds = 0;
        state.resultsSubmitted = false;
        state.submitInFlight = false;
        state.submitQuizError = null;
        state.timeRemaining = state.settings.secondsPerQuestion;
      })
      .addCase(fetchDailyQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLastSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLastSession.fulfilled, (state, action) => {
        state.loading = false;
        state.questions = action.payload.questions;
        state.answers = action.payload.answers;
        state.score = action.payload.score;
        state.isFinished = true;
      })
      .addCase(fetchLastSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPlatformSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        if (state.questions.length === 0) {
          state.timeRemaining = action.payload.secondsPerQuestion;
        }
      })
      .addCase(submitQuizResults.pending, (state) => {
        state.submitInFlight = true;
        state.submitQuizError = null;
      })
      .addCase(submitQuizResults.fulfilled, (state) => {
        state.submitInFlight = false;
        state.resultsSubmitted = true;
        state.submitQuizError = null;
      })
      .addCase(submitQuizResults.rejected, (state, action) => {
        state.submitInFlight = false;
        state.submitQuizError = action.payload ?? 'Submit failed';
      });
  },
});
export
const { tickTimer, submitAnswer, resetQuiz } = quizSlice.actions;
export default quizSlice.reducer;
