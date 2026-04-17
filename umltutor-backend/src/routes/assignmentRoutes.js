"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _fileUpload = require('../utils/fileUpload');
var _assignmentController = require('../controllers/assignmentController');

const router = _express.Router.call(void 0, );

// Apply authentication and request logging to all routes
router.use(_routeMiddleware.requestLogger);
router.use(_routeMiddleware.authenticate);

/**
 * TEACHER ROUTES
 */

// Create a new assignment
router.post('/', _routeMiddleware.authorize('TEACHER'), _fileUpload.uploadAssignmentFile.single('assignmentFile'), _assignmentController.createAssignmentDefinition);

// Get all assignment definitions created by the teacher
router.get('/definitions', _routeMiddleware.authorize('TEACHER'), _assignmentController.getAssignmentDefinitions);

// Get specific assignment definition (for teacher review/edit)
router.get('/:id', _assignmentController.getAssignmentDefinition);

// Update assignment definition
router.put('/:id', _routeMiddleware.authorize('TEACHER'), _fileUpload.uploadAssignmentFile.single('assignmentFile'), _assignmentController.updateAssignmentDefinition);

// Delete assignment definition
router.delete('/:id', _routeMiddleware.authorize('TEACHER'), _assignmentController.deleteAssignmentDefinition);

exports.default = router;
