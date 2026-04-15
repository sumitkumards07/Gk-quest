# Kinetic Scholar - Production Launch Manual

Welcome to the **Kinetic Scholar** command center. This platform is a high-energy, gamified academic competition ecosystem comprising a Scholar PWA (User) and an Administrative Terminal.

## 🚀 Live Platform Architecture
- **Scholar PWA**: [gk-quest-with-rewards.web.app](https://gk-quest-with-rewards.web.app)
- **Admin Terminal**: [gkquest-admin.web.app](https://gkquest-admin.web.app)
- **Infrastructure**: Firebase Hosting, Firestore (Real-time), and Firebase Auth.

---

## 🛠️ Administrative SOPs (Standard Operating Procedures)

### 1. Question Management (Bulk Upload)
- **Action**: Navigate to `Admin Terminal > Questions`.
- **Protocol**: 
    - Use the **Bulk Upload** module to paste JSON question sets.
    - Each set should contain 10 questions to maintain the daily challenge integrity.
    - **Audit**: All questions are instantly synced to the Scholar PWA.

### 2. Scholar Mastery & Tiers
- **Action**: Navigate to `Admin Terminal > Registry`.
- **Protocol**: 
    - Monitor **Scholar Tiers** (Novice, Apprentice, Adept, Elite, Grandmaster).
    - Use the **Real-time Search** to audit specific scholar performance and verification status.

### 3. Financial Integrity (Payouts)
- **Action**: Navigate to `Admin Terminal > Payouts`.
- **Protocol**: 
    - **Pending Queue**: Review scholarship withdrawal requests.
    - **Action**: Use the **✅ Mark Completed** action to finalize a payout. This is a transaction-safe operation.
    - **Reversals**: Use **❌ Mark Cancelled** to refund the scholar's wallet in case of verification failure.

---

## ⚡ Deployment Protocol (Firebase CLI)

To perform a fresh production release after making local changes:

1. **Build the User App**:
   ```bash
   cd user-app && npm run build
   ```
2. **Build the Admin App**:
   ```bash
   cd admin-app && npm run build
   ```
3. **Deploy to Hosting**:
   ```bash
   cd ..
   firebase deploy --only hosting
   ```

---

## 🛡️ Security & RBAC Protocol

The platform uses **Hardened Firestore Security Rules**:
- **Public Data**: High-level ranks and generic scholar names are public.
- **Private Data**: Wallets, emails, and transaction logs are locked to the specific `owner (uid)`.
- **Administrative Access**: Admin modules require an authenticated session and are protected by backend role-checking (e.g., email pattern matching).

---

## 🏗️ Technical Stack
- **Frontend**: React (Vite), Tailwind CSS, Redux Toolkit.
- **Backend**: Firebase Firestore (NoSQL), Firebase Authentication (Google).
- **Gamification**: Canvas-Confetti, Kinetic Haptics, Daily Streaks, and Academic Tiers.

**Platform Version**: 1.1.0 - Kinetic Launch Sequence
**Maintainer**: Antigravity Intelligence 🚀🎓
