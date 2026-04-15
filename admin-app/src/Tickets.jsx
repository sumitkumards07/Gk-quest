import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, resolved, closed

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Tickets listener failed:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to update ticket:', e);
      alert('Failed to update ticket status.');
    }
  };

  const filteredTickets = filter === 'all'
    ? tickets
    : tickets.filter(t => t.status === filter);

  const statusCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  const statusBadge = (status) => {
    const map = {
      open: 'bg-amber-100 text-amber-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      closed: 'bg-gray-100 text-gray-500',
    };
    return map[status] || 'bg-gray-100 text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-on-surface">Help Desk</h1>
          <p className="text-sm text-outline mt-1">Manage support tickets from users</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl">
          <span className="material-symbols-outlined text-primary text-lg">support_agent</span>
          <span className="text-sm font-bold text-primary">{statusCounts.open} Open</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'open', 'resolved', 'closed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
              filter === f
                ? 'bg-primary text-on-primary shadow-lg'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {f} ({statusCounts[f]})
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-outline text-5xl mb-4 block">inbox</span>
          <p className="text-outline font-medium">No {filter === 'all' ? '' : filter} tickets found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => {
            const dateStr = ticket.timestamp?.toDate
              ? ticket.timestamp.toDate().toLocaleString()
              : 'Unknown';

            return (
              <div key={ticket.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-on-surface text-lg">{ticket.subject}</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusBadge(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-outline">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">person</span>
                        {ticket.displayName || 'Unknown User'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">mail</span>
                        {ticket.email || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {dateStr}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded-xl p-4 mb-4">
                  <p className="text-on-surface-variant text-sm whitespace-pre-wrap">{ticket.message}</p>
                </div>

                <div className="flex gap-2">
                  {ticket.status !== 'resolved' && (
                    <button
                      onClick={() => handleStatusChange(ticket.id, 'resolved')}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Mark Resolved
                    </button>
                  )}
                  {ticket.status !== 'closed' && (
                    <button
                      onClick={() => handleStatusChange(ticket.id, 'closed')}
                      className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                      Close
                    </button>
                  )}
                  {ticket.status !== 'open' && (
                    <button
                      onClick={() => handleStatusChange(ticket.id, 'open')}
                      className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
