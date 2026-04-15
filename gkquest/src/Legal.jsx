import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useBackNavigation } from './useBackNavigation';

export default function Legal() {
  const handleBack = useBackNavigation();
  const [content, setContent] = useState({ terms: '', privacy: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLegal = async () => {
      const defaultPrivacy = `GK Quest Privacy Policy
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

      const defaultTerms = `GK Quest Terms of Service
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

      try {
        const snap = await getDoc(doc(db, 'settings', 'global'));
        if (snap.exists()) {
          const data = snap.data();
          setContent({
            terms: data.termsOfService || defaultTerms,
            privacy: data.privacyPolicy || defaultPrivacy,
          });
        } else {
          setContent({ terms: defaultTerms, privacy: defaultPrivacy });
        }
      } catch (e) {
        console.error('Legal Load Failed:', e);
        setContent({ terms: defaultTerms, privacy: defaultPrivacy });
      } finally {
        setLoading(false);
      }
    };
    fetchLegal();
  }, []);

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center font-body">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white font-body text-gray-900 antialiased min-h-screen pb-32">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="ml-4 font-headline text-xl font-bold tracking-tight text-blue-600 uppercase italic">Legal Protocols</h1>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-12 leading-relaxed" style={{ paddingTop: 'calc(6rem + var(--safe-top))', paddingBottom: 'calc(8rem + var(--safe-bottom))' }}>
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-blue-600">shield</span>
            <h2 className="font-headline text-2xl font-black text-gray-900">Privacy Policy</h2>
          </div>
          <div className="text-gray-600 font-medium font-body whitespace-pre-wrap pl-2 border-l-2 border-blue-50">
            {content.privacy}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-blue-600">gavel</span>
            <h2 className="font-headline text-2xl font-black text-gray-900">Terms of Service</h2>
          </div>
          <div className="text-gray-600 font-medium font-body whitespace-pre-wrap pl-2 border-l-2 border-blue-50">
            {content.terms}
          </div>
        </section>

        <div className="pt-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
                Authorized Platform Guidelines • GK Quest Official
            </p>
        </div>
      </main>
    </div>
  );
}
