import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Settings() {
  const [settings, setSettings] = useState({
    secondsPerQuestion: 15,
    correctAnswerPoints: 10,
    penaltyRatio: 0,
    streakBonus: true,
    minWithdrawal: 500,
    platformCommission: 15,
    weeklyPrizeAmount: 100,
    autoUpiEnabled: false,
    maintenanceMode: false,
    termsOfService: '',
    privacyPolicy: ''
  });
  const [activeTab, setActiveTab] = useState('quiz');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });
      alert("Settings updated successfully!");
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-20 font-body">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black font-headline text-on-surface">Platform Settings</h1>
          <p className="text-on-surface-variant text-sm mt-1">Configure global rules and financial thresholds</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-primary text-on-primary font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3 uppercase tracking-widest text-xs"
        >
          <span className="material-symbols-outlined font-bold">save</span>
          {saving ? 'Saving...' : 'Publish Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('quiz')}
            className={`w-full text-left px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'quiz' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className={`material-symbols-outlined font-bold ${activeTab === 'quiz' ? 'text-on-primary' : 'text-outline'}`}>quiz</span>
            Quiz Logic
          </button>
          <button 
            onClick={() => setActiveTab('financials')}
            className={`w-full text-left px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'financials' ? 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20 scale-[1.02]' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className={`material-symbols-outlined font-bold ${activeTab === 'financials' ? 'text-on-secondary' : 'text-outline'}`}>payments</span>
            Financials
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'security' ? 'bg-error text-white shadow-lg shadow-error/20 scale-[1.02]' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className={`material-symbols-outlined font-bold ${activeTab === 'security' ? 'text-white' : 'text-outline'}`}>shield</span>
            Security
          </button>
          <button 
            onClick={() => setActiveTab('legal')}
            className={`w-full text-left px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'legal' ? 'bg-tertiary text-on-tertiary shadow-lg shadow-tertiary/20 scale-[1.02]' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className={`material-symbols-outlined font-bold ${activeTab === 'legal' ? 'text-on-tertiary' : 'text-outline'}`}>gavel</span>
            Legal & Compliance
          </button>
        </div>

        {/* Form Area */}
        <div className="lg:col-span-3 space-y-10">
          {/* Section 1: Quiz Logic */}
          {activeTab === 'quiz' && (
          <section className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary font-bold">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <h3 className="text-xl font-black font-headline italic tracking-tight">Quiz Timing & Scoring</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Seconds Per Question</label>
                <div className="relative group">
                  <input 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all" 
                    type="number" 
                    value={settings.secondsPerQuestion}
                    onChange={(e) => handleChange('secondsPerQuestion', parseInt(e.target.value))}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-outline uppercase">Seconds</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Correct Answer Points</label>
                <div className="relative group">
                  <input 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all" 
                    type="number" 
                    value={settings.correctAnswerPoints}
                    onChange={(e) => handleChange('correctAnswerPoints', parseInt(e.target.value))}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-outline uppercase">Points</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Penalty Ratio</label>
                <select 
                  value={settings.penaltyRatio}
                  onChange={(e) => handleChange('penaltyRatio', parseFloat(e.target.value))}
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all appearance-none"
                >
                  <option value={0}>No Penalty</option>
                  <option value={0.25}>-0.25 Points</option>
                  <option value={0.5}>-0.50 Points</option>
                  <option value={1}>-1.00 Points</option>
                </select>
              </div>
              <div className="bg-primary/5 p-6 rounded-2xl flex items-center justify-between border border-primary/10">
                <div>
                  <h4 className="text-sm font-black">Streak Bonus</h4>
                  <p className="text-[10px] uppercase font-bold text-outline mt-0.5 tracking-wider">Multi-chain multiplier</p>
                </div>
                <button 
                  onClick={() => handleChange('streakBonus', !settings.streakBonus)}
                  className={`w-12 h-6 rounded-full relative p-1 transition-colors duration-300 ${settings.streakBonus ? 'bg-primary' : 'bg-surface-container-highest'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${settings.streakBonus ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
          </section>
          )}

          {/* Section 2: Financials */}
          {activeTab === 'financials' && (
          <section className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-2xl text-secondary font-bold">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <h3 className="text-xl font-black font-headline italic tracking-tight">Payout & Ad Monetization</h3>
            </div>
            
            <div className="bg-secondary/5 p-6 rounded-3xl border border-secondary/20 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                 <span className="material-symbols-outlined text-secondary">ads_click</span>
                 <h4 className="text-sm font-black uppercase tracking-widest text-secondary">Unity Ads Configuration</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Unity Game ID</label>
                  <input 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-secondary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all" 
                    type="text" 
                    placeholder="e.g. 5841234"
                    value={settings.unityGameId || ''}
                    onChange={(e) => handleChange('unityGameId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Unity Project ID</label>
                  <input 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-secondary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all" 
                    type="text" 
                    placeholder="e.g. ded86581-2622-45d9-ae7d-cc921cf991a0"
                    value={settings.unityProjectId || ''}
                    onChange={(e) => handleChange('unityProjectId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Rewarded Placement ID</label>
                  <input 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-secondary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all" 
                    type="text" 
                    placeholder="e.g. Rewarded_Android"
                    value={settings.unityPlacementId || ''}
                    onChange={(e) => handleChange('unityPlacementId', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                 <div>
                    <p className="text-xs font-black uppercase tracking-widest">Unity Test Mode</p>
                    <p className="text-[10px] font-bold text-outline">Enable for development builds</p>
                 </div>
                 <button 
                  onClick={() => handleChange('unityTestMode', !settings.unityTestMode)}
                  className={`w-12 h-6 rounded-full relative p-1 transition-colors duration-300 ${settings.unityTestMode ? 'bg-secondary' : 'bg-surface-container-highest'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${settings.unityTestMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Min. Withdrawal</label>
                <div className="relative group">
                  <input 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all" 
                    type="number" 
                    value={settings.minWithdrawal}
                    onChange={(e) => handleChange('minWithdrawal', parseInt(e.target.value))}
                  />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-black text-outline">₹</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Platform Commission</label>
                <div className="relative group">
                  <input 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all" 
                    type="number" 
                    value={settings.platformCommission}
                    onChange={(e) => handleChange('platformCommission', parseInt(e.target.value))}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-outline">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Weekly #1 Scholar Prize</label>
                <div className="relative group">
                  <input 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-black outline-none transition-all" 
                    type="number" 
                    value={settings.weeklyPrizeAmount}
                    onChange={(e) => handleChange('weeklyPrizeAmount', parseInt(e.target.value))}
                  />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-black text-outline">₹</span>
                </div>
              </div>
            </div>
          </section>
          )}

          {/* Section 3: Legal & Compliance */}
          {activeTab === 'legal' && (
          <section className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-tertiary/10 rounded-2xl text-tertiary font-bold">
                <span className="material-symbols-outlined">gavel</span>
              </div>
              <h3 className="text-xl font-black font-headline italic tracking-tight">Legal Protocols</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">User Privacy Policy</label>
                <textarea 
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-medium outline-none transition-all min-h-[300px] resize-y" 
                  placeholder="Paste your Privacy Policy here..."
                  value={settings.privacyPolicy}
                  onChange={(e) => handleChange('privacyPolicy', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Terms of Service</label>
                <textarea 
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-medium outline-none transition-all min-h-[300px] resize-y" 
                  placeholder="Paste your Terms of Service here..."
                  value={settings.termsOfService}
                  onChange={(e) => handleChange('termsOfService', e.target.value)}
                />
              </div>
            </div>
          </section>
          )}

          {/* Section 4: Dangerous Actions (Security) */}
          {activeTab === 'security' && (
          <section className="p-8 rounded-3xl border border-error/10 bg-surface-container-lowest space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-black font-headline flex items-center gap-2 italic tracking-tight text-error">
              <span className="material-symbols-outlined font-bold">dangerous</span>
              Dangerous Actions
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-error/5 rounded-2xl border border-error/10">
              <div className="flex-1">
                <h4 className="text-sm font-black uppercase tracking-widest text-error">Wipe User Data</h4>
                <p className="text-[10px] font-bold mt-1 max-w-sm uppercase tracking-wider text-on-surface-variant">
                  This will permanently delete ALL user profiles, XP history, and transaction records. Use this only for a fresh platform launch.
                </p>
              </div>
              <button 
                onClick={async () => {
                  if (window.confirm("CRITICAL WARNING: This will permanently delete ALL user accounts and their history. This action IS NOT REVERSIBLE. Type 'DELETE' to confirm.") && window.prompt("Type 'DELETE' to confirm cleanup:") === 'DELETE') {
                    try {
                      setSaving(true);
                      const { collection, getDocs, writeBatch } = await import('firebase/firestore');
                      
                      const collectionsToClear = ['users', 'transactions'];
                      for (const coll of collectionsToClear) {
                        const snap = await getDocs(collection(db, coll));
                        const batch = writeBatch(db);
                        snap.docs.forEach((doc) => batch.delete(doc.ref));
                        await batch.commit();
                      }
                      
                      alert("Database wiped successfully. All users and transactions are gone.");
                    } catch (e) {
                      console.error("Cleanup failed:", e);
                      alert("Reset failed: " + e.message);
                    } finally {
                      setSaving(false);
                    }
                  }
                }}
                disabled={saving}
                className="px-8 py-3 rounded-xl bg-error text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-error/20"
              >
                Reset User Database
              </button>
            </div>
            <p className="text-[9px] font-bold text-outline uppercase tracking-widest text-center">Note: This does not delete campaigns or questions.</p>
          </section>
          )}
        </div>
      </div>
    </div>
  );
}
