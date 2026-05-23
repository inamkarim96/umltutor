"use strict";

const cacheService = require('./redis');

const memory = new Map();
const DEFAULT_MEM_TTL_MS = Number(process.env.CACHE_L1_TTL_MS) || 120_000;

/** In-flight loaders — parallel requests share one DB call. */
const inflight = new Map();

function memGet(key) {
  const hit = memory.get(key);
  if (!hit || Date.now() - hit.ts > hit.ttl) {
    if (hit) memory.delete(key);
    return null;
  }
  return hit.value;
}

function memSet(key, value, ttlMs = DEFAULT_MEM_TTL_MS) {
  memory.set(key, { value, ts: Date.now(), ttl: ttlMs });
}

function memDel(key) {
  memory.delete(key);
}

/**
 * Memory-first cache. Redis is optional L2 and never blocks the HTTP response.
 */
async function cached(key, ttlSeconds, loader, memTtlMs = DEFAULT_MEM_TTL_MS) {
  const mem = memGet(key);
  if (mem !== null) return mem;

  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    if (!cacheService.isMemoryOnly()) {
      const redisHit = await cacheService.get(key);
      if (redisHit !== null) {
        memSet(key, redisHit, memTtlMs);
        return redisHit;
      }
    }

    const value = await loader();
    memSet(key, value, memTtlMs);
    cacheService.set(key, value, ttlSeconds);
    return value;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

function invalidate(key) {
  memDel(key);
  cacheService.del(key);
}

function invalidatePrefix(prefix) {
  for (const k of memory.keys()) {
    if (k.startsWith(prefix)) memory.delete(k);
  }
  cacheService.delPrefix(prefix);
}

module.exports = {
  cached,
  invalidate,
  invalidatePrefix,
  memGet,
  memSet,
  memDel,
};
