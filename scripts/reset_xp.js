#!/usr/bin/env node

/**
 * Reset all users' XP (totalScore and weeklyTotal) to 0
 * Run: node scripts/reset_xp.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./admin/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function resetAllXP() {
  try {
    console.log('Starting XP reset for all users...');
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log('No users found.');
      return;
    }

    let resetCount = 0;
    const batch = db.batch();

    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        totalScore: 0,
        weeklyTotal: 0,
        lastWeeklyReset: admin.firestore.FieldValue.serverTimestamp(),
      });
      resetCount++;
    });

    await batch.commit();
    console.log(`✓ Successfully reset XP for ${resetCount} users to 0`);
    console.log('All users now have totalScore: 0, weeklyTotal: 0');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting XP:', error);
    process.exit(1);
  }
}

resetAllXP();
