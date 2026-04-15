# 🎓 Kinetic Scholar: Firebase Cloud Connection Manual

The Firestore database has been successfully **Created** and **Hardened** via the CLI. To complete the connection and launch the platform, please follow these 3 critical steps.

---

## 🔗 1. Register the Scholar App
Go to your project's General Settings:
**Link**: [https://console.firebase.google.com/project/gk-quest-with-rewards/settings/general](https://console.firebase.google.com/project/gk-quest-with-rewards/settings/general)

1.  Scroll down to the **"Your apps"** section.
2.  Click **"Add app"** -> **"Web"** (the `</>` icon).
3.  Register as: `KineticScholar`.
4.  **COPY** the `firebaseConfig` object (contains `apiKey`, `appId`, etc.).

---

## ⚡ 2. Connect the Codebase
Create a new file named `.env.local` in **BOTH** the `user-app/` and `admin-app/` folders. Paste your keys there:

```env
# Rename this to .env.local in user-app/ and admin-app/
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=gk-quest-with-rewards.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gk-quest-with-rewards
VITE_FIREBASE_STORAGE_BUCKET=gk-quest-with-rewards.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

---

## 🛡️ 3. Enable Scholar Identity (Auth)
Go to the Authentication section:
**Link**: [https://console.firebase.google.com/project/gk-quest-with-rewards/authentication](https://console.firebase.google.com/project/gk-quest-with-rewards/authentication)

1.  Click **"Get Started"**.
2.  Select **"Google"** as the sign-in provider.
3.  **Enable** it and select your support email.
4.  Click **"Save"**.

---

## ✅ 4. Final Verification
Once the `.env.local` files are saved, run the following to launch the scholar identity engine:

```bash
cd user-app && npm run dev
```

> [!TIP]
> I have already deployed the **Security Rules** and **Leaderboard Indexes**. Once you connect the keys, the platform will be 100% operational.
