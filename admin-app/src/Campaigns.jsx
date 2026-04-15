import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  getDocs, 
  where 
} from 'firebase/firestore';
import { db } from './firebase';

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    status: 'Draft'
  });

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCampaigns(cList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (camp = null) => {
    if (camp) {
      setEditingId(camp.id);
      setFormData({
        title: camp.title,
        startDate: camp.startDate,
        endDate: camp.endDate,
        status: camp.status || 'Draft'
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Draft'
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'campaigns', editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'campaigns'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving campaign:", error);
      alert("Failed to save campaign");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure? This will delete the campaign AND all questions inside it. This action cannot be undone.")) {
      try {
        setLoading(true);
        // 1. Fetch and delete all associated questions
        const qSnap = await getDocs(query(collection(db, 'questions'), where('campaignId', '==', id)));
        const deletePromises = qSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        // 2. Delete the campaign document itself
        await deleteDoc(doc(db, 'campaigns', id));
        
        alert("Campaign and its questions deleted successfully.");
      } catch (error) {
        console.error("Error deleting campaign:", error);
        alert("Failed to fully delete campaign. Check console for details.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Quiz Campaigns</h1>
          <p className="text-on-surface-variant max-w-lg">Manage weekly campaigns to group questions into time-bound events.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-xl shadow-primary/20 hover:translate-y-[-2px] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add_circle</span>
            New Campaign
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Campaign Name</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-on-surface-variant italic">Loading campaigns...</td>
                </tr>
              ) : campaigns.length > 0 ? (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="text-on-surface font-black text-lg mb-1">{camp.title}</p>
                      <p className="text-xs text-outline font-medium">ID: {camp.id.slice(0,8)}...</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-secondary">Start: {camp.startDate}</span>
                        <span className="text-sm font-bold text-error">End: {camp.endDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter ${
                        camp.status === 'Active' ? 'bg-secondary/20 text-secondary' : 'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/campaigns/${camp.id}`)} className="p-2 text-secondary hover:bg-secondary/10 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold" title="Manage Campaign Questions">
                          <span className="material-symbols-outlined text-sm">quiz</span>
                          Manage
                        </button>
                        <button onClick={() => handleOpenModal(camp)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button onClick={() => handleDelete(camp.id)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-on-surface-variant italic">No campaigns found. Create one above!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-surface-bright w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 bg-surface-container flex justify-between items-center border-b border-outline-variant/10">
              <div>
                <h2 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">{editingId ? 'Edit' : 'Create'} Campaign</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              <form onSubmit={handleSave} className="space-y-6" id="campaign-form">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Campaign Title</label>
                  <input 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    placeholder="e.g. History Week 1"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Start Date</label>
                    <input 
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      required
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">End Date</label>
                    <input 
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      required
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Active">Active (Live in App)</option>
                    <option value="Draft">Draft (Hidden)</option>
                  </select>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-4 bg-surface-bright">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
              <button form="campaign-form" type="submit" className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                {editingId ? 'Update' : 'Launch'} Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
