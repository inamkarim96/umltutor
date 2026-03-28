"use strict"; Object.defineProperty(exports, "__esModule", { value: true });
var _validators = require('../utils/validators');
var _errors = require('../utils/errors');
var _checkingEngine = require('../services/checkingEngine');

/**
 * Check UML model for validation and scoring
 * POST /api/check
 */
const checkModel = (0, _errors.asyncHandler)(async (req, res) => {
  // Validate request body
  const validatedData = _validators.umlModelSchema.parse(req.body);

  // Perform validation using the CheckingEngine service
  const result = _checkingEngine.CheckingEngine.checkModel(validatedData);

  // Send success response
  (0, _errors.sendSuccess)(res, result);
}); exports.checkModel = checkModel;
