"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _expressratelimit = require('express-rate-limit'); var _expressratelimit2 = _interopRequireDefault(_expressratelimit);


/**
 * Rate limiting middleware for API protection
 */

// Default rate limiter (increased for development to prevent loops from blocking access)
 const apiLimiter = _expressratelimit2.default.call(void 0, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Significantly increased for local/dev environments to prevent loops from blocking access
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
}); exports.apiLimiter = apiLimiter;

// Strict rate limiter for authentication routes (login/register/profile)
 const authLimiter = _expressratelimit2.default.call(void 0, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased to avoid blocking rapid profile syncs in dev
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
}); exports.authLimiter = authLimiter;

// Relaxed rate limiter for public endpoints (1000 requests per 15 minutes)
 const publicLimiter = _expressratelimit2.default.call(void 0, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
}); exports.publicLimiter = publicLimiter;

/**
 * Create a custom rate limiter with specified parameters
 */
 const createCustomLimiter = (windowMs, max) => {
  return _expressratelimit2.default.call(void 0, {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });
}; exports.createCustomLimiter = createCustomLimiter;
