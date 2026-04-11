"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const passwordUtils = require('../utils/password');
const jwtUtils = require('../utils/jwt');
const { AuthenticationError, ValidationError } = require('../utils/errors');

const authService = {
    async register(userData) {
        const { email, password, firstName, lastName, role } = userData;

        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new ValidationError('This email is already registered. Please use a different email or login.');
        }

        const hashedPassword = await passwordUtils.hashPassword(password);
        const user = await userRepository.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role
        });

        const token = jwtUtils.generateToken(user.id, user.role);
        return { user, token };
    },

    async login(email, password) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new AuthenticationError('You are trying to login with an invalid email. Please try to register with a valid email before logging in.');
        }

        const isPasswordValid = await passwordUtils.comparePassword(password, user.password);
        if (!isPasswordValid) {
            throw new AuthenticationError('You have entered an incorrect password. Please enter the correct password.');
        }

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

        const user = await userRepository.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.code = 'USER_NOT_FOUND';
            error.status = 404;
            throw error;
        }

        return user;
    },

    async deleteAccount(userId) {
        if (!userId) {
            const error = new Error('User ID is missing');
            error.code = 'MISSING_ID';
            error.status = 400;
            throw error;
        }

        return userRepository.deleteById(userId);
    },

    async changePassword(userId, newPassword) {
        if (!userId || !newPassword) {
            throw new ValidationError('User ID and new password are required');
        }

        const hashedPassword = await passwordUtils.hashPassword(newPassword);
        return userRepository.update(userId, { password: hashedPassword });
    }
};

exports.default = authService;
