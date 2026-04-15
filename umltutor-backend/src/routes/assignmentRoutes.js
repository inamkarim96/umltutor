"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _fileUpload = require('../utils/fileUpload');
var _assignmentController = require('../controllers/assignmentController');
var _submissionController = require('../controllers/submissionController');

const router = _express.Router.call(void 0, );

// Apply authentication and request logging to all routes
router.use(_routeMiddleware.requestLogger);
router.use(_routeMiddleware.authenticate);

/**
 * TEACHER ROUTES
 */

// Create a new assignment
router.post('/', _routeMiddleware.authorize('TEACHER'), _fileUpload.uploadAssignmentFile.single('assignmentFile'), _assignmentController.createAssignmentDefinition);

// Get all assignment submissions for all assignments (with filtering)
router.get('/submissions', _routeMiddleware.authorize('TEACHER'), _assignmentController.getAllAssignmentSubmissions);

// Get all assignment definitions created by the teacher
router.get('/definitions', _routeMiddleware.authorize('TEACHER'), _assignmentController.getAssignmentDefinitions);

// Get overall assignment statistics
router.get('/stats', _routeMiddleware.authorize('TEACHER'), _assignmentController.getAssignmentStats);

// Get specific assignment definition
router.get('/:id', _assignmentController.getAssignmentDefinition);

// Update assignment definition
router.put('/:id', _routeMiddleware.authorize('TEACHER'), _fileUpload.uploadAssignmentFile.single('assignmentFile'), _assignmentController.updateAssignmentDefinition);
router.patch('/:id', _routeMiddleware.authorize('TEACHER'), _fileUpload.uploadAssignmentFile.single('assignmentFile'), _assignmentController.updateAssignmentDefinition);

// Delete assignment definition
router.delete('/:id', _routeMiddleware.authorize('TEACHER'), _assignmentController.deleteAssignmentDefinition);

// Get submissions for a specific assignment
router.get('/:id/submissions', _routeMiddleware.authorize('TEACHER'), _assignmentController.getAssignmentSubmissions);

// Get specific student submission for a teacher
router.get('/:assignmentId/students/:studentId/submission', _routeMiddleware.authorize('TEACHER'), _assignmentController.getTeacherSubmission);

// Get data for reviewing a submission
router.get('/:id/review', _routeMiddleware.authorize('TEACHER'), _assignmentController.getAssignmentReviewData);

// Submit a review for a submission
router.post('/:id/review', _routeMiddleware.authorize('TEACHER'), _assignmentController.submitReview);

// Grade a specific submission
router.post('/submissions/:submissionId/grade', _routeMiddleware.authorize('TEACHER'), _assignmentController.gradeSubmission);




/**
 * STUDENT ROUTES
 */

// Submit an assignment
router.post('/:assignmentId/submissions', _routeMiddleware.authorize('STUDENT'), _fileUpload.uploadAssignmentFile.single('submissionFile'), _submissionController.submitAssignment);

// Get submission status for an assignment
router.get('/:assignmentId/submissions/status', _routeMiddleware.authorize('STUDENT'), _submissionController.getSubmissionStatus);

exports.default = router;
