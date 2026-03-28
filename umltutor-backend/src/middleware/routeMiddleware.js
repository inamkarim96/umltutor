"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const jwt = require('../utils/jwt');
const logger = require('../utils/logger');
const { sendError } = require('../utils/errors');

/**
 * Middleware for route-specific operations
 * Handles authentication, request logging, and common route setup
 */
class RouteMiddleware {
  /**
   * Apply authentication middleware to a route
   */
  static authenticate = async (req, res, next) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, new AuthenticationError('No token provided. Please include a Bearer token in the Authorization header.'));
      }

      // Extract token (remove 'Bearer ' prefix)
      const token = authHeader.substring(7);

      // Verify token
      const decoded = jwt.verifyToken(token);

      // Get user data from database
      const prisma = require('../utils/prisma').default;
      const user = await prisma.user.findUnique({
        where: { id: Number(decoded.userId) },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (!user) {
        return sendError(res, new AuthenticationError('User not found'));
      }

      // Attach user info to request
      req.user = {
        userId: user.id,
        role: user.role,
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      next();
    } catch (error) {
      logger.logError(error, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return sendError(res, error);
    }
  };

  /**
   * Apply authorization middleware to a route
   */
  static authorize = (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return sendError(res, new AuthenticationError('Authentication required'));
      }

      if (!roles.includes(req.user.role)) {
        return sendError(res, new AuthorizationError('You do not have permission to access this resource'));
      }

      next();
    };
  };

  /**
   * Add request logging middleware
   */
  static requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Generate unique request ID
    const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId;

    // Log request
    logger.logHttp(req, res, Date.now() - startTime);

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
      logger.logHttp(req, res, Date.now() - startTime);
      return originalJson.call(this, data);
    };

    next();
  };

  /**
   * Apply common route setup
   */
  static setupRoute = (router) => {
    // Apply request logging to all routes in this router
    router.use(this.requestLogger);
    return router;
  };

  /**
   * Apply authentication to all routes in a router
   */
  static requireAuth = (router) => {
    router.use(this.authenticate);
    return router;
  };

  /**
   * Apply authentication and authorization to all routes in a router
   */
  static requireAuthAndAuthorize = (router, ...roles) => {
    router.use(this.authenticate);
    router.use(this.authorize(...roles));
    return router;
  };
}

module.exports = RouteMiddleware;
