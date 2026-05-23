"use strict";

/**
 * First verifyIdToken() downloads Google's JWKS (~2–6s on cold start).
 * Warm that cache at server boot so API requests stay under 50ms.
 */
async function warmFirebaseAuth() {
  try {
    const admin = require('../config/firebase-admin');
    if (!admin.apps?.length) return;

    const start = Date.now();
    await admin.auth().verifyIdToken('__warmup__').catch(() => {});
    console.log(`[Warmup] Firebase Auth certificates ready (${Date.now() - start}ms)`);
  } catch (err) {
    console.warn('[Warmup] Firebase Auth warmup failed:', err.message);
  }
}

module.exports = { warmFirebaseAuth };
