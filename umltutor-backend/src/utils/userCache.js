"use strict";

/**
 * In-memory user profile cache keyed by Firebase UID, email, or numeric User ID.
 * Cuts ~10–30ms per request vs repeated Prisma lookups after token verify.
 */
const TTL_MS = Number(process.env.USER_CACHE_TTL_MS) || 10 * 60 * 1000;
const MAX_ENTRIES = 2000;
const cache = new Map();

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
    const now = Date.now();
    if (uid) {
      const entry = cache.get(`uid:${uid}`);
      if (entry && now - entry.ts <= TTL_MS) return entry.user;
      if (entry) cache.delete(`uid:${uid}`);
    }
    if (email) {
      const key = `email:${email.toLowerCase()}`;
      const entry = cache.get(key);
      if (entry && now - entry.ts <= TTL_MS) return entry.user;
      if (entry) cache.delete(key);
    }
    return null;
  },

  set(uid, email, user) {
    if (!user) return;
    const entry = { user, ts: Date.now() };
    if (uid) cache.set(`uid:${uid}`, entry);
    if (email) cache.set(`email:${email.toLowerCase()}`, entry);
    if (user.id) cache.set(`id:${user.id}`, entry);
    prune();
  },

  invalidate(uid, email) {
    if (uid) cache.delete(`uid:${uid}`);
    if (email) cache.delete(`email:${email.toLowerCase()}`);
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
    const entry = { user, ts: Date.now() };
    cache.set(`id:${userId}`, entry);
    if (user.email) cache.set(`email:${user.email.toLowerCase()}`, entry);
    if (user.firebaseUid) cache.set(`uid:${user.firebaseUid}`, entry);
    prune();
  },

  invalidateById(userId) {
    if (!userId) return;
    cache.delete(`id:${userId}`);
  },
};

module.exports = userCache;

