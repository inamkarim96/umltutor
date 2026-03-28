"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
var _zod = require('zod');

var _ssdService = require('../services/ssdService'); var ssdService = _interopRequireWildcard(_ssdService);
var _checkingEngine = require('../services/checkingEngine');
var _errors = require('../utils/errors');
var _validators = require('../utils/validators');

// Simplified schemas using checkingEngine validation
const saveSSDSchema = _validators.z.object({
  useCaseDescriptionId: _validators.z.union([_validators.z.string(), _validators.z.number()]),
  diagramData: _validators.z.object({
    nodes: _validators.z.array(_validators.z.any()).default([]),
    edges: _validators.z.array(_validators.z.any()).default([]),
  }).optional(),
  semanticData: _validators.z.any().optional(),
}).refine((data) => data.diagramData || data.semanticData, {
  message: 'Either diagramData (legacy) or semanticData (new) must be provided'
});

const updateSSDSchema = _validators.z.object({
  diagramData: _validators.z.object({
    nodes: _validators.z.array(_validators.z.any()).default([]),
    edges: _validators.z.array(_validators.z.any()).default([]),
  }).optional(),
  semanticData: _validators.z.any().optional(),
}).refine((data) => data.diagramData || data.semanticData, {
  message: 'Either diagramData or semanticData must be provided'
});

/**
 * GET /api/sequence/:useCaseDescriptionId
 * Get semantic SSD data
 */
const getSequenceSSD = (0, _errors.asyncHandler)(async (req, res) => {
  if (!req.user) {
    throw new _errors.AuthenticationError();
  }

  const { useCaseDescriptionId } = req.params;
  if (!useCaseDescriptionId) {
    throw new _errors.ValidationError('useCaseDescriptionId is required');
  }

  const result = await ssdService.getSSD(req.user.userId, 'default', useCaseDescriptionId);

  if (!result) {
    throw new _errors.NotFoundError('SSD not found');
  }

  // Return semantic data if available, otherwise try to convert legacy data
  let responseData = result;
  if (result.semanticData) {
    responseData = result.semanticData;
  } else if (result.diagramData) {
    // Use checkingEngine for conversion
    responseData = _checkingEngine.CheckingEngine.convertLegacyToSemantic(result.diagramData);
  }

  (0, _errors.sendSuccess)(res, responseData);
}); exports.getSequenceSSD = getSequenceSSD;

/**
 * POST /api/ssds/:assignmentId
 * Legacy endpoint for backward compatibility
 */
const createOrSaveSSD = (0, _errors.asyncHandler)(async (req, res) => {
  if (!req.user) {
    throw new _errors.AuthenticationError();
  }

  const { assignmentId } = req.params; // This is actually submissionId in our new service
  if (!assignmentId) {
    throw new _errors.ValidationError('submissionId (assignmentId) is required');
  }

  const validated = saveSSDSchema.parse(req.body);
  const result = await ssdService.saveSSD(req.user.userId, Number(assignmentId), validated);

  (0, _errors.sendSuccess)(res, result);
}); exports.createOrSaveSSD = createOrSaveSSD;

const createSequenceSSD = (0, _errors.asyncHandler)(async (req, res) => {
  if (!req.user) {
    throw new _errors.AuthenticationError();
  }

  const { useCaseDescriptionId } = req.params;
  const validated = saveSSDSchema.parse(req.body);

  // Ensure we're saving semantic data
  if (!validated.semanticData) {
    throw new _errors.ValidationError('Semantic SSD data is required');
  }

  const result = await ssdService.saveSSD(req.user.userId, 'default', validated);

  (0, _errors.sendSuccess)(res, result);
}); exports.createSequenceSSD = createSequenceSSD;

/**
 * PUT /api/sequence/:ssdId
 * Update semantic SSD data
 */
const updateSequenceSSD = (0, _errors.asyncHandler)(async (req, res) => {
  if (!req.user) {
    throw new _errors.AuthenticationError();
  }

  const { ssdId } = req.params;
  const validated = updateSSDSchema.parse(req.body);

  const bodyWithSemantic = req.body;
  // Ensure we're updating semantic data
  if (!validated.semanticData && !bodyWithSemantic.semanticData) {
    throw new _errors.ValidationError('Semantic SSD data is required');
  }

  const updateData = validated.semanticData || bodyWithSemantic.semanticData;
  const result = await ssdService.updateSSD(req.user.userId, ssdId, {
    semanticData: updateData
  });

  (0, _errors.sendSuccess)(res, result);
}); exports.updateSequenceSSD = updateSequenceSSD;

