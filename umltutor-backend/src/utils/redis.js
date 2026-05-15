"use strict";
const Redis = require('ioredis');
const logger = require('./logger');

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

let redis;

try {
  redis = new Redis(redisOptions);

  redis.on('connect', () => {
    console.log('🚀 Successfully connected to Redis');
  });

  redis.on('error', (error) => {
    if (error.code === 'ECONNREFUSED') {
      // Gracefully handle missing Redis in dev environment
      if (!process.env.REDIS_MANDATORY) {
        console.warn('⚠️ Redis not found at ' + redisOptions.host + ':' + redisOptions.port + '. Caching is disabled (falling back to DB).');
        redis.disconnect();
        redis = null;
      }
    } else {
      console.error('❌ Redis connection error:', error.message);
    }
  });
} catch (error) {
  console.error('❌ Failed to initialize Redis:', error.message);
  redis = null;
}

const cacheService = {
  async get(key) {
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis Get Error [${key}]:`, error.message);
      return null;
    }
  },

  async set(key, value, ttlSeconds = 3600) {
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      console.error(`Redis Set Error [${key}]:`, error.message);
    }
  },

  async del(key) {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Redis Del Error [${key}]:`, error.message);
    }
  },

  async delPrefix(prefix) {
    if (!redis) return;
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error(`Redis DelPrefix Error [${prefix}]:`, error.message);
    }
  }
};

module.exports = cacheService;
