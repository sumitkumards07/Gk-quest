import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import dotenv from 'dotenv';

// Load .env from gkquest folder where it probably exists, but dotenv.config() uses current dir.
// The user ran populate_legal.js here, so .env must be here.
dotenv.config();

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

async function deleteGlobalQuestions() {
  try {
    console.log("Fetching questions from the Global Pool (no campaignId)...");
    
    // We need to fetch questions where campaignId is "" OR where it might be missing entirely
    // Often when they are in Global Pool, campaignId == ""
    const q1 = query(collection(db, 'questions'), where('campaignId', '==', ''));
    
    const snapshot1 = await getDocs(q1);
    
    // Also try to find those that might completely lack the field just in case
    // Note: Firestore requires a different query or fetching all and filtering locally
    // For safety, let's fetch ALL questions and filter locally to ensure we get EXACTLY those without a real campaign
    
    console.log(`Found ${snapshot1.size} questions with campaignId === ""`);
    
    // Fallback: fetch all and filter manually to be absolutely thorough
    const allSnapshot = await getDocs(collection(db, 'questions'));
    const toDelete = [];
    
    allSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.campaignId || data.campaignId.trim() === '') {
        toDelete.push(doc.ref);
      }
    });

    console.log(`Total globally pooled questions found: ${toDelete.length}`);
    
    if (toDelete.length === 0) {
      console.log("No global questions found to delete.");
      process.exit(0);
    }
    
    // Delete in batches of 500
    let batch = writeBatch(db);
    let count = 0;
    
    for (let i = 0; i < toDelete.length; i++) {
        batch.delete(toDelete[i]);
        count++;
        
        if (count === 500) {
            await batch.commit();
            console.log("Committed a batch of 500...");
            batch = writeBatch(db);
            count = 0;
        }
    }
    
    if (count > 0) {
        await batch.commit();
    }
    
    console.log(`Successfully deleted ${toDelete.length} questions from the global pool!`);
    process.exit(0);
  } catch (e) {
    console.error("Error deleting globals:", e);
    process.exit(1);
  }
}

deleteGlobalQuestions();
