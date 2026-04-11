"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const _zod = require('zod');
const authService = _interopRequireDefault(require('../services/authService')).default;
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const prisma = require('../utils/prisma').default;

// Validation schemas
const registerSchema = _zod.z.object({
    email: _zod.z.string().email('Invalid email address'),
    firstName: _zod.z.string().min(1, 'First name is required'),
    lastName: _zod.z.string().min(1, 'Last name is required'),
    role: _zod.z.enum(['STUDENT', 'TEACHER'], {
        errorMap: () => ({ message: 'Role must be either STUDENT or TEACHER' }),
    }),
    firebaseUid: _zod.z.string().min(1, 'Firebase UID is required'),
});

/**
 * Register a new user (Sync with Firebase)
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        
        // Check if user already exists
        let user = await userRepository.findByEmail(validatedData.email);
        
        if (user) {
            // If user exists, check if UID needs updating
            if (!user.firebaseUid) {
                user = await prisma.user.update({
                    where: { email: validatedData.email.toLowerCase() },
                    data: { firebaseUid: validatedData.firebaseUid }
                });
            }
        } else {
            // Create new user
            user = await userRepository.create(validatedData);
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully and synced with backend',
            data: { user },
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
 * Delete current user account
 */
const deleteAccount = async (req, res, next) => {
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
        await authService.deleteAccount(userId);

        res.status(200).json({
            success: true,
            message: 'User account deleted successfully',
        });
    } catch (error) {
        next(error);
    }
}; exports.deleteAccount = deleteAccount;

/**
 * Change user password
 */
const changePassword = async (req, res, next) => {
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

        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({
                success: false,
                error: {
                    message: 'New password must be at least 6 characters long',
                    code: 'INVALID_PASSWORD'
                }
            });
            return;
        }

        const userId = req.user.userId;
        await authService.changePassword(userId, newPassword);

        res.status(200).json({
            success: true,
            message: 'Password updated successfully in database',
        });
    } catch (error) {
        next(error);
    }
}; exports.changePassword = changePassword;
