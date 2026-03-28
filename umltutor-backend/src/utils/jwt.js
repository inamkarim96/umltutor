"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _jsonwebtoken = require('jsonwebtoken'); var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
exports.JWT_SECRET = JWT_SECRET;
const JWT_EXPIRES_IN = '7d';






/**
 * Generate a JWT token for a user
 * @param userId - The user's unique identifier
 * @param role - The user's role (STUDENT or TEACHER)
 * @returns JWT token string
 */
 const generateToken = (userId, role) => {
    const payload = {
        userId,
        role,
    };

    return _jsonwebtoken2.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}; exports.generateToken = generateToken;

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
 const verifyToken = (token) => {
    try {
        const decoded = _jsonwebtoken2.default.verify(token, JWT_SECRET) ;
        return decoded;
    } catch (error) {
        if (error instanceof _jsonwebtoken2.default.JsonWebTokenError) {
            throw new Error('Invalid token');
        }
        if (error instanceof _jsonwebtoken2.default.TokenExpiredError) {
            throw new Error('Token expired');
        }
        throw new Error('Token verification failed');
    }
}; exports.verifyToken = verifyToken;
