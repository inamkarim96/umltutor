"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _prisma = require('../utils/prisma'); var _prisma2 = _interopRequireDefault(_prisma);

var _descriptionService = require('./descriptionService');
var _zod = require('zod');
var _checkingEngine = require('./checkingEngine');

// Simplified schemas using checkingEngine validation
const ssdPayloadSchema = _zod.z.object({
  useCaseDescriptionId: _zod.z.union([_zod.z.string(), _zod.z.number()]),
  diagramData: _zod.z.object({
    nodes: _zod.z.array(_zod.z.any()).default([]),
    edges: _zod.z.array(_zod.z.any()).default([]),
  }).optional(),
  semanticData: _zod.z.any().optional(),
  // Support flat structure from frontend
  nodes: _zod.z.array(_zod.z.any()).optional(),
  edges: _zod.z.array(_zod.z.any()).optional(),
  fragments: _zod.z.array(_zod.z.any()).optional(),
  activationBars: _zod.z.array(_zod.z.any()).optional(),
}).refine((data) => data.diagramData || data.semanticData || (data.nodes && data.edges), {
  message: 'diagramData, semanticData, or root-level nodes/edges must be provided'
});

const assertAssignmentAccess = async (userId, submissionId) => {
  const submission = await _prisma2.default.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, studentId: true, assignment: { select: { createdBy: true } } },
  });

  if (!submission) throw new (0, _descriptionService.NotFoundError)('Submission not found');

  const allowed = submission.studentId === userId || submission.assignment?.createdBy === userId;
  if (!allowed) throw new (0, _descriptionService.ForbiddenError)('You do not have access to this submission');

  return { type: 'submission', id: submissionId };
};

const assertUseCaseDescriptionExists = async (context, useCaseDescriptionId) => {
  const desc = await _prisma2.default.useCaseDescription.findUnique({
    where: { id: useCaseDescriptionId },
  });

  if (!desc) throw new (0, _descriptionService.BadRequestError)('useCaseDescriptionId does not exist');

  const isLinked = desc.submissionId === context.id;

  if (!isLinked) throw new (0, _descriptionService.BadRequestError)('useCaseDescriptionId does not belong to this submission');

  return desc;
};

const validateSSDStructure = (payload) => {
  return ssdPayloadSchema.parse(payload);
}; exports.validateSSDStructure = validateSSDStructure;

// Helper to save relational data
const saveRelationalData = async (diagramId, semanticData) => {
  // 1. Clear existing relational data
  await _prisma2.default.sSDFragment.deleteMany({ where: { diagramId } });
  await _prisma2.default.sSDActivation.deleteMany({ where: { diagramId } });
  await _prisma2.default.sSDMessage.deleteMany({ where: { diagramId } });
  await _prisma2.default.sSDParticipant.deleteMany({ where: { diagramId } });

  if (!semanticData || !semanticData.lifelines) return;

  // 2. Create Participants and map IDs
  const lifelineMap = new Map();
  for (const [index, lifeline] of semanticData.lifelines.entries()) {
    const p = await _prisma2.default.sSDParticipant.create({
      data: {
        diagramId,
        name: lifeline.label,
        type: lifeline.type,
        order: index,
      }
    });
    lifelineMap.set(lifeline.id, p.id);
  }

  // 3. Create Messages and map IDs
  const messageMap = new Map();
  // Sort by order to ensure logical insertion
  const sortedMessages = [...semanticData.messages].sort((a, b) => a.order - b.order);

  for (const msg of sortedMessages) {
    const senderId = lifelineMap.get(msg.fromLifelineId);
    const receiverId = lifelineMap.get(msg.toLifelineId);
    let returnToMessageId;

    // Handle returnToMessageId mapping
    if (msg.returnToMessageId) {
      returnToMessageId = messageMap.get(msg.returnToMessageId);
    }

    if (senderId && receiverId) {
      const m = await _prisma2.default.sSDMessage.create({
        data: {
          diagramId,
          senderId,
          receiverId,
          name: msg.name,
          type: msg.type,
          order: msg.order,
          isAsync: msg.isAsync || msg.type === 'asynchronous',
          isReturn: msg.isReturn || msg.type === 'return',
          returnValue: msg.returnValue,
          returnToMessageId,
        }
      });
      messageMap.set(msg.id, m.id);
    }
  }

  // 4. Create Activations (if provided)
  const activations = semanticData.activations || [];
  for (const act of activations) {
    const participantId = lifelineMap.get(act.participantId);
    const startMessageId = messageMap.get(act.startMessageId);
    const endMessageId = act.endMessageId ? messageMap.get(act.endMessageId) : undefined;

    if (participantId && startMessageId) {
      await _prisma2.default.sSDActivation.create({
        data: {
          diagramId,
          participantId,
          startMessageId,
          endMessageId,
          depthLevel: act.depthLevel,
        }
      });
    }
  }

  // 5. Create Fragments (if provided)
  const fragments = semanticData.fragments || [];
  for (const frag of fragments) {
    await _prisma2.default.sSDFragment.create({
      data: {
        diagramId,
        type: frag.type,
        condition: frag.condition,
        startMessageId: frag.startMessageId,
        endMessageId: frag.endMessageId,
      }
    });
  }
};

