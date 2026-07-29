"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _classController = require('../controllers/classController');
var _assignmentController = require('../controllers/assignmentController');
var _announcementController = require('../controllers/announcementController');
var _resourceController = require('../controllers/resourceController');
var _fileUpload = require('../utils/fileUpload');

const router = _express.Router.call(void 0, );

// Apply authentication and request logging to all routes
router.use(_routeMiddleware.requestLogger);
router.use(_routeMiddleware.authenticate);

// Cache-Control for read-heavy endpoints
const cacheGet = (req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'private, max-age=60');
  next();
};

/**
 * @route GET /api/classes
 * @desc Get all classes for the teacher
 * @access Teacher
 */
router.get('/', cacheGet, _routeMiddleware.authorize('TEACHER'), _classController.getClasses);

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
router.get('/my', cacheGet, _classController.getJoinedClasses);

/**
 * @route GET /api/classes/:classId
 * @desc Get specific class details
 * @access Teacher (Class Owner) or Enrolled Student
 */
router.get('/:classId', cacheGet, _classController.getClass);

/**
 * @route PUT /api/classes/:classId
 * @desc Update class settings
 * @access Teacher (Class Owner)
 */
router.put('/:classId', _routeMiddleware.authorize('TEACHER'), _classController.updateClass);

/**
 * @route POST /api/classes/:classId/regenerate-code
 * @desc Regenerate class join code
 * @access Teacher (Class Owner)
 */
router.post('/:classId/regenerate-code', _routeMiddleware.authorize('TEACHER'), _classController.regenerateClassCode);

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
router.get('/:classId/students', cacheGet, _classController.getEnrolledStudents);

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
router.post('/:classId/assignments', _routeMiddleware.authorize('TEACHER'), _fileUpload.uploadAssignmentFile.single('assignmentFile'), _assignmentController.createAssignmentDefinition);

/**
 * @route GET /api/classes/:classId/assignments
 * @desc Get assignments for a class
 * @access Teacher (Class Owner) or Enrolled Student
 */
router.get('/:classId/assignments', cacheGet, _assignmentController.getClassAssignments);

/**
 * @route GET /api/classes/:classId/analytics
 * @desc Get analytics for a class
 * @access Teacher (Class Owner)
 */
router.get('/:classId/analytics', cacheGet, _routeMiddleware.authorize('TEACHER'), _classController.getClassAnalytics);

/**
 * @route GET /api/classes/:classId/announcements
 * @desc Get class announcements
 */
router.get('/:classId/announcements', cacheGet, _announcementController.getAnnouncements);

/**
 * @route POST /api/classes/:classId/announcements
 * @desc Create an announcement
 */
router.post('/:classId/announcements', _announcementController.createAnnouncement);

/**
 * @route DELETE /api/classes/announcements/:id
 * @desc Delete an announcement
 */
router.delete('/announcements/:id', _announcementController.deleteAnnouncement);
router.patch('/announcements/:id', _announcementController.updateAnnouncement);

/**
 * @route GET /api/classes/:classId/resources
 * @desc Get class resources
 */
router.get('/:classId/resources', cacheGet, _resourceController.getResources);

/**
 * @route POST /api/classes/:classId/resources
 * @desc Upload a class resource
 */
router.post('/:classId/resources', _fileUpload.uploadAssignmentFile.single('file'), _resourceController.uploadResource);

/**
 * @route DELETE /api/classes/resources/:id
 * @desc Delete a resource
 */
router.delete('/resources/:id', _resourceController.deleteResource);

exports.default = router;