/**
 * GET /api/ssds/:assignmentId/:useCaseDescriptionId
 */
const getSSD = (0, _errors.asyncHandler)(async (req, res) => {
  if (!req.user) {
    throw new _errors.AuthenticationError();
  }

  const { assignmentId, useCaseDescriptionId } = req.params;
  if (!assignmentId || !useCaseDescriptionId) {
    throw new _errors.ValidationError('submissionId (assignmentId) and useCaseDescriptionId are required');
  }

  const result = await ssdService.getSSD(req.user.userId, Number(assignmentId), useCaseDescriptionId);

  if (!result) {
    throw new _errors.NotFoundError('SSD not found');
  }

  (0, _errors.sendSuccess)(res, result);
}); exports.getSSD = getSSD;

/**
 * PUT /api/ssds/:ssdId
 */
const validateSSD = (0, _errors.asyncHandler)(async (req, res) => {
  if (!req.user) {
    throw new _errors.AuthenticationError();
  }

  // Use checkingEngine for validation
  const validation = _checkingEngine.CheckingEngine.validateSSDSemantics(req.body.semanticData || {});

  (0, _errors.sendSuccess)(res, {
    isValid: validation.isValid,
    errors: validation.errors
  });
}); exports.validateSSD = validateSSD;

const updateSSD = (0, _errors.asyncHandler)(async (req, res) => {
  if (!req.user) {
    throw new _errors.AuthenticationError();
  }

  const { ssdId } = req.params;
  if (!ssdId) {
    throw new _errors.ValidationError('ssdId is required');
  }

  const validated = updateSSDSchema.parse(req.body);
  const result = await ssdService.updateSSD(req.user.userId, ssdId, validated);

  (0, _errors.sendSuccess)(res, result);
}); exports.updateSSD = updateSSD;

const handleCompleteSSDSave = (0, _errors.asyncHandler)(async (req, res) => {
  if (!req.user) {
    throw new _errors.AuthenticationError();
  }

  const { projectId, useCaseId, actors, systems, messages, activations } = req.body;

  // Map user payload to our internal SemanticSSDData structure
  const semanticData = {
    useCaseDescriptionId: useCaseId,
    lifelines: [
      ...(actors || []).map((a) => ({
        id: a.id || `actor-${uid()}`,
        label: a.label || a.name || 'Actor',
        type: 'actor' 
      })),
      ...(systems || []).map((s) => ({
        id: s.id || `system-${uid()}`,
        label: s.label || s.name || 'System',
        type: 'system' 
      }))
    ],
    messages: (messages || []).map((m, idx) => ({
      id: m.id || uid(),
      order: m.order || idx,
      fromLifelineId: m.from,
      toLifelineId: m.to,
      name: m.label || 'message',
      type: m.type || (m.isReturn ? 'return' : 'synchronous'),
      positionY: m.positionY,
      isReturn: m.type === 'return' || m.isReturn
    })),
    activations: (activations || []).map((a) => ({
      participantId: a.participantId,
      startMessageId: a.startMessageId,
      endMessageId: a.endMessageId,
      depthLevel: a.depthLevel || 0
    }))
  };

  // projectId is used as submissionId in ssdService.saveSSD
  const result = await ssdService.saveSSD(req.user.userId, Number(projectId), { semanticData });

  (0, _errors.sendSuccess)(res, result);
}); exports.handleCompleteSSDSave = handleCompleteSSDSave;

const handleCompleteSSDGet = (0, _errors.asyncHandler)(async (req, res) => {
  if (!req.user) {
    throw new _errors.AuthenticationError();
  }

  const { projectId, useCaseId } = req.query;

  if (!projectId || !useCaseId) {
    throw new _errors.ValidationError('projectId and useCaseId query parameters are required');
  }

  const result = await ssdService.getSSD(
    req.user.userId,
    Number(projectId),
    useCaseId 
  );

  if (!result) {
    throw new _errors.NotFoundError('SSD not found');
  }

  (0, _errors.sendSuccess)(res, result);
}); exports.handleCompleteSSDGet = handleCompleteSSDGet;

const uid = () => {
  return Math.random().toString(36).substring(2, 11);
};

