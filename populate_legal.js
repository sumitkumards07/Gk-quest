import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import dotenv from 'dotenv';
dotenv.config();

// Standard Firebase Config (Will use environment variables from the project)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const privacyPolicy = `GK Quest Privacy Policy
Last Updated: April 2026

1. Data Collection
We collect minimal personal data to operate the GK Quest platform. This includes your Google profile information (Name, Email, and Profile Picture) provided via Google Authentication. We also collect your UPI ID if you choose to provide it for scholarship payouts.

2. Usage of Data
Your data is used specifically for:
- Maintaining your global rank and score.
- Identifying and contacting winners for ₹100 weekly scholarships.
- Processing manual payouts via the UPI ID provided.
- Ensuring platform integrity and preventing fraud.

3. Data Storage & Security
Your information is securely stored using Google Cloud Firebase. We do not sell, rent, or share your personal data with third-party advertisers or external organizations.

4. Your Rights
You may request the deletion of your account and associated data by contacting the platform administrator through the Support section.`;

const termsOfService = `GK Quest Terms of Service
Last Updated: April 2026

1. Eligibility & Conduct
By using GK Quest, you agree to play fairly. Any attempt to use bots, multiple accounts, or automated scripts to manipulate scores is strictly prohibited. The use of such methods will result in a permanent ban and forfeiture of all accumulated rewards.

2. Scholarship Rewards (₹100 Weekly)
- The #1 Scholar on the global leaderboard every Sunday is eligible for a ₹100 reward.
- Rewards are processed manually by the Administrator. 
- You must have a valid UPI ID linked to your profile to receive the payout.
- The Admin reserves the right to verify the integrity of the winner's performance before processing the reward.

3. Platform Availability
GK Quest is provided "as is". While we strive for 100% uptime, we are not responsible for points lost due to connectivity issues or platform maintenance.

4. Final Decision
In case of any dispute regarding scoring, rankings, or rewards, the decision of the GK Quest Administration is final and binding.`;

async function populate() {
  try {
    await setDoc(doc(db, 'settings', 'global'), {
      privacyPolicy,
      termsOfService
    }, { merge: true });
    console.log("Successfully populated legal documents in Firestore!");
    process.exit(0);
  } catch (e) {
    console.error("Failed to populate:", e);
    process.exit(1);
  }
}

populate();
