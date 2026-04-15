import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { auth, googleProvider, db } from "./firebase";

async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      totalScore: 0,
      weeklyTotal: 0,
      walletBalance: 0,
      questionsAttempted: 0,
      totalCorrect: 0,
      lastAttemptDate: null,
      rank: 0,
      adWatchCount: { ranking: 0, review: 0 },
      categoryMastery: {},
    });
  }
}

function mapAuthError(err) {
  const code = err?.code || "";
  const messages = {
    "auth/popup-closed-by-user": "Sign-in cancelled. Please try again.",
  };
  return messages[code] || err?.message || "Something went wrong. Please try again.";
}

const googleIcon = (
  <svg height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      if (Capacitor.isNativePlatform()) {
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
        const result = await FirebaseAuthentication.signInWithGoogle({
          webClientId: "550938272733-kbrfbjirqlppl8h818dse3td0msmrupk.apps.googleusercontent.com"
        });
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        await ensureUserProfile(userCredential.user);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureUserProfile(result.user);
      }
      navigate("/");
    } catch (err) {
      console.error("Authentication Error", err);
      setError(mapAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-body text-gray-900">
      <main
        className="flex-1 flex flex-col items-center justify-center px-6 py-8"
        style={{ paddingTop: "var(--safe-top)", paddingBottom: "calc(2rem + var(--safe-bottom))" }}
      >
        <div className="flex flex-col items-center text-center z-10 max-w-[320px] mb-12">
          <div className="mb-6 w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center shadow-xl shadow-blue-200 overflow-hidden p-4">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-headline text-4xl font-black italic tracking-tighter text-blue-600">GK Quest</h1>
          <p className="mt-3 text-gray-500 font-medium leading-relaxed text-sm">
            High-energy gamified learning for the modern intellectual.
          </p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-6 z-10">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-4 bg-white py-5 px-6 rounded-2xl shadow-xl shadow-blue-100 border border-gray-100 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              googleIcon
            )}
            <span className="font-headline font-bold text-gray-900 text-lg">Continue with Google</span>
          </button>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-semibold w-full text-center border border-red-100">
              {error}
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-[240px] mx-auto mt-4">
            By continuing, you agree to the{" "}
            <span className="text-blue-600 font-bold">Terms</span> and{" "}
            <button
              type="button"
              onClick={() => navigate("/privacy")}
              className="text-blue-600 font-bold hover:underline"
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
