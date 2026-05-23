"use strict";

const crypto = require('crypto');

const TTL_MS = Number(process.env.TOKEN_CACHE_TTL_MS) || 5 * 60 * 1000;
const MAX_ENTRIES = 2000;
const cache = new Map();
/** @type {Map<string, Promise<object>>} */
const inflight = new Map();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function prune() {
  if (cache.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.ts > TTL_MS) cache.delete(key);
    if (cache.size <= MAX_ENTRIES * 0.8) break;
  }
}

/**
 * Cache Firebase verifyIdToken results per token hash.
 * Parallel dashboard requests share one verify call instead of each taking ~2s.
 */
async function verifyIdTokenCached(admin, idToken) {
  const key = hashToken(idToken);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return hit.decoded;
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = admin.auth()
    .verifyIdToken(idToken)
    .then((decoded) => {
      cache.set(key, { decoded, ts: Date.now() });
      prune();
      return decoded;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

function invalidateToken(idToken) {
  if (!idToken) return;
  cache.delete(hashToken(idToken));
}

module.exports = { verifyIdTokenCached, invalidateToken };
