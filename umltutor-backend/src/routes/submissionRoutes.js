"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _submissionController = require('../controllers/submissionController');
var _validationMiddleware = require('../middleware/validationMiddleware');
var _validators = require('../utils/validators');
var _fileUpload = require('../utils/fileUpload');

const router = _express.Router.call(void 0, );

// Apply request logging to all routes
router.use(_routeMiddleware.requestLogger);

// ─── Teacher Overview Routes ──────────────────────────────────────────────
/**
 * @route   GET /api/submissions/teacher/all
 * @desc    Get all assignment submissions for all assignments (for overview)
 * @access  TEACHER
 */
router.get(
  '/teacher/all',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER'),
  _submissionController.getAllAssignmentSubmissions
);

/**
 * @route   GET /api/submissions/teacher/tutorial-requests
 * @desc    List tutorial mode requests for teacher dashboard
 * @access  TEACHER
 */
router.get(
  '/teacher/tutorial-requests',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER'),
  _submissionController.getTutorialRequests
);

// ─── Student Overview Routes ──────────────────────────────────────────────
/**
 * @route   GET /api/submissions/student/me
 * @desc    Get all submissions for the current student
 * @access  STUDENT
 */
router.get(
  '/student/me',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('STUDENT'),
  _submissionController.getMySubmissions
);

/**
 * @route   GET /api/submissions/student/analytics
 * @desc    Get student analytics
 * @access  STUDENT
 */
router.get(
  '/student/analytics',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('STUDENT'),
  _submissionController.getStudentAnalytics
);

/**
 * @route   GET /api/submissions/student/exports
 * @desc    Get the current student's export history
 * @access  STUDENT
 */
router.get(
  '/student/exports',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('STUDENT'),
  _submissionController.getStudentExports
);

// ─── Assignment-scoped Student Routes (/api/submissions/:assignmentId/...) ──

/**
 * @route   POST /api/submissions/:assignmentId
 * @desc    Submit an assignment
 * @access  STUDENT
 */
router.post(
  '/:assignmentId',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('STUDENT'),
  _validationMiddleware.validate({ body: _validators.submissionSchema }),
  _submissionController.submitAssignment
);

/**
 * @route   GET /api/submissions/:assignmentId/status
 * @desc    Get submission status for an assignment
 * @access  STUDENT
 */
router.get(
  '/:assignmentId/status',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('STUDENT'),
  _submissionController.getSubmissionStatus
);

/**
 * @route   GET /api/submissions/:assignmentId/me
 * @desc    Get my submission for an assignment (prefill/resubmit)
 * @access  STUDENT
 */
router.get(
  '/:assignmentId/me',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('STUDENT'),
  _submissionController.getMySubmission
);

/**
 * @route   GET /api/submissions/:assignmentId/all
 * @desc    Get all submissions for an assignment
 * @access  TEACHER
 */
router.get(
  '/:assignmentId/all',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER'),
  _submissionController.getAssignmentSubmissions
);

/**
 * @route   POST /api/submissions/:assignmentId/exports
 * @desc    Record an export (with optional uploaded file) for the student's submission
 * @access  STUDENT
 */
router.post(
  '/:assignmentId/exports',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('STUDENT'),
  _fileUpload.uploadSubmissionFile.single('file'),
  _submissionController.recordExport
);

/**
 * @route   GET /api/submissions/:assignmentId/exports
 * @desc    List exports for an assignment (teacher: all students; student: own)
 * @access  TEACHER, STUDENT
 */
router.get(
  '/:assignmentId/exports',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER', 'STUDENT'),
  _submissionController.getAssignmentExports
);

/**
 * @route   GET /api/submissions/:id/receipt
 * @desc    Get submission receipt
 * @access  STUDENT, TEACHER
 */
router.get(
  '/:id/receipt',
  _routeMiddleware.authenticate,
  _submissionController.getSubmissionReceipt
);

// ─── Submission-scoped Routes (/api/submissions/:id/...) ────────────────────

/**
 * @route   GET /api/submissions/:id
 * @desc    Get a submission detail for review
 * @access  TEACHER, STUDENT
 */
router.get(
  '/:id',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER', 'STUDENT'),
  _submissionController.getSubmissionDetail
);

/**
 * @route   POST /api/submissions/:id/run-check
 * @desc    Run checking engine against a submission's saved UML data
 * @access  TEACHER
 */
router.post(
  '/:id/run-check',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER'),
  _submissionController.runSubmissionCheck
);

/**
 * @route   PATCH /api/submissions/:id/remarks
 * @desc    Save remarks (and optional score) for a submission
 * @access  TEACHER
 */
router.patch(
  '/:id/remarks',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER'),
  _submissionController.saveSubmissionRemarks
);

/**
 * @route   POST /api/submissions/:id/save-feedback
 * @desc    Save evaluation (report + remarks + score)
 * @access  TEACHER
 */
router.post(
  '/:id/save-feedback',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER'),
  _submissionController.saveSubmissionFeedback
);

/**
 * @route   POST /api/submissions/:id/grade
 * @desc    Grade a submission (Teacher)
 * @access  TEACHER
 */
router.post(
  '/:id/grade',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER'),
  _submissionController.gradeSubmission
);

/**
 * @route   POST /api/submissions/:id/request-tutorial
 * @desc    Request tutorial mode for a submission
 * @access  STUDENT
 */
router.post(
  '/:id/request-tutorial',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('STUDENT'),
  _submissionController.requestTutorialMode
);

/**
 * @route   POST /api/submissions/:id/approve-tutorial
 * @desc    Approve tutorial mode for a submission
 * @access  TEACHER
 */
router.post(
  '/:id/approve-tutorial',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER'),
  _submissionController.approveTutorialMode
);

/**
 * @route   POST /api/submissions/:id/reject-tutorial
 * @desc    Reject tutorial mode request
 * @access  TEACHER
 */
router.post(
  '/:id/reject-tutorial',
  _routeMiddleware.authenticate,
  _routeMiddleware.authorize('TEACHER'),
  _submissionController.rejectTutorialMode
);

exports.default = router;
