import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch } from "firebase/firestore";
import dotenv from 'dotenv';
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

async function deleteAllTransactions() {
  try {
    console.log("Fetching all transactions...");
    const snapshot = await getDocs(collection(db, 'transactions'));
    
    if (snapshot.empty) {
      console.log("No transactions found to delete.");
      process.exit(0);
    }
    
    let batch = writeBatch(db);
    let count = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      
      if (count % 500 === 0) {
          await batch.commit();
          console.log(`Committed batch of 500. Total deleted so far: ${count}`);
          batch = writeBatch(db);
      }
    }
    
    if (count % 500 !== 0) {
        await batch.commit();
    }
    
    console.log(`Successfully wiped all ${count} records from the 'transactions' collection!`);

    console.log("Also fetching all payout_requests just in case...");
    const payoutSnap = await getDocs(collection(db, 'payout_requests'));
    
    if (!payoutSnap.empty) {
      let b2 = writeBatch(db);
      let c2 = 0;
      for (const d of payoutSnap.docs) {
        b2.delete(d.ref);
        c2++;
        if (c2 % 500 === 0) {
          await b2.commit();
          b2 = writeBatch(db);
        }
      }
      if (c2 % 500 !== 0) {
        await b2.commit();
      }
      console.log(`Successfully wiped ${c2} records from the 'payout_requests' collection!`);
    } else {
      console.log("No payout_requests found to delete.");
    }

    process.exit(0);
  } catch (e) {
    console.error("Error deleting transactions:", e);
    process.exit(1);
  }
}

deleteAllTransactions();
