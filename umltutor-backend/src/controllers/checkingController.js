"use strict"; Object.defineProperty(exports, "__esModule", { value: true });
var _validators = require('../utils/validators');
var _errors = require('../utils/errors');
var _checkingEngine = require('../services/checkingEngine');
var _suggestionEngine = require('../services/suggestionEngine');
const checkModel = (0, _errors.asyncHandler)(async (req, res) => {
  const validatedData = _validators.umlModelSchema.parse(req.body);

  const { requirementText } = req.body || {};
  let requirementModel = null;
  if (requirementText && typeof requirementText === 'string' && requirementText.trim()) {
    requirementModel = _requirementService.default.parse(requirementText);
  }

  const result = _checkingEngine.CheckingEngine.checkModel(validatedData, null, null, requirementModel);
  const suggestions = _suggestionEngine.SuggestionEngine.generateSuggestions(result);
  result.suggestions = suggestions;

  (0, _errors.sendSuccess)(res, result);
}); exports.checkModel = checkModel;
