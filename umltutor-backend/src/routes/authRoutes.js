"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _authController = require('../controllers/authController');
var _auth = require('../middleware/auth');

const router = _express.Router.call(void 0, );

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', _authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get JWT token
 * @access  Public
 */
router.post('/login', _authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', _authController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/profile', _auth.authenticate, _authController.getProfile);

exports. default = router;
