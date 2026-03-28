"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _classController = require('../controllers/classController');
var _assignmentController = require('../controllers/assignmentController');
var _fileUpload = require('../utils/fileUpload');

const router = _express.Router.call(void 0, );

// Apply authentication and request logging to all routes
router.use(_routeMiddleware.requestLogger);
router.use(_routeMiddleware.authenticate);

/**
 * @route GET /api/classes
 * @desc Get all classes for the teacher
 * @access Teacher
 */
router.get('/', _routeMiddleware.authorize('TEACHER'), _classController.getClasses);

/**
 * @route POST /api/classes
 * @desc Create a new class
 * @access Teacher
 */
router.post('/', _routeMiddleware.authorize('TEACHER'), _classController.createClass);

/**
 * @route GET /api/classes/my
 * @desc Get classes the current user is enrolled in (student dashboard)
 * @access Authenticated (students see their classes)
 */
router.get('/my', _classController.getJoinedClasses);

/**
 * @route GET /api/classes/:classId
 * @desc Get specific class details
 * @access Teacher (Class Owner) or Enrolled Student
 */
router.get('/:classId', _classController.getClass);

/**
 * @route DELETE /api/classes/:classId/students/:studentId
 * @desc Remove a student from a class
 * @access Teacher (Class Owner)
 */
router.delete('/:classId/students/:studentId', _routeMiddleware.authorize('TEACHER'), _classController.removeStudentFromClass);

/**
 * @route GET /api/classes/:classId/students
 * @desc Get students in a class
 * @access Teacher (Class Owner) or Enrolled Student
 */
router.get('/:classId/students', _classController.getEnrolledStudents);

/**
 * @route POST /api/classes/:classId/students
 * @desc Add multiple students to a class
 * @access Teacher (Class Owner)
 */
router.post('/:classId/students', _routeMiddleware.authorize('TEACHER'), _classController.addMultipleStudentsToClass);

/**
 * @route POST /api/classes/:classId/assignments
 * @desc Create an assignment for a class
 * @access Teacher (Class Owner)
 */
router.post('/:classId/assignments', _routeMiddleware.authorize('TEACHER'), _fileUpload.uploadAssignmentFile.single('assignmentFile'), _assignmentController.createClassAssignment);

/**
 * @route GET /api/classes/:classId/assignments
 * @desc Get assignments for a class
 * @access Teacher (Class Owner) or Enrolled Student
 */
router.get('/:classId/assignments', _assignmentController.getClassAssignments);

/**
 * @route GET /api/classes/:classId/analytics
 * @desc Get analytics for a class
 * @access Teacher (Class Owner)
 */
router.get('/:classId/analytics', _routeMiddleware.authorize('TEACHER'), _classController.getClassAnalytics);

exports.default = router;
