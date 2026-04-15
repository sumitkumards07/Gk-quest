import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useBackNavigation } from './useBackNavigation';

export default function Support() {
  const handleBack = useBackNavigation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setStatus('loading');
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'tickets'), {
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        timestamp: serverTimestamp(),
      });
      setStatus('success');
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Support Ticket Failed:', error);
      setStatus('error');
    }
  };

  return (
    <div className="bg-white font-body text-gray-900 antialiased min-h-screen pb-32">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-6 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100" style={{ paddingTop: 'var(--safe-top)', height: 'calc(4rem + var(--safe-top))' }}>
        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="ml-4 font-headline text-xl font-bold tracking-tight text-blue-600">Help Desk</h1>
      </header>

      <main className="px-6 max-w-2xl mx-auto" style={{ paddingTop: 'calc(6rem + var(--safe-top))' }}>
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl mb-8">
          <h2 className="font-headline text-2xl font-black mb-2">Need Help?</h2>
          <p className="text-white/80 text-sm font-medium">Submit a support ticket and our team will get back to you within 24–48 hours.</p>
        </section>

        {status === 'success' ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8 text-center space-y-4">
             <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                <span className="material-symbols-outlined text-white text-3xl">task_alt</span>
             </div>
             <h3 className="font-headline text-xl font-bold text-emerald-900">Ticket Submitted!</h3>
             <p className="text-emerald-700 text-sm font-medium">Your support ticket has been logged. You'll receive a response via email.</p>
             <button onClick={() => setStatus('idle')} className="bg-white text-emerald-600 px-8 py-3 rounded-full font-bold text-xs uppercase shadow-sm active:scale-95 transition-all">Create Another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-4">Inquiry Category</label>
              <input 
                required
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Scholarship Payout, Verification Issue"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-4">Subject</label>
              <textarea 
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please provide full context of your inquiry..."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm resize-none"
              ></textarea>
            </div>

            {status === 'error' && (
                <p className="text-red-500 text-xs font-bold text-center italic">Failed to securely transmit data. Please check your signal.</p>
            )}

            <button 
              disabled={status === 'loading'}
              type="submit" 
              className="w-full bg-blue-600 text-white rounded-[1.5rem] py-5 font-headline font-black text-lg shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <span>{status === 'loading' ? 'Sending...' : 'Submit Ticket'}</span>
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        )}

        <div className="pt-10 text-center pb-20">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
                GK Quest Help Desk 🎓
            </p>
        </div>
      </main>
    </div>
  );
}
