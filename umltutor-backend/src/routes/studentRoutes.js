"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const express = require('express');
const routeMiddleware = require('../middleware/routeMiddleware');
const assignmentController = require('../controllers/assignmentController');
const classController = require('../controllers/classController');
const studentController = require('../controllers/studentController');
const submissionController = require('../controllers/submissionController');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Apply authentication and request logging to all student routes
router.use(routeMiddleware.requestLogger);
router.use(routeMiddleware.authenticate);

// Cache-Control for read-heavy endpoints
const cacheGet = (req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'private, max-age=60');
  next();
};

// --- SEARCH ROUTES ---
router.get('/search', cacheGet, studentController.searchStudents);

// --- CLASS ROUTES (Student) ---
router.get('/classes', cacheGet, routeMiddleware.authorize('STUDENT'), classController.getJoinedClasses);
router.post('/classes/join', routeMiddleware.authorize('STUDENT'), classController.joinClass);

// --- ASSIGNMENT ROUTES (Student) ---
router.get('/assignments', cacheGet, assignmentController.getStudentAssignments);
router.get('/assignments/:id', cacheGet, assignmentController.getStudentAssignment);

// --- NOTIFICATION ROUTES (Student) ---
router.get('/notifications', cacheGet, routeMiddleware.authorize('STUDENT'), notificationController.getNotifications);
router.patch('/notifications/:id/read', routeMiddleware.authorize('STUDENT'), notificationController.markAsRead);
router.post('/notifications/read-all', routeMiddleware.authorize('STUDENT'), notificationController.markAllAsRead);

exports.default = router;
