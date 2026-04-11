"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _authController = require('../controllers/authController');
var _firebaseAuth = require('../middleware/firebaseAuth');

const router = _express.Router.call(void 0, );

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (and sync with Firebase)
 * @access  Public
 */
router.post('/register', _authController.register);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', _authController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile (Firebase Auth)
 * @access  Protected
 */
router.get('/profile', _firebaseAuth.authenticateFirebase, _authController.getProfile);
router.put('/change-password', _firebaseAuth.authenticateFirebase, _authController.changePassword);
router.delete('/account', _firebaseAuth.authenticateFirebase, _authController.deleteAccount);

exports. default = router;
