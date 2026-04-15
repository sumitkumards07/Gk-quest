import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// FCM — lazy init, only on web (not available in native WebView)
let messaging = null;
export
const initMessaging = async () => {
if (messaging)
return messaging;
  try {
const { getMessaging } = await import("firebase/messaging");
    messaging = getMessaging(app);
return messaging;
  } catch {
return null;
  }
};
export
const requestNotificationPermission = async () => {
  try {
const msg = await initMessaging();
if (!msg)
return null;
const permission = await Notification.requestPermission();
if (permission === "granted") {
const { getToken } = await import("firebase/messaging");
return await getToken(msg, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
    }
  } catch (err) {
    console.error("FCM token error:", err);
  }
return null;
};
export
const onMessageListener = async () => {
  try {
const msg = await initMessaging();
if (!msg)
return null;
const { onMessage } = await import("firebase/messaging");
return new Promise((resolve) => onMessage(msg, resolve));
  } catch {
return null;
  }
};
export { auth, db, googleProvider, messaging };
