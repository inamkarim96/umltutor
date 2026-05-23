"use strict";

const admin = require('../config/firebase-admin');
const logger = require('../utils/logger');
const userCache = require('../utils/userCache');
const { verifyIdTokenCached } = require('../utils/tokenCache');
const { sendError, AuthenticationError, AuthorizationError } = require('../utils/errors');

/**
 * Middleware for route-specific operations
 * Handles authentication, request logging, and role-based authorization
 */
class RouteMiddleware {
  /**
   * Authenticate requests using Firebase ID tokens
   */
  static authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[Auth] No token provided for ${req.method} ${req.originalUrl}`);
        return res.status(401).json({
          success: false,
          message: 'No token provided. Please include a Firebase ID token in the Authorization header.',
        });
      }

      const idToken = authHeader.substring(7);
      const authStart = Date.now();

      let decodedToken;
      try {
        decodedToken = await verifyIdTokenCached(admin, idToken);
      } catch (verifyError) {
        console.error(`[Auth] Token verification failed: ${verifyError.message}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          error: verifyError.message
        });
      }

      const { email, uid, name, email_verified } = decodedToken;

      const verifyMs = Date.now() - authStart;

      let user = userCache.get(uid, email);
      const userStart = Date.now();
      if (!user) {
        const prisma = require('../config/prisma');
        user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            role: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });
        if (user) {
          userCache.set(uid, email, user);
          userCache.setById(user.id, user);
        }
      }
      const authMs = Date.now() - authStart;
      if (authMs > 50) {
        console.log(`[Perf] auth ${req.method} ${req.originalUrl} verify=${verifyMs}ms user=${Date.now() - userStart}ms total=${authMs}ms`);
      }

      const isSyncRequest = req.path === '/sync' || req.originalUrl.includes('/auth/sync');

      if (!user && !isSyncRequest) {
        console.warn(`[Auth] User not found in DB: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'User profile not found. Please complete registration.',
          needsRegistration: true,
          firebaseUser: { email, uid, name }
        });
      }

      // Block unverified users for non-sync routes
      // Note: In development, you might want to allow this if testing is difficult
      const skipEmailVerification = process.env.NODE_ENV === 'development' && process.env.SKIP_EMAIL_VERIFY === 'true';
      
      if (!email_verified && !isSyncRequest && !skipEmailVerification) {
          console.warn(`[Auth] Email not verified: ${email}`);
          return res.status(401).json({
              success: false,
              message: 'Email verification required. Please check your inbox.',
              needsEmailVerification: true
          });
      }

      // Attach user info to request
      if (user) {
          req.user = {
            id: user.id,
            userId: user.id,
            role: user.role,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            firebaseUid: uid
          };
      } else {
          req.firebaseUser = { email, uid, name };
      }

      next();
    } catch (error) {
      console.error('[Auth] Internal Middleware Error:', error);
      logger.logError(error, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication',
        error: error.message
      });
    }
  };

  /**
   * Authorize requests based on user roles
   */
  static authorize = (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        console.warn(`[Auth] Authorization failed: No user attached to request`);
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        console.warn(`[Auth] Forbidden: User ${req.user.email} (Role: ${req.user.role}) attempted to access ${req.originalUrl} requiring ${roles.join(' or ')}`);
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this resource',
            requiredRoles: roles,
            currentRole: req.user.role
        });
      }

      next();
    };
  };

  /**
   * Request logging middleware
   */
  static requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 5)}`;
    req.requestId = requestId;

    // Override res.json to log response status
    const originalJson = res.json;
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      res.setHeader('X-Response-Time', `${responseTime}ms`);
      if (res.statusCode >= 400 || responseTime > 50) {
        console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${responseTime}ms)`);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

module.exports = RouteMiddleware;

