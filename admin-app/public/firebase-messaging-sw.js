importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyDn34CUWbpQywTvcHqAO6yR-OgTVDel0O0",
  authDomain: "gk-quest-with-rewards.firebaseapp.com",
  projectId: "gk-quest-with-rewards",
  storageBucket: "gk-quest-with-rewards.firebasestorage.app",
  messagingSenderId: "550938272733",
  appId: "1:550938272733:web:7520e53a990f3c5f895e6f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  const notificationTitle = payload.notification?.title || "Notification";
  const notificationOptions = {
    body: payload.notification?.body,
    icon: "/favicon.svg",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
