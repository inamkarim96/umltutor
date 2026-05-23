"use strict";

/**
 * In-memory user profile cache keyed by Firebase UID or email.
 * Cuts ~10–30ms per request vs repeated Prisma lookups after token verify.
 */
const TTL_MS = Number(process.env.USER_CACHE_TTL_MS) || 5 * 60 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map();

function cacheKey(uid, email) {
  return uid || (email && email.toLowerCase()) || '';
}

function prune() {
  if (cache.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.ts > TTL_MS) cache.delete(key);
    if (cache.size <= MAX_ENTRIES * 0.8) break;
  }
}

const userCache = {
  get(uid, email) {
    const key = cacheKey(uid, email);
    if (!key) return null;
    const entry = cache.get(key);
    if (!entry || Date.now() - entry.ts > TTL_MS) {
      if (entry) cache.delete(key);
      return null;
    }
    return entry.user;
  },

  set(uid, email, user) {
    if (!user) return;
    const key = cacheKey(uid, email);
    if (!key) return;
    cache.set(key, { user, ts: Date.now() });
    prune();
  },

  invalidate(uid, email) {
    const key = cacheKey(uid, email);
    if (key) cache.delete(key);
  },

  getById(userId) {
    if (!userId) return null;
    const entry = cache.get(`id:${userId}`);
    if (!entry || Date.now() - entry.ts > TTL_MS) {
      if (entry) cache.delete(`id:${userId}`);
      return null;
    }
    return entry.user;
  },

  setById(userId, user) {
    if (!user || !userId) return;
    cache.set(`id:${userId}`, { user, ts: Date.now() });
    if (user.email) cache.set(cacheKey(null, user.email), { user, ts: Date.now() });
    prune();
  },

  invalidateById(userId) {
    if (!userId) return;
    cache.delete(`id:${userId}`);
  },
};

module.exports = userCache;
