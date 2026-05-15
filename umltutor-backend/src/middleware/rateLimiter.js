"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _expressratelimit = require('express-rate-limit'); var _expressratelimit2 = _interopRequireDefault(_expressratelimit);


/**
 * Rate limiting middleware for API protection
 */

// Default rate limiter
const apiLimiter = _expressratelimit2.default.call(void 0, {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // Default 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 100 : 1000), 
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
}); exports.apiLimiter = apiLimiter;

// Strict rate limiter for authentication routes
const authLimiter = _expressratelimit2.default.call(void 0, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 5 : 50),
  skipSuccessfulRequests: false, // Don't skip successful requests for auth - prevents brute force
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
}); exports.authLimiter = authLimiter;

// Relaxed rate limiter for public endpoints
const publicLimiter = _expressratelimit2.default.call(void 0, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.PUBLIC_RATE_LIMIT_MAX) || 500,
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
