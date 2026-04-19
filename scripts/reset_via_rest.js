#!/usr/bin/env node

/**
 * Reset all users' totalScore and weeklyTotal to 0
 * Uses the Firebase CLI's cached credentials — no service account key needed.
 *
 * Run: node scripts/reset_via_rest.js
 */

const https    = require('https');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');

const PROJECT_ID     = 'gk-quest-with-rewards';
const FIRESTORE_BASE = `firestore.googleapis.com`;
const OAUTH_HOST     = 'oauth2.googleapis.com';
// Firebase CLI's own OAuth client (public, same as firebase-tools uses)
const CLIENT_ID      = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET  = 'j9iVZfS8ggTBrToGdhFTSCNp';

// ── Load refresh token from Firebase CLI cache ───────────────────────────────
function loadRefreshToken() {
  const cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(cfgPath)) {
    console.error('✗ Firebase CLI config not found. Run `firebase login` first.');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const token = cfg?.tokens?.refresh_token;
  if (!token) {
    console.error('✗ No refresh token found. Run `firebase login` first.');
    process.exit(1);
  }
  return token;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
function post(host, path, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const req  = https.request(
      { host, path, method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function apiPost(host, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request(
      { host, path, method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json',
                   'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function apiGet(host, path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host, path, method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` } },
      (res) => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Exchange refresh token for access token
  console.log('🔑 Authenticating with Firebase...');
  const refreshToken = loadRefreshToken();
  const tokenRes = await post(
    OAUTH_HOST,
    '/token',
    `grant_type=refresh_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${encodeURIComponent(refreshToken)}`
  );
  if (tokenRes.status !== 200 || !tokenRes.body.access_token) {
    console.error('✗ Failed to get access token:', JSON.stringify(tokenRes.body));
    process.exit(1);
  }
  const accessToken = tokenRes.body.access_token;
  console.log('✓ Authenticated\n');

  // 2. List all users documents
  console.log('⏳ Fetching all users from Firestore...');
  const colPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users`;
  let   allDocs = [];
  let   pageToken = '';

  do {
    const url   = `${colPath}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res   = await apiGet(FIRESTORE_BASE, url, accessToken);
    if (res.status !== 200) {
      console.error('✗ Failed to list users:', JSON.stringify(res.body));
      process.exit(1);
    }
    const docs = res.body.documents || [];
    allDocs.push(...docs);
    pageToken = res.body.nextPageToken || '';
  } while (pageToken);

  if (allDocs.length === 0) {
    console.log('ℹ No users found – nothing to reset.');
    process.exit(0);
  }
  console.log(`Found ${allDocs.length} user(s). Resetting now...\n`);

  // 3. Batch-write reset for all users (Firestore batch write, max 500 per call)
  const CHUNK = 500;
  let   total = 0;

  for (let i = 0; i < allDocs.length; i += CHUNK) {
    const chunk   = allDocs.slice(i, i + CHUNK);
    const writes  = chunk.map(doc => ({
      update: {
        name:   doc.name,
        fields: {
          totalScore:      { integerValue: '0' },
          weeklyTotal:     { integerValue: '0' },
          lastWeeklyReset: { timestampValue: new Date().toISOString() },
        },
      },
      updateMask: { fieldPaths: ['totalScore', 'weeklyTotal', 'lastWeeklyReset'] },
    }));

    const batchPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents:batchWrite`;
    const res       = await apiPost(FIRESTORE_BASE, batchPath, { writes }, accessToken);

    if (res.status !== 200) {
      console.error(`✗ Batch ${Math.floor(i / CHUNK) + 1} failed (HTTP ${res.status}):`, JSON.stringify(res.body));
      process.exit(1);
    }

    // Check individual write statuses
    const statuses = res.body.writeResults || [];
    const errors   = (res.body.status || []).filter(s => s && s.code && s.code !== 0);
    if (errors.length > 0) {
      console.error('✗ Some writes failed:', JSON.stringify(errors));
      process.exit(1);
    }

    total += chunk.length;
    console.log(`  ✓ Batch ${Math.floor(i / CHUNK) + 1} done — ${total}/${allDocs.length} users reset`);
  }

  console.log(`\n✅ Done! totalScore & weeklyTotal reset to 0 for all ${total} user(s).`);
}

main().catch(err => {
  console.error('✗ Unexpected error:', err.message || err);
  process.exit(1);
});
