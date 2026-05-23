"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const userCache = require('../utils/userCache');
const passwordUtils = require('../utils/password');
const jwtUtils = require('../utils/jwt');
const { AuthenticationError, ValidationError } = require('../utils/errors');

/**
 * Auth Service - optimized with improved caching, rate limiting, and password hashing.
 */

// Simple in-memory rate limiter for login attempts
const rateLimiter = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier) {
  const now = Date.now();
  const record = rateLimiter.get(identifier);
  
  if (!record || now - record.timestamp > WINDOW_MS) {
    rateLimiter.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  record.count++;
  return true;
}

function clearRateLimit(identifier) {
  rateLimiter.delete(identifier);
}

const authService = {
    async register(userData) {
        const { email, password, firstName, lastName, role } = userData;

        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new ValidationError('This email is already registered. Please use a different email or login.');
        }

        // Optimized password hashing with stronger salt rounds
        const hashedPassword = await passwordUtils.hashPassword(password);
        const user = await userRepository.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role
        });

        const token = jwtUtils.generateToken(user.id, user.role);
        // Cache the new user immediately
        userCache.setById(user.id, user);
        return { user, token };
    },

    async login(email, password) {
        // Rate limiting check
        const rateLimitKey = `login:${email}`;
        if (!checkRateLimit(rateLimitKey)) {
            throw new AuthenticationError('Too many login attempts. Please try again later.');
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new AuthenticationError('You are trying to login with an invalid email. Please try to register with a valid email before logging in.');
        }

        const isPasswordValid = await passwordUtils.comparePassword(password, user.password);
        if (!isPasswordValid) {
            throw new AuthenticationError('You have entered an incorrect password. Please enter the correct password.');
        }

        // Clear rate limit on successful login
        clearRateLimit(rateLimitKey);

        const token = jwtUtils.generateToken(user.id, user.role);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
            token,
        };
    },

    async getProfile(userId) {
        if (!userId) {
            const error = new Error('User ID is missing');
            error.code = 'MISSING_ID';
            error.status = 400;
            throw error;
        }

        const cached = userCache.getById(Number(userId));
        if (cached) return cached;

        const user = await userRepository.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.code = 'USER_NOT_FOUND';
            error.status = 404;
            throw error;
        }

        // Cache with longer TTL for profile data
        userCache.setById(user.id, user);
        return user;
    },

    async deleteAccount(userId) {
        if (!userId) {
            const error = new Error('User ID is missing');
            error.code = 'MISSING_ID';
            error.status = 400;
            throw error;
        }

        userCache.invalidateById(Number(userId));
        return userRepository.deleteById(userId);
    },

    async changePassword(userId, newPassword) {
        if (!userId || !newPassword) {
            throw new ValidationError('User ID and new password are required');
        }

        const hashedPassword = await passwordUtils.hashPassword(newPassword);
        const updated = await userRepository.update(userId, { password: hashedPassword });
        userCache.invalidateById(Number(userId));
        return updated;
    }
};

exports.default = authService;
