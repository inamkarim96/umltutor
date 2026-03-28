"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _notificationController = require('../controllers/notificationController');

const router = _express.Router.call(void 0, );

// Apply request logging to all routes
router.use(_routeMiddleware.requestLogger);

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get(
  '/',
  _routeMiddleware.authenticate,
  _notificationController.getNotifications
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch(
  '/:id/read',
  _routeMiddleware.authenticate,
  _notificationController.markAsRead
);

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.post(
  '/read-all',
  _routeMiddleware.authenticate,
  _notificationController.markAllAsRead
);

exports.default = router;
