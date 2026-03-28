"use strict"; Object.defineProperty(exports, "__esModule", { value: true }); var _express = require('express');
var _checkingController = require('../controllers/checkingController');
var _routeMiddleware = require('../middleware/routeMiddleware');

const router = _express.Router.call(void 0,);

// Apply request logging to all routes
router.use(_routeMiddleware.requestLogger);

/**
 * @route   POST /api/check
 * @desc    Check UML model for validation and scoring
 * @access  Protected
 */
router.post('/check', _routeMiddleware.authenticate, _checkingController.checkModel);

exports.default = router;
