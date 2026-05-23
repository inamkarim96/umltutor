"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var _jwt = require('../utils/jwt');

var _prisma = require('../utils/prisma'); var _prisma2 = _interopRequireDefault(_prisma);
const userCache = require('../utils/userCache');

// Extend Express Request type to include user information


















/**
 * Middleware to authenticate requests using JWT
 * Verifies the token from the Authorization header
 */
 const authenticate = async (
    req,
    res,
    next
) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'No token provided. Please include a Bearer token in the Authorization header.',
            });
            return;
        }

        // Extract token (remove 'Bearer ' prefix)
        const token = authHeader.substring(7);

        // Verify token
        const decoded = _jwt.verifyToken.call(void 0, token);

        // Cache-first user lookup — avoids a DB hit on every authenticated request
        let user = userCache.getById(Number(decoded.userId));
        if (!user) {
            user = await _prisma2.default.user.findUnique({
                where: { id: Number(decoded.userId) },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                },
            });
            if (user) userCache.setById(user.id, user);
        }

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not found',
            });
            return;
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
        console.error('Authentication error:', error);
        if (error instanceof Error) {
            res.status(401).json({
                success: false,
                message: error.message,
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Authentication failed',
            });
        }
    }
}; exports.authenticate = authenticate;

/**
 * Middleware to authorize requests based on user role
 * @param roles - Array of allowed roles
 */
 const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        if (!roles.includes(req.user.role )) {
            res.status(403).json({
                success: false,
                message: 'You do not have permission to access this resource',
            });
            return;
        }

        next();
    };
}; exports.authorize = authorize;