const saveSSD = async (
  userId,
  assignmentId,
  ssdData
) => {
  const context = await assertAssignmentAccess(userId, assignmentId);
  const validated = exports.validateSSDStructure.call(void 0, ssdData);
  const useCaseDescriptionId = validated.useCaseDescriptionId.toString();
  await assertUseCaseDescriptionExists(context, useCaseDescriptionId);

  // Use checkingEngine to process SSD data
  const processedData = _checkingEngine.CheckingEngine.processSSDData(validated);

  const whereClause = {
    submissionId: context.id,
    useCaseDescriptionId: useCaseDescriptionId
  };

  let existing = await _prisma2.default.systemSequenceDiagram.findFirst({ where: whereClause });

  const data = {
    useCaseDescription: { connect: { id: useCaseDescriptionId } },
    submission: { connect: { id: context.id } },
    semanticData: processedData.semanticData,
    diagramData: processedData.diagramData,
  };

  let savedDiagram;
  if (existing) {
    savedDiagram = await _prisma2.default.systemSequenceDiagram.update({
      where: { id: existing.id },
      data: { ...data, updatedAt: new Date() },
    });
  } else {
    savedDiagram = await _prisma2.default.systemSequenceDiagram.create({ data });
  }

  // Persist Relational Data
  if (processedData.semanticData) {
    try {
      await saveRelationalData(savedDiagram.id, processedData.semanticData);
    } catch (relError) {
      console.error('Failed to save relational SSD data:', relError);
      // We still return the savedDiagram as the main blob is saved
    }
  }

  return savedDiagram;
}; exports.saveSSD = saveSSD;

const getSSD = async (
  userId,
  id,
  useCaseDescriptionId
) => {
  const context = await assertAssignmentAccess(userId, id);
  await assertUseCaseDescriptionExists(context, useCaseDescriptionId);

  const where = { submissionId: context.id, useCaseDescriptionId: useCaseDescriptionId };

  const ssd = await _prisma2.default.systemSequenceDiagram.findFirst({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      participants: true,
      ssdMessages: true,
      activations: true,
      fragments: true,
    }
  });

  return ssd;
}; exports.getSSD = getSSD;

const updateSSD = async (
  userId,
  ssdId,
  ssdData
) => {
  const existing = await _prisma2.default.systemSequenceDiagram.findUnique({
    where: { id: ssdId },
  });

  if (!existing) throw new (0, _descriptionService.NotFoundError)('SSD not found');

  const accessId = existing?.submissionId;
  if (!accessId) throw new (0, _descriptionService.ForbiddenError)('Orphaned SSD');

  const context = await assertAssignmentAccess(userId, accessId);

  const validated = exports.validateSSDStructure.call(void 0, {
    ...(ssdData ),
    useCaseDescriptionId: existing.useCaseDescriptionId.toString(),
  });

  // Use checkingEngine to process SSD data
  const processedData = _checkingEngine.CheckingEngine.processSSDData(validated);

  const updatedDiagram = await _prisma2.default.systemSequenceDiagram.update({
    where: { id: ssdId },
    data: {
      diagramData: processedData.diagramData,
      semanticData: processedData.semanticData,
      updatedAt: new Date(),
    },
  });

  if (processedData.semanticData) {
    await saveRelationalData(updatedDiagram.id, processedData.semanticData);
  }

  return updatedDiagram;
}; exports.updateSSD = updateSSD;
