# 🎓 Kinetic Scholar: Database Architecture & Seeding Manual

This document provides the definitive schema for the Kinetic Scholar Firestore database and instructions for initializing a production-ready environment.

---

## 🏗️ 1. Collection Schema Definitions

### 👤 `users` (Private Scholar Profiles)
Each document ID is the user's Firebase UID.
| Field | Type | Description |
| :--- | :--- | :--- |
| `displayName` | string | Full name from Scholar Identity. |
| `email` | string | Registered email address. |
| `photoURL` | string | Profile avatar URL. |
| `totalScore` | number | Lifetime points earned. |
| `weeklyTotal` | number | Active leaderboard score. |
| `walletBalance` | number | Current withdrawable INR. |
| `questionsAttempted` | number | Total participation count. |
| `lastAttemptDate` | timestamp | Server timestamp of the daily run. |
| `streak` | number | Consecutive daily performance count. |
| `rank` | number | Global position (calculated). |
| `categoryMastery` | map | `{ "Science": { "attempts": X, "correct": Y }, ... }` |
| `createdAt` | timestamp | Platform joining date. |
| `isVerified` | boolean | Internal compliance status. |
| `lastCampaignPlayed` | string \| null | Last finished campaign id (legacy + display). |
| `completedCampaignIds` | array | Campaign ids the user has completed (one attempt each). |
| `lastSession` | map | Last quiz payload for review (questions, answers, score, etc.). |
| `rankUnlockedOnce` | boolean | Whether ranks were unlocked via rewarded ad. |
| `adWatchCount` | map | e.g. `{ "ranking": n, "review": n }` for analytics. |

### ❓ `questions` (Academic Repository)
| Field | Type | Description |
| :--- | :--- | :--- |
| `question` | string | The academic prompt. |
| `optionA` / `B` / `C` / `D` | string | The multiple-choice options. |
| `correctAnswer` | string | 'A', 'B', 'C', or 'D'. |
| `category` | string | 'Science', 'History', 'Math', etc. |

### 💸 `transactions` (Financial Ledger)
| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | string | Reference to the scholar. |
| `type` | string | 'Quiz Reward' or 'Withdrawal'. |
| `amount` | number | Amount in INR (+/-). |
| `status` | string | 'Success' or 'Pending'. |
| `timestamp` | timestamp | Transaction record time. |

### ⚙️ `settings` (Platform Control)
Document: `global`
| Field | Type | Description |
| :--- | :--- | :--- |
| `secondsPerQuestion` | number | Default: 15. |
| `correctAnswerPoints` | number | Default: 10. |
| `maintenanceMode` | boolean | Toggles platform access. |

---

## 🚀 2. Initialization Script

To seed your database with initial configurations and sample questions, run the following command from the project root:

```bash
node scripts/seed_db.js
```

### Script Content (`scripts/seed_db.js`)
*(Requirement: `firebase-admin` must be configured with a service account).*

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seed() {
  // 1. Initialize Global Settings
  await db.collection('settings').doc('global').set({
    secondsPerQuestion: 15,
    correctAnswerPoints: 10,
    maintenanceMode: false
  });

  // 2. Seed Initial Questions
  const questions = [
    { 
      question: "Which element has the symbol 'Fe'?", 
      optionA: "Gold", optionB: "Iron", optionC: "Silver", optionD: "Tin", 
      correctAnswer: "B", category: "Science" 
    },
    // ... Add more questions here
  ];

  for (const q of questions) {
    await db.collection('questions').add(q);
  }

  console.log("⚡ Kinetic Scholar Database Initialized!");
}

seed();
```

---

## 🛡️ 3. Security Rules (source of truth: `firestore.rules`)

Deploy: `firebase deploy --only firestore:rules`

Summary of the **live** rules:

- **`questions` / `campaigns`**: Authenticated read; **admin-only** write (email allowlist in `isAdmin()` — adjust domains in repo).
- **`users`**: Authenticated **read** (needed for leaderboard). **Create** only for self with zeroed score/wallet/weekly/question counts. **Update** for self: cannot change `email` / `isVerified`; `totalScore`, `walletBalance`, `weeklyTotal` must not decrease and cannot jump by more than **~400** per write (stops trivial client forging); `questionsAttempted` similarly bounded.
- **`transactions`**: Read own (or admin). **Create** only own `Quiz Reward` rows with `Success` and `amount` within the same cap. **No update/delete** (append-only ledger).
- **`settings`**: Public read; admin write.
- **`payout_requests`**: As defined in `firestore.rules`.

> **Note:** Strong anti-cheat still needs **Cloud Functions** (or Admin SDK) to verify answers server-side. These rules only limit obvious abuse.

## 📇 4. Composite Indexes

Defined in `firestore.indexes.json`. Deploy: `firebase deploy --only firestore:indexes`

Required for the user app:

- **`transactions`**: `userId` ASC, `timestamp` DESC (Wallet history).
- **`users`**: `weeklyTotal` DESC (leaderboard) — optional `displayName` per your index file.

If a query fails, use the **error link** in the Firebase console to create any missing index.
