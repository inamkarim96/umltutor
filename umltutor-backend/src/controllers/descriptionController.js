"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
var _zod = require('zod');

var _descriptionService = require('../services/descriptionService'); var descriptionService = _interopRequireWildcard(_descriptionService);

const mainFlowStepSchema = _zod.z.object({
  stepNumber: _zod.z.number().int().min(1, 'stepNumber is required'),
  action: _zod.z.string().min(1, 'Action is required'),
});

const alternativeFlowSchema = _zod.z.object({
  relatedStep: _zod.z.number().int().min(1, 'relatedStep is required'),
  condition: _zod.z.string().min(1, 'Condition is required'),
  response: _zod.z.string().min(1, 'System Response is required'),
});

const descriptionSchema = _zod.z.object({
  useCaseNodeId: _zod.z.string().min(1, 'useCaseNodeId is required'),
  name: _zod.z.string().min(1, 'Name is required'),
  primaryActor: _zod.z.string().min(1, 'Primary Actor is required'),
  secondaryActors: _zod.z.array(_zod.z.string()).default([]),
  preconditions: _zod.z.string().optional().nullable(),
  postconditions: _zod.z.string().optional().nullable(),
  mainFlow: _zod.z.array(mainFlowStepSchema).min(1, 'At least one step is required'),
  alternativeFlows: _zod.z.array(alternativeFlowSchema).optional().nullable(),
});

const updateDescriptionSchema = descriptionSchema.partial();

const handleError = (res, error) => {
  if (error instanceof _zod.z.ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors,
    });
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error ).status ;
    return res.status(status).json({
      success: false,
      message: _nullishCoalesce((error ).message, () => ( 'Request failed')),
    });
  }

  console.error('Description API error:', error);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

/**
 * POST /api/descriptions/:assignmentId
 */
 const saveDescription = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { assignmentId } = req.params;
    if (!assignmentId) {
      return res.status(400).json({ success: false, message: 'assignmentId is required' });
    }

    const validated = descriptionSchema.parse(req.body);

    const result = await descriptionService.saveDescription(req.user.userId, assignmentId, validated);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}; exports.saveDescription = saveDescription;

/**
 * GET /api/descriptions/:assignmentId
 */
 const getDescriptions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { assignmentId } = req.params;
    if (!assignmentId) {
      return res.status(400).json({ success: false, message: 'assignmentId is required' });
    }

    const result = await descriptionService.getDescriptions(req.user.userId, assignmentId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}; exports.getDescriptions = getDescriptions;

/**
 * PUT /api/descriptions/:descriptionId
 */
 const updateDescription = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { descriptionId } = req.params;
    if (!descriptionId) {
      return res.status(400).json({ success: false, message: 'descriptionId is required' });
    }

    const validated = updateDescriptionSchema.parse(req.body);

    const result = await descriptionService.updateDescription(req.user.userId, descriptionId, validated);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}; exports.updateDescription = updateDescription;

/**
 * DELETE /api/descriptions/:descriptionId
 */
 const deleteDescription = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { descriptionId } = req.params;
    if (!descriptionId) {
      return res.status(400).json({ success: false, message: 'descriptionId is required' });
    }

    const prisma = require('../utils/prisma').default;
    
    // Check if description exists and get submission ID
    const existing = await prisma.useCaseDescription.findUnique({
      where: { id: descriptionId },
      select: { id: true, submissionId: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Description not found' });
    }

    const accessId = existing.submissionId;
    if (!accessId) {
      return res.status(400).json({ success: false, message: 'Description is not linked to a submission' });
    }

    // Verify access using the same logic as the service
    const submission = await prisma.submission.findUnique({
      where: { id: accessId },
      select: { id: true, studentId: true, assignment: { select: { createdBy: true } } },
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const allowed = submission.studentId === req.user.userId || submission.assignment?.createdBy === req.user.userId;
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'You do not have access to this submission' });
    }

    const result = await prisma.useCaseDescription.delete({
      where: { id: descriptionId },
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}; exports.deleteDescription = deleteDescription;
