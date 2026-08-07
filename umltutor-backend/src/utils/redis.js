"use strict";

const Redis = require('ioredis');

const REDIS_CMD_MS = Number(process.env.REDIS_CMD_TIMEOUT_MS) || 50;
const MEMORY_ONLY = process.env.CACHE_MEMORY_ONLY === 'true';

const redisUrl = process.env.REDIS_URL || null;
const redisOptions = {
  connectTimeout: 1000,
  commandTimeout: REDIS_CMD_MS,
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 0,
  retryStrategy: () => null,
};

if (!redisUrl) {
  redisOptions.host = process.env.REDIS_HOST || '127.0.0.1';
  redisOptions.port = process.env.REDIS_PORT || 6379;
  redisOptions.password = process.env.REDIS_PASSWORD || undefined;
}

const memoryL1 = new Map();
const L1_TTL_MS = Number(process.env.CACHE_L1_TTL_MS) || 120_000;

let redis = null;
let redisReady = false;
/** When true, skip Redis until this timestamp (ms) — avoids stacked command timeouts. */
let redisDegradedUntil = 0;

function markRedisDegraded(reason) {
  redisDegradedUntil = Date.now() + (Number(process.env.REDIS_DEGRADE_MS) || 300_000);
  if (reason) {
    console.warn(`[Cache] Redis degraded for 5m (${reason}) — using in-memory cache only`);
  }
}

function isRedisUsable() {
  return !MEMORY_ONLY && redis && redisReady && Date.now() >= redisDegradedUntil;
}

function raceTimeout(promise, ms = REDIS_CMD_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Command timed out')), ms);
    }),
  ]);
}

try {
  if (!MEMORY_ONLY) {
    redis = redisUrl ? new Redis(redisUrl, redisOptions) : new Redis(redisOptions);

    redis.on('ready', () => {
      redisReady = true;
      console.log('Successfully connected to Redis');
    });

    redis.on('connect', () => {
      redisReady = true;
    });

    redis.on('error', (error) => {
      redisReady = false;
      markRedisDegraded(error.message);
      if (error.code === 'ECONNREFUSED' && !process.env.REDIS_MANDATORY) {
        try { redis.disconnect(); } catch { /* ignore */ }
        redis = null;
      }
    });

    redis.connect().catch((err) => {
      markRedisDegraded(err.message);
      redis = null;
      redisReady = false;
    });
  } else {
    console.log('[Cache] CACHE_MEMORY_ONLY=true — Redis disabled');
  }
} catch (error) {
  console.error('Failed to initialize Redis:', error.message);
  redis = null;
}

function l1Get(key) {
  const hit = memoryL1.get(key);
  if (!hit || Date.now() - hit.ts > L1_TTL_MS) {
    if (hit) memoryL1.delete(key);
    return null;
  }
  return hit.value;
}

function l1Set(key, value) {
  memoryL1.set(key, { value, ts: Date.now() });
}

function l1DelPrefix(prefix) {
  for (const k of memoryL1.keys()) {
    if (k.startsWith(prefix)) memoryL1.delete(k);
  }
}

function fireAndForget(fn) {
  Promise.resolve().then(fn).catch(() => {});
}

const cacheService = {
  isMemoryOnly: () => !isRedisUsable(),

  async ping() {
    if (!redis || MEMORY_ONLY) return false;
    try {
      const pong = await raceTimeout(redis.ping(), 200);
      redisReady = pong === 'PONG';
      return redisReady;
    } catch {
      markRedisDegraded('ping failed');
      return false;
    }
  },

  async get(key) {
    const l1 = l1Get(key);
    if (l1 !== null) return l1;

    if (!isRedisUsable()) return null;

    try {
      const data = await raceTimeout(redis.get(key));
      const parsed = data ? JSON.parse(data) : null;
      if (parsed !== null) l1Set(key, parsed);
      return parsed;
    } catch (error) {
      markRedisDegraded(error.message);
      return null;
    }
  },

  /** Always writes L1 immediately; Redis write is async and never blocks the response. */
  async set(key, value, ttlSeconds = 3600) {
    l1Set(key, value);
    if (!isRedisUsable()) return;

    fireAndForget(async () => {
      try {
        await raceTimeout(redis.set(key, JSON.stringify(value), 'EX', ttlSeconds));
      } catch {
        markRedisDegraded('set failed');
      }
    });
  },

  async del(key) {
    memoryL1.delete(key);
    if (!isRedisUsable()) return;

    fireAndForget(async () => {
      try {
        await raceTimeout(redis.del(key));
      } catch {
        markRedisDegraded('del failed');
      }
    });
  },

  async delPrefix(prefix) {
    l1DelPrefix(prefix);
    if (!isRedisUsable()) return;

    fireAndForget(async () => {
      try {
        const keys = await raceTimeout(redis.keys(`${prefix}*`), 100);
        if (keys.length > 0) await raceTimeout(redis.del(...keys), 100);
      } catch {
        markRedisDegraded('delPrefix failed');
      }
    });
  },
};

module.exports = cacheService;
