import React from "react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="bg-white font-body text-gray-900 antialiased min-h-screen pb-32">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="ml-4 font-headline text-xl font-bold tracking-tight text-blue-600">
          GK Quest Privacy Policy
        </h1>
      </header>

      <main className="px-6 max-w-2xl mx-auto space-y-8 leading-relaxed" style={{ paddingTop: 'calc(6rem + var(--safe-top))', paddingBottom: 'calc(8rem + var(--safe-bottom))' }}>
        <section className="space-y-4">
          <h2 className="font-headline text-2xl font-black text-gray-900">1. Introduction</h2>
          <p className="text-gray-600 font-medium font-body">
            Welcome to GK Quest. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us at scholarship@gkquest.com.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline text-2xl font-black text-gray-900">2. Information We Collect</h2>
          <p className="text-gray-600 font-medium font-body">
            We collect personal information that you voluntarily provide to us when you register on the App, such as:
          </p>
          <ul className="list-disc ml-6 space-y-2 text-gray-600 font-medium">
            <li>Name and Contact Data (Email, Profile Picture via Social Login)</li>
            <li>Wallet details for scholarship payouts (UPI IDs)</li>
            <li>Performance data for leaderboard rankings</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline text-2xl font-black text-gray-900">3. How We Use Your Information</h2>
          <p className="text-gray-600 font-medium">
            We use the information we collect or receive:
          </p>
          <ul className="list-disc ml-6 space-y-2 text-gray-600 font-medium">
            <li>To facilitate account creation and logon process.</li>
            <li>To manage user accounts and process scholarship payouts.</li>
            <li>To post testimonials and display leaderboard rankings.</li>
            <li>To deliver targeted advertising (via Google AdMob/AdSense).</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline text-2xl font-black text-gray-900">4. Security</h2>
          <p className="text-gray-600 font-medium">
            We use Firebase (Google Cloud) to secure your data with industry-standard encryption. Your scholarship funds and personal details are protected by Secure Rules and Authentication protocols.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-headline text-2xl font-black text-gray-900">5. Contact Us</h2>
          <p className="text-gray-600 font-medium">
            If you have questions or comments about this policy, you may email us at scholarship@gkquest.com.
          </p>
        </section>

        <div className="pt-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-4 bg-white/95 backdrop-blur-2xl border-t border-gray-100 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] pb-8" style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}>
        <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">home</span>
          <span className="font-headline text-[10px] font-bold mt-1">Home</span>
        </button>
        <button onClick={() => navigate('/ranks')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">leaderboard</span>
          <span className="font-headline text-[10px] font-bold mt-1">Ranks</span>
        </button>
        <button onClick={() => navigate('/wallet')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">payments</span>
          <span className="font-headline text-[10px] font-bold mt-1">Wallet</span>
        </button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors py-2 px-4">
          <span className="material-symbols-outlined">person</span>
          <span className="font-headline text-[10px] font-bold mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}
