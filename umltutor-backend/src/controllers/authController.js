"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const _zod = require('zod');
const authService = _interopRequireDefault(require('../services/authService')).default;

// Validation schemas
const registerSchema = _zod.z.object({
    email: _zod.z.string().email('Invalid email address'),
    password: _zod.z.string().min(6, 'Password must be at least 6 characters'),
    firstName: _zod.z.string().min(1, 'First name is required'),
    lastName: _zod.z.string().min(1, 'Last name is required'),
    role: _zod.z.enum(['STUDENT', 'TEACHER'], {
        errorMap: () => ({ message: 'Role must be either STUDENT or TEACHER' }),
    }),
});

const loginSchema = _zod.z.object({
    email: _zod.z.string().email('Invalid email address'),
    password: _zod.z.string().min(1, 'Password is required'),
});

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        // Validate request body
        const validatedData = registerSchema.parse(req.body);
        const { user, token } = await authService.register(validatedData);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user,
                token,
            },
        });
    } catch (error) {
        if (error instanceof _zod.z.ZodError) {
            res.status(400).json({
                success: false,
                error: {
                    message: 'Validation error',
                    code: 'VALIDATION_ERROR',
                    details: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    }))
                }
            });
            return;
        }
        next(error);
    }
}; exports.register = register;

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        // Validate request body
        const validatedData = loginSchema.parse(req.body);
        const { user, token } = await authService.login(validatedData.email.toLowerCase(), validatedData.password);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                token,
            },
        });
    } catch (error) {
        if (error instanceof _zod.z.ZodError) {
            res.status(400).json({
                success: false,
                error: {
                    message: 'Validation error',
                    code: 'VALIDATION_ERROR',
                    details: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    }))
                }
            });
            return;
        }
        next(error);
    }
}; exports.login = login;

/**
 * Logout user
 */
const logout = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during logout',
        });
    }
}; exports.logout = logout;

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                }
            });
            return;
        }

        const userId = req.user.userId;
        const user = await authService.getProfile(userId);

        res.status(200).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        next(error);
    }
}; exports.getProfile = getProfile;
