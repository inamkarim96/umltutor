"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _authController = require('../controllers/authController');
var _firebaseAuth = require('../middleware/firebaseAuth');

const router = _express.Router.call(void 0, );

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName, role]
 *             properties:
 *               email: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               role: { type: string, enum: [STUDENT, TEACHER] }
 *     responses:
 *       201: { description: User registered successfully }
 */
router.post('/register', _authController.register);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', _authController.logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User profile data }
 */
router.get('/profile', _firebaseAuth.authenticateFirebase, _authController.getProfile);
router.put('/change-password', _firebaseAuth.authenticateFirebase, _authController.changePassword);
router.delete('/account', _firebaseAuth.authenticateFirebase, _authController.deleteAccount);

exports. default = router;
