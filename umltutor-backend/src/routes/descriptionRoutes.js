"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _routeMiddleware = require('../middleware/routeMiddleware');
var _descriptionController = require('../controllers/descriptionController');

const router = _express.Router.call(void 0, );

// Apply request logging to all routes
router.use(_routeMiddleware.requestLogger);

router.post('/:assignmentId', _routeMiddleware.authenticate, _descriptionController.saveDescription);
router.get('/:assignmentId', _routeMiddleware.authenticate, _descriptionController.getDescriptions);
router.put('/:descriptionId', _routeMiddleware.authenticate, _descriptionController.updateDescription);
router.delete('/:descriptionId', _routeMiddleware.authenticate, _descriptionController.deleteDescription);

exports.default = router;
