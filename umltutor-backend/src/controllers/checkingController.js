"use strict"; Object.defineProperty(exports, "__esModule", { value: true });
var _validators = require('../utils/validators');
var _errors = require('../utils/errors');
var _checkingEngine = require('../services/checkingEngine');
var _suggestionEngine = require('../services/suggestionEngine');
var _requirementService = require('../services/requirementService');
var _aiFeedbackService = require('../services/aiFeedbackService'); // AIFeedbackService class with static methods
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
  result.aiFeedback = await _aiFeedbackService.generateFeedback(result, requirementModel);

  (0, _errors.sendSuccess)(res, result);
});

const checkModelAsync = (0, _errors.asyncHandler)(async (req, res) => {
  const validatedData = _validators.umlModelSchema.parse(req.body);

  const { requirementText, useAsync = false } = req.body || {};
  let requirementModel = null;
  if (requirementText && typeof requirementText === 'string' && requirementText.trim()) {
    requirementModel = await _requirementService.default.parseAsync(requirementText);
  }

  const result = await _checkingEngine.CheckingEngine.checkModelAsync(validatedData, null, null, requirementModel, useAsync);
  const suggestions = _suggestionEngine.SuggestionEngine.generateSuggestions(result);
  result.suggestions = suggestions;
  result.aiFeedback = await _aiFeedbackService.generateFeedback(result, requirementModel);

  (0, _errors.sendSuccess)(res, result);
}); exports.checkModel = checkModel; exports.checkModelAsync = checkModelAsync;
