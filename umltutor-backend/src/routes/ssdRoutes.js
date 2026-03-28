"use strict"; Object.defineProperty(exports, "__esModule", { value: true }); var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _ssdController = require('../controllers/ssdController');

const router = _express.Router.call(void 0,);

// Apply request logging to all routes
router.use(_routeMiddleware.requestLogger);

// Legacy SSD endpoints (for backward compatibility)
/**
 * @route   POST /api/ssds/:assignmentId
 * @desc    Create or update an SSD for an assignment + use case description
 * @access  Private
 */
router.post('/ssds/:assignmentId', _routeMiddleware.authenticate, _ssdController.createOrSaveSSD);

// (getSSDs removed as it is not implemented; use getSSD instead)

/**
 * @route   GET /api/ssds/:assignmentId/:useCaseDescriptionId
 * @desc    Get an SSD by assignment + use case description id
 * @access  Private
 */
router.get('/ssds/:assignmentId/:useCaseDescriptionId', _routeMiddleware.authenticate, _ssdController.getSSD);

/**
 * @route   PUT /api/ssds/:ssdId
 * @desc    Update an SSD by id
 * @access  Private
 */
router.put('/ssds/:ssdId', _routeMiddleware.authenticate, _ssdController.updateSSD);

// Semantic SSD Routes
/**
 * @route   GET /api/ssds/sequence/:useCaseDescriptionId
 * @desc    Get semantic sequence diagram
 * @access  Private
 */
router.get('/ssds/sequence/:useCaseDescriptionId', _routeMiddleware.authenticate, _ssdController.getSequenceSSD);

/**
 * @route   POST /api/ssds/sequence/:useCaseDescriptionId
 * @desc    Create/Update semantic sequence diagram
 * @access  Private
 */
router.post('/ssds/sequence/:useCaseDescriptionId', _routeMiddleware.authenticate, _ssdController.createSequenceSSD);

/**
 * @route   PUT /api/ssds/sequence/:ssdId
 * @desc    Update semantic sequence diagram
 * @access  Private
 */
router.put('/ssds/sequence/:ssdId', _routeMiddleware.authenticate, _ssdController.updateSequenceSSD);

/**
 * @route   POST /api/ssds/validate
 * @desc    Validate SSD diagram data
 * @access  Private
 */
router.post('/ssds/validate', _routeMiddleware.authenticate, _ssdController.validateSSD);

// Complete Fix & Enhancement endpoints (kept at root as per instruction)
/**
 * @route   POST /api/system-sequence-diagram
 * @desc    Save SSD with flat structure
 */
router.post('/system-sequence-diagram', _routeMiddleware.authenticate, _ssdController.handleCompleteSSDSave);

/**
 * @route   GET /api/system-sequence-diagram
 * @desc    Get SSD with flat structure (using query params for projectId/useCaseId)
 */
router.get('/system-sequence-diagram', _routeMiddleware.authenticate, _ssdController.handleCompleteSSDGet);

exports.default = router;

