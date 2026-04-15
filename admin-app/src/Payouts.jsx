import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, serverTimestamp, increment, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'payout_requests'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayouts(pList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (payout, newStatus) => {
    if (window.confirm(`Are you sure you want to ${newStatus.toLowerCase()} this payout?`)) {
      try {
        const { id, userId, amount } = payout;
        
        // 1. Update payout request status
        await updateDoc(doc(db, 'payout_requests', id), {
          status: newStatus,
          processedAt: serverTimestamp()
        });

        // 2. If Rejected, restore user balance atomically
        if (newStatus === 'Rejected') {
          await updateDoc(doc(db, 'users', userId), {
            walletBalance: increment(amount)
          });
          
          // Log a reversal transaction
          await addDoc(collection(db, 'transactions'), {
            userId,
            type: 'Payout Reversal',
            amount: amount,
            status: 'Success',
            timestamp: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Error updating payout status:", error);
        alert("Failed to update status");
      }
    }
  };

  const handleExport = () => {
    if (payouts.length === 0) return alert("No data to export.");

    const headers = ["Date", "Scholar Name", "Amount (INR)", "Method", "Status", "Processed Date"];
    const rows = payouts.map(p => [
      p.timestamp?.toDate().toLocaleDateString() || 'N/A',
      p.userName || 'Anonymous',
      p.amount || 0,
      p.upiId || 'N/A',
      p.status || 'Pending',
      p.processedAt?.toDate().toLocaleDateString() || 'Pending'
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `scholar_payouts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const stats = {
    totalPaid: payouts.filter(p => p.status === 'Completed').reduce((acc, p) => acc + (p.amount || 0), 0),
    pendingCount: payouts.filter(p => p.status === 'Pending').length,
    pendingAmount: payouts.filter(p => p.status === 'Pending').reduce((acc, p) => acc + (p.amount || 0), 0),
    successRate: payouts.length > 0 ? (payouts.filter(p => p.status === 'Completed').length / payouts.length * 100).toFixed(1) : '100'
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl font-body">
      {/* Page Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Payouts Queue</h2>
          <p className="text-on-surface-variant mt-1">Manage and verify user withdrawal requests in real-time.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-surface-container-high p-1 rounded-xl">
            <button className="px-4 py-2 text-xs font-bold rounded-lg bg-surface-container-lowest text-primary shadow-sm">Pending</button>
            <button className="px-4 py-2 text-xs font-bold rounded-lg text-on-surface-variant hover:text-on-surface">All History</button>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-xl text-sm hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            Filters
          </button>
        </div>
      </section>

      {/* Stats Overview Bento */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Pending</p>
          <p className="text-2xl font-black text-primary mt-2 font-headline">₹{stats.pendingAmount.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-2 text-secondary text-xs font-semibold">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>Active requests</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Queue Size</p>
          <p className="text-2xl font-black text-on-surface mt-2 font-headline">{stats.pendingCount} Requests</p>
          <p className="text-xs text-on-surface-variant mt-2 font-medium">Avg. wait: 4.2 Hours</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Processed Total</p>
          <p className="text-2xl font-black text-secondary mt-2 font-headline">₹{stats.totalPaid.toLocaleString()}</p>
          <p className="text-xs text-on-surface-variant mt-2 font-medium">Success rate: {stats.successRate}%</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Failed / Flagged</p>
          <p className="text-2xl font-black text-error mt-2 font-headline">0 Flagged</p>
          <p className="text-xs text-on-surface-variant mt-2 font-medium">System healthy</p>
        </div>
      </section>

      {/* Payouts Table Section */}
      <section className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 shadow-[0px_12px_32px_rgba(44,42,81,0.06)]">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center">
          <h3 className="text-lg font-black font-headline">Withdrawal Queue</h3>
          <button 
            onClick={handleExport}
            className="text-primary text-xs font-bold hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export Data
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Payout Info</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-on-surface-variant italic">Loading payout queue...</td>
                </tr>
              ) : payouts.length > 0 ? (
                payouts.map((p) => (
                  <tr key={p.id} className={`hover:bg-surface-container-low/30 transition-colors group ${p.status === 'Completed' ? 'opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' : ''} ${p.status === 'Rejected' ? 'hover:bg-error-container/5' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          p.status === 'Completed' ? 'bg-secondary-container/20 text-secondary' :
                          p.status === 'Pending' ? 'bg-primary-container/20 text-primary' :
                          'bg-error-container/20 text-error'
                        }`}>
                          {p.userName?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{p.userName}</p>
                          <p className="text-xs text-on-surface-variant truncate max-w-[120px]">{p.userId?.slice(0, 10)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-on-surface flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">account_balance</span>
                          {p.upiId}
                        </p>
                        <span className={`text-[10px] font-bold uppercase mt-1 ${p.status === 'Completed' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                          Verified User
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="text-sm font-black text-on-surface">₹{p.amount?.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-on-surface-variant">{p.timestamp?.toDate().toLocaleDateString() || 'N/A'}</p>
                      <p className="text-[10px] text-outline font-medium">{p.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        p.status === 'Pending' ? 'bg-surface-container-highest text-on-surface-variant' :
                        p.status === 'Completed' ? 'bg-secondary-container/20 text-secondary' :
                        'bg-error-container/10 text-error'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          p.status === 'Pending' ? 'bg-outline-variant' :
                          p.status === 'Completed' ? 'bg-secondary' :
                          'bg-error'
                        }`}></span>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {p.status === 'Pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleStatusUpdate(p, 'Completed')}
                            className="p-2 rounded-lg bg-secondary-container/20 text-secondary hover:bg-secondary-container transition-all active:scale-90" 
                            title="Approve"
                          >
                            <span className="material-symbols-outlined text-xl">check_circle</span>
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(p, 'Rejected')}
                            className="p-2 rounded-lg bg-error-container/10 text-error hover:bg-error-container/30 transition-all active:scale-90" 
                            title="Reject"
                          >
                            <span className="material-symbols-outlined text-xl">cancel</span>
                          </button>
                        </div>
                      ) : p.status === 'Completed' ? (
                        <span className="text-xs font-semibold text-on-surface-variant">Success</span>
                      ) : (
                        <span className="text-xs font-semibold text-error">Failed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-on-surface-variant italic">No requests matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-surface-container-low/30 border-t border-outline-variant/10 flex items-center justify-between">
          <p className="text-xs text-on-surface-variant font-medium">Showing {payouts.length} requests</p>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg border border-outline-variant/20 hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold">1</button>
            <button className="p-2 rounded-lg border border-outline-variant/20 hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* Rejection / Config Modal */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-on-surface font-headline">Rejection Workflow Guide</h3>
          <div className="bg-surface-container-high/30 p-6 rounded-2xl border border-outline-variant/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error">warning</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Reason for Rejection is Mandatory</p>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  When rejecting a payout, the system automatically restores the user's wallet balance. 
                  In production, you should provide a clear reason that triggers an email to the user explaining how to fix their payment details.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-surface-container-lowest rounded-lg text-[10px] font-bold text-on-surface-variant border border-outline-variant/10">Invalid UPI ID</span>
                  <span className="px-3 py-1.5 bg-surface-container-lowest rounded-lg text-[10px] font-bold text-on-surface-variant border border-outline-variant/10">Suspected Fraud</span>
                  <span className="px-3 py-1.5 bg-surface-container-lowest rounded-lg text-[10px] font-bold text-on-surface-variant border border-outline-variant/10">Insufficient Balance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-primary p-6 rounded-2xl relative overflow-hidden shadow-xl flex flex-col justify-between min-h-[240px]">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-8xl">auto_awesome</span>
          </div>
          <div>
            <h4 className="text-on-primary text-lg font-black tracking-tight leading-tight font-headline">Smart Verify<br/>Enabled</h4>
            <p className="text-on-primary/80 text-xs mt-2 font-medium flex gap-1"><span className="material-symbols-outlined text-sm">info</span> System is monitoring velocity.</p>
          </div>
          <button className="bg-secondary-container text-on-secondary-container py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-105 active:scale-95 transition-all">
            System Healthy
          </button>
        </div>
      </section>
    </div>
  );
}
