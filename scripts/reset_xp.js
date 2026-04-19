#!/usr/bin/env node

/**
 * Reset all users' totalScore and weeklyTotal to 0 in Firestore.
 *
 * Usage:
 *   node scripts/reset_xp.js
 *
 * The script looks for your service account key in the following order:
 *   1. GOOGLE_APPLICATION_CREDENTIALS env variable (path to key file)
 *   2. scripts/serviceAccountKey.json
 *   3. serviceAccountKey.json  (project root)
 *
 * Download your key from:
 *   Firebase Console → Project Settings → Service accounts → Generate new private key
 */

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// ── Resolve service-account key ──────────────────────────────────────────────
function resolveKeyPath() {
  // 1. Honour GOOGLE_APPLICATION_CREDENTIALS if set
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const envPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(envPath)) return envPath;
    console.error(`✗ GOOGLE_APPLICATION_CREDENTIALS points to a missing file:\n  ${envPath}`);
    process.exit(1);
  }

  // 2. Next to this script
  const nextToScript = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(nextToScript)) return nextToScript;

  // 3. Project root
  const projectRoot = path.join(__dirname, '..', 'serviceAccountKey.json');
  if (fs.existsSync(projectRoot)) return projectRoot;

  console.error(
    '\n✗ Service account key not found.\n\n' +
    'Please do ONE of the following:\n\n' +
    '  A) Place the key file at:\n' +
    `       ${nextToScript}\n` +
    '     or\n' +
    `       ${projectRoot}\n\n` +
    '  B) Set the environment variable before running:\n' +
    '       GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/reset_xp.js\n\n' +
    'Download the key:\n' +
    '  Firebase Console → Project Settings → Service accounts → Generate new private key\n'
  );
  process.exit(1);
}

// ── Initialise Admin SDK ─────────────────────────────────────────────────────
const keyPath = resolveKeyPath();
console.log(`Using service account key: ${keyPath}\n`);

admin.initializeApp({
  credential: admin.credential.cert(require(keyPath)),
});

const db = admin.firestore();

// ── Reset logic ──────────────────────────────────────────────────────────────
async function resetAllXP() {
  try {
    console.log('⏳ Fetching all users from Firestore...');
    const snapshot = await db.collection('users').get();

    if (snapshot.empty) {
      console.log('ℹ No users found – nothing to reset.');
      process.exit(0);
    }

    // Firestore batches are limited to 500 ops each
    const BATCH_SIZE = 500;
    const docs       = snapshot.docs;
    let   totalReset = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);

      chunk.forEach((doc) => {
        batch.update(doc.ref, {
          totalScore:      0,
          weeklyTotal:     0,
          lastWeeklyReset: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      totalReset += chunk.length;
      console.log(`  ✓ Batch committed – ${totalReset} / ${docs.length} users reset`);
    }

    console.log(`\n✅ Done! Reset totalScore & weeklyTotal to 0 for ${totalReset} user(s).`);
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Error during reset:', err.message || err);
    process.exit(1);
  }
}

resetAllXP();
