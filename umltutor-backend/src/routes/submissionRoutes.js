"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _submissionController = require('../controllers/submissionController');

const router = _express.Router.call(void 0, );

// Apply request logging to all routes
router.use(_routeMiddleware.requestLogger);

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

exports.default = router;
