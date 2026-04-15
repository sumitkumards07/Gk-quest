import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    category: 'Science',
    difficulty: 'Easy',
    campaignId: '',
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'questions'), (snapshot) => {
      const qList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(qList);
      setLoading(false);
    });

    const unsubCamps = onSnapshot(collection(db, 'campaigns'), (snapshot) => {
      const cList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCampaigns(cList);
    });

    return () => {
      unsubscribe();
      unsubCamps();
    };
  }, []);

  const handleOpenModal = (q = null) => {
    if (q) {
      setEditingId(q.id);
      setFormData({
        category: q.category || 'Science',
        difficulty: q.difficulty || 'Easy',
        campaignId: q.campaignId || '',
        question: q.question || '',
        optionA: q.optionA || '',
        optionB: q.optionB || '',
        optionC: q.optionC || '',
        optionD: q.optionD || '',
        correctAnswer: q.correctAnswer || 'A'
      });
    } else {
      setEditingId(null);
      setFormData({
        category: 'Science',
        difficulty: 'Easy',
        campaignId: '',
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'A'
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'questions', editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'questions'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Failed to save question");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteDoc(doc(db, 'questions', id));
      } catch (error) {
        console.error("Error deleting question:", error);
      }
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawJson = JSON.parse(event.target.result);
        if (!Array.isArray(rawJson)) throw new Error("JSON must be an array of questions");

        setIsBulkUploading(true);
        const batch = writeBatch(db);
        const questionsCol = collection(db, 'questions');
        let count = 0;

        rawJson.forEach((quest) => {
          // Format A: Internal App Schema
          if (quest.question && quest.correctAnswer && quest.optionA) {
            const newDocRef = doc(questionsCol);
            batch.set(newDocRef, {
              ...quest,
              category: quest.category || 'General',
              difficulty: quest.difficulty || 'Easy',
              createdAt: serverTimestamp()
            });
            count++;
            return;
          }

          // Format B: External JSON (options array + answer_index)
          if (quest.question && Array.isArray(quest.options) && quest.options.length >= 2 && quest.answer_index !== undefined) {
             const newDocRef = doc(questionsCol);
             batch.set(newDocRef, {
               question: quest.question,
               optionA: quest.options[0] || '',
               optionB: quest.options[1] || '',
               optionC: quest.options[2] || '',
               optionD: quest.options[3] || '',
               correctAnswer: ['A', 'B', 'C', 'D'][quest.answer_index] || 'A',
               category: quest.category || 'General',
               difficulty: quest.difficulty || 'Easy',
               createdAt: serverTimestamp()
             });
             count++;
          }
        });

        if (count > 0) {
          await batch.commit();
          alert(`Successfully uploaded ${count} questions!`);
        } else {
          alert("No valid questions found in file. Please ensure the format matches either the app template or standard quiz JSON (options array).");
        }
      } catch (error) {
        console.error("Bulk upload error:", error);
        alert(`Bulk upload failed: ${error.message}`);
      } finally {
        setIsBulkUploading(false);
        e.target.value = null; // Reset input
      }
    };
    reader.readAsText(file);
  };

  const handleParseAndImport = async () => {
    try {
      if (!pasteText.trim()) return;
      const blocks = pasteText.split(/\n\s*\n/);
      let validQuestions = [];
      let parseErrors = 0;

      for (let block of blocks) {
        const cleanLines = block.trim().split('\n').map(l => l.replace(/\*\*/g, '').trim()).filter(l => l);
        if (cleanLines.length < 6) {
          parseErrors++;
          continue;
        }

        let qText = cleanLines[0].replace(/^\d+[\.\)]\s*/, '').trim();
        let oA = cleanLines[1].replace(/^[aA][\.\)]\s*/, '').trim();
        let oB = cleanLines[2].replace(/^[bB][\.\)]\s*/, '').trim();
        let oC = cleanLines[3].replace(/^[cC][\.\)]\s*/, '').trim();
        let oD = cleanLines[4].replace(/^[dD][\.\)]\s*/, '').trim();
        
        let ansLine = cleanLines.find(l => l.toLowerCase().startsWith('ans'));
        if (!ansLine && cleanLines.length >= 6) ansLine = cleanLines[5]; // fallback
        
        let ansMatch = ansLine?.match(/(?:Answer|Ans)[\s:\-]*([A-D])/i);
        let correctAnswer = ansMatch ? ansMatch[1].toUpperCase() : null;

        if (!correctAnswer) {
            let singleLetter = ansLine?.match(/^[A-D]$/i);
            if (singleLetter) correctAnswer = singleLetter[0].toUpperCase();
        }

        if (qText && oA && oB && oC && oD && correctAnswer) {
          validQuestions.push({
            question: qText,
            optionA: oA,
            optionB: oB,
            optionC: oC,
            optionD: oD,
            correctAnswer: correctAnswer,
            category: 'General',
            difficulty: 'Intermediate'
          });
        } else {
          parseErrors++;
        }
      }

      if (validQuestions.length === 0) {
        alert("Could not parse any valid questions. Please make sure the format matches the template.");
        return;
      }

      setIsBulkUploading(true);
      const batch = writeBatch(db);
      const questionsCol = collection(db, 'questions');
      
      const selectedCategory = document.getElementById('paste-category')?.value || 'General';
      const selectedDifficulty = document.getElementById('paste-difficulty')?.value || 'Easy';
      const selectedCampaign = document.getElementById('paste-campaign')?.value || '';
      
      validQuestions.forEach((q) => {
        const newDocRef = doc(questionsCol);
        batch.set(newDocRef, {
          ...q,
          category: selectedCategory,
          difficulty: selectedDifficulty,
          campaignId: selectedCampaign,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      alert(`Successfully imported ${validQuestions.length} questions! ${parseErrors > 0 ? `(${parseErrors} blocks were skipped)` : ''}`);
      setShowPasteModal(false);
      setPasteText('');
    } catch (error) {
      console.error("Paste import error:", error);
      alert(`Import failed: ${error.message}`);
    } finally {
      setIsBulkUploading(false);
    }
  };

  const copyTemplate = () => {
    const template = [
      {
        "question": "What is the powerhouse of the cell?",
        "optionA": "Nucleus",
        "optionB": "Mitochondria",
        "optionC": "Ribosome",
        "optionD": "Vacuole",
        "correctAnswer": "B",
        "category": "Science",
        "difficulty": "Easy"
      },
      {
        "question": "Who painted the Mona Lisa?",
        "optionA": "Van Gogh",
        "optionB": "Da Vinci",
        "optionC": "Picasso",
        "optionD": "Monet",
        "correctAnswer": "B",
        "category": "Arts",
        "difficulty": "Intermediate"
      }
    ];
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    alert("Question Template JSON copied to clipboard!");
  };

  // Stats
  const stats = {
    total: questions.length,
    science: questions.filter(q => q.category === 'Science').length,
    history: questions.filter(q => q.category === 'History').length,
    expert: questions.filter(q => q.difficulty === 'Expert').length
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleBulkUpload} 
        style={{ display: 'none' }} 
        accept=".json"
      />
      
      {/* Hero Header Area */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Question Management</h1>
          <p className="text-on-surface-variant max-w-lg">Manage your academic database. Add, edit, or bulk import high-energy learning content for scholars.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={isBulkUploading}
            className={`flex items-center gap-2 px-6 py-3 bg-surface-container-highest text-primary font-bold rounded-xl hover:bg-surface-variant transition-all active:scale-95 ${isBulkUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="material-symbols-outlined">{isBulkUploading ? 'hourglass_top' : 'upload_file'}</span>
            {isBulkUploading ? 'Uploading...' : 'Upload JSON'}
          </button>
          <button 
            onClick={() => setShowPasteModal(true)}
            disabled={isBulkUploading}
            className={`flex items-center gap-2 px-6 py-3 bg-surface-container-low text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-high transition-all active:scale-95 border border-outline-variant/10 shadow-sm ${isBulkUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="material-symbols-outlined">content_paste</span>
            Paste Text
          </button>
          <button 
            onClick={async () => {
              if (window.confirm("Are you sure you want to delete ALL questions in the Global Pool (questions with no campaign)?")) {
                try {
                  setIsBulkUploading(true);
                  const qSnapshot = await import('firebase/firestore').then(m => m.getDocs(m.collection(db, 'questions')));
                  const batch = import('firebase/firestore').then(m => m.writeBatch(db));
                  let count = 0;
                  (await batch).valueOf();
                  const actualBatch = await batch;

                  for (let doc of qSnapshot.docs) {
                    const data = doc.data();
                    if (!data.campaignId || data.campaignId.trim() === '') {
                      actualBatch.delete(doc.ref);
                      count++;
                    }
                  }

                  if (count > 0) {
                    await actualBatch.commit();
                    alert(`Successfully deleted ${count} global questions!`);
                  } else {
                    alert("No global questions found.");
                  }
                } catch (e) {
                  console.error(e);
                  alert("Failed to delete global questions: " + e.message);
                } finally {
                  setIsBulkUploading(false);
                }
              }
            }}
            disabled={isBulkUploading}
            className={`flex items-center gap-2 px-3 py-3 bg-error/10 text-error font-bold rounded-xl hover:bg-error/20 transition-all active:scale-95 ${isBulkUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Delete All Global Questions"
          >
            <span className="material-symbols-outlined">delete_sweep</span>
            Wipe Global Pool
          </button>
          <button 
            onClick={copyTemplate}
            className="hidden lg:flex items-center gap-2 px-3 py-3 bg-transparent text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-lowest transition-all active:scale-95"
            title="Copy JSON Template"
          >
            <span className="material-symbols-outlined">content_copy</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-xl shadow-primary/20 hover:translate-y-[-2px] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add_circle</span>
            New Question
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Questions', val: stats.total, color: 'text-primary' },
          { label: 'Science Dept', val: stats.science, color: 'text-secondary' },
          { label: 'History Dept', val: stats.history, color: 'text-tertiary' },
          { label: 'Expert Levels', val: stats.expert, color: 'text-on-surface' }
        ].map((s, i) => (
          <div key={i} className={`bg-surface-container-lowest p-6 rounded-xl shadow-sm border-r-4 ${i === 3 ? 'border-secondary-container' : 'border-transparent'}`}>
            <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color} font-headline`}>{loading ? '...' : s.val.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Question</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Difficulty</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-on-surface-variant italic">Loading questions...</td>
                </tr>
              ) : questions.length > 0 ? (
                questions.map((q) => (
                  <tr key={q.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="text-on-surface font-semibold text-sm mb-1">{q.question}</p>
                      <div className="flex gap-2">
                        <span className="text-[10px] bg-secondary-container/30 text-on-secondary-container px-2 py-0.5 rounded font-bold uppercase">Answer: {q.correctAnswer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2 items-start">
                        <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter ${
                          q.category === 'Science' ? 'bg-primary/10 text-primary' : 
                          q.category === 'History' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {q.category}
                        </span>
                        {q.campaignId && (
                           <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-secondary/10 text-secondary border border-secondary/20 flex gap-1 items-center uppercase tracking-widest">
                             <span className="material-symbols-outlined text-[10px]">campaign</span>
                             Campaign Linked
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          q.difficulty === 'Expert' ? 'bg-error' : 
                          q.difficulty === 'Intermediate' ? 'bg-tertiary' : 'bg-secondary'
                        }`}></div>
                        <span className="text-sm font-medium text-on-surface">{q.difficulty}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModal(q)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button onClick={() => handleDelete(q.id)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-on-surface-variant italic">No questions found in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-surface-bright w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 bg-surface-container flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">{editingId ? 'Edit' : 'Add New'} Question</h2>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">Manual Creation Mode</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              <form onSubmit={handleSave} className="space-y-6" id="question-form">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium"
                    >
                      <option>Science</option>
                      <option>History</option>
                      <option>Mathematics</option>
                      <option>Arts</option>
                      <option>General</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Difficulty</label>
                    <select 
                      value={formData.difficulty}
                      onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium"
                    >
                      <option>Easy</option>
                      <option>Intermediate</option>
                      <option>Expert</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Campaign Link</label>
                    <select 
                      value={formData.campaignId}
                      onChange={(e) => setFormData({...formData, campaignId: e.target.value})}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium"
                    >
                      <option value="">None (Global Pool)</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.title} ({c.status})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Question Text</label>
                  <textarea 
                    value={formData.question}
                    onChange={(e) => setFormData({...formData, question: e.target.value})}
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium min-h-[100px]" 
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Answer Options</label>
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <div key={opt} className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-on-surface-variant/30">{opt}</span>
                        <input 
                          value={formData[`option${opt}`]}
                          onChange={(e) => setFormData({...formData, [`option${opt}`]: e.target.value})}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm font-medium" 
                          type="text" 
                        />
                      </div>
                      <input 
                        checked={formData.correctAnswer === opt}
                        onChange={() => setFormData({...formData, correctAnswer: opt})}
                        className="w-5 h-5 text-secondary accent-secondary" 
                        name="correct" 
                        type="radio" 
                      />
                    </div>
                  ))}
                </div>
              </form>
            </div>
            
            <div className="p-8 border-t border-outline-variant/10 flex justify-end gap-4 bg-surface-bright">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
              <button form="question-form" type="submit" className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                {editingId ? 'Update' : 'Save'} Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Import Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-surface-bright w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 bg-surface-container flex justify-between items-center border-b border-outline-variant/10">
              <div>
                <h2 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">Paste Data Import</h2>
                <p className="text-xs font-bold text-secondary uppercase tracking-widest mt-1">Smart Text Parser</p>
              </div>
              <button onClick={() => setShowPasteModal(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Assign Category</label>
                  <select 
                    id="paste-category"
                    defaultValue="General"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                  >
                    <option>General</option>
                    <option>Geography</option>
                    <option>Science & Nature</option>
                    <option>History & Society</option>
                    <option>Pop Culture & Sports</option>
                    <option>General Trivia</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Assign Difficulty</label>
                  <select 
                    id="paste-difficulty"
                    defaultValue="Easy"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                  >
                    <option>Easy</option>
                    <option>Intermediate</option>
                    <option>Expert</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Link to Campaign</label>
                  <select 
                    id="paste-campaign"
                    defaultValue=""
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">None (Global Pool)</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.title} ({c.status})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-secondary-container/20 p-4 rounded-xl border border-secondary/20 text-sm flex gap-4 items-start">
                <span className="material-symbols-outlined text-secondary mt-1">lightbulb</span>
                <div>
                  <p className="font-bold text-on-surface mb-2">Expected Format (Leave a blank line between questions):</p>
                  <pre className="text-[11px] font-mono text-on-surface-variant leading-relaxed bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10">
1. What is the powerhouse of the cell?
A. Nucleus
B. Mitochondria
C. Ribosome
D. Vacuole
Answer: B
                  </pre>
                </div>
              </div>
              <div className="flex-1 min-h-[250px] flex flex-col">
                <textarea 
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste your questions text here..."
                  className="w-full flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-4 px-5 text-sm font-medium focus:ring-2 focus:ring-primary/20 resize-none font-mono" 
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-4 bg-surface-bright">
              <button 
                onClick={() => setShowPasteModal(false)} 
                className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
                disabled={isBulkUploading}
              >
                Cancel
              </button>
              <button 
                onClick={handleParseAndImport} 
                disabled={isBulkUploading || !pasteText.trim()}
                className="px-8 py-3 bg-secondary text-secondary-container font-black rounded-xl shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined">{isBulkUploading ? 'hourglass_top' : 'bolt'}</span>
                {isBulkUploading ? 'Processing...' : 'Parse & Imbue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
