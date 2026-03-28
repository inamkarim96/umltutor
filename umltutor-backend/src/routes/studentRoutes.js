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

// --- SEARCH ROUTES ---
router.get('/search', studentController.searchStudents);

// --- CLASS ROUTES (Student) ---
router.get('/classes', routeMiddleware.authorize('STUDENT'), classController.getJoinedClasses);
router.post('/classes/join', routeMiddleware.authorize('STUDENT'), classController.joinClass);

// SUBMISSION ROUTES
router.get('/assignments/:assignmentId/submissions/status', submissionController.getSubmissionStatus);
router.post('/assignments/:id/submit', submissionController.submitAssignment);
router.post('/assignments/:assignmentId/submissions', submissionController.submitAssignment);
router.get('/assignments/:assignmentId/submissions', submissionController.getMySubmission);
router.get('/me/submissions', assignmentController.getMySubmissions);
router.put('/assignments/:id/submission', submissionController.updateSubmission);
router.delete('/assignments/:id/submission', submissionController.deleteSubmission);

// --- ASSIGNMENT ROUTES (Student) ---
router.get('/assignments', assignmentController.getStudentAssignments);
router.get('/assignments/:id', assignmentController.getStudentAssignment);
router.post('/assignments/:id/start', assignmentController.startAssignment);
router.get('/assignments/:id/progress', assignmentController.getAssignmentProgress);
router.get('/assignments/:id/workflow', assignmentController.getWorkflowProgress);
router.post('/assignments/:id/save-section', assignmentController.saveAssignmentSection);
router.put('/assignments/:id/update-section', assignmentController.updateAssignmentSection);
router.get('/assignments/:id/completion-status', assignmentController.getAssignmentCompletionStatus);
router.post('/assignments/:id/progress', assignmentController.saveAssignmentProgress);
router.patch('/assignments/:id/progress', assignmentController.saveAssignmentProgress);
router.get('/assignments/:id/receipt', assignmentController.getSubmissionReceipt);
router.get('/analytics', assignmentController.getStudentAnalytics);

// --- NOTIFICATION ROUTES (Student) ---
router.get('/notifications', routeMiddleware.authorize('STUDENT'), notificationController.getNotifications);
router.patch('/notifications/:id/read', routeMiddleware.authorize('STUDENT'), notificationController.markAsRead);
router.post('/notifications/read-all', routeMiddleware.authorize('STUDENT'), notificationController.markAllAsRead);

exports.default = router;
