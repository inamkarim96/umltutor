"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _bcrypt = require('bcrypt'); var _bcrypt2 = _interopRequireDefault(_bcrypt);

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param password - The plain text password to hash
 * @returns Hashed password string
 */
 const hashPassword = async (password) => {
    try {
        const hashedPassword = await _bcrypt2.default.hash(password, SALT_ROUNDS);
        return hashedPassword;
    } catch (error) {
        throw new Error('Password hashing failed');
    }
}; exports.hashPassword = hashPassword;

/**
 * Compare a plain text password with a hashed password
 * @param password - The plain text password to compare
 * @param hash - The hashed password to compare against
 * @returns True if passwords match, false otherwise
 */
 const comparePassword = async (password, hash) => {
    try {
        const isMatch = await _bcrypt2.default.compare(password, hash);
        return isMatch;
    } catch (error) {
        throw new Error('Password comparison failed');
    }
}; exports.comparePassword = comparePassword;
