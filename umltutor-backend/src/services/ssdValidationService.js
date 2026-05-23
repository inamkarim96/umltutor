"use strict"; Object.defineProperty(exports, "__esModule", { value: true }); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _zod = require('zod');

// UML System Sequence Diagram Validation Rules
const validateSSDSemantics = (semanticData) => {
  const errors = [];

  // 1. Validate participants
  const participants = semanticData.lifelines || [];
  const systemParticipants = participants.filter((p) => p.type === 'system');
  const actorParticipants = participants.filter((p) => p.type === 'actor');

  if (systemParticipants.length === 0 && _optionalChain([semanticData, 'access', _ => _.lifelines, 'optionalAccess', _2 => _2.some, 'call', _3 => _3((p) => p.type === 'object')]) === false) {
    errors.push('Exactly one System participant is typically required for an SSD');
  }

  if (actorParticipants.length === 0) {
    errors.push('At least one Actor participant is required');
  }

  // 2. Validate messages
  const messages = semanticData.messages || [];

  // Check time ordering
  const sortedMessages = [...messages].sort((a, b) => (a.order || 0) - (b.order || 0));

  for (let i = 0; i < sortedMessages.length; i++) {
    const message = sortedMessages[i];
    const messageIndex = i + 1;

    // Validate participant references
    const senderExists = participants.some((p) => p.id === message.fromLifelineId);
    const receiverExists = participants.some((p) => p.id === message.toLifelineId);

    if (!senderExists) {
      errors.push(`Message ${messageIndex}: Sender participant not found`);
    }

    if (!receiverExists) {
      errors.push(`Message ${messageIndex}: Receiver participant not found`);
    }

    // Note: Return message reference validation removed — not required for student-facing SSD tool
    const sender = participants.find((p) => p.id === message.fromLifelineId);
    const receiver = participants.find((p) => p.id === message.toLifelineId);

    if (!sender || !receiver) {
      errors.push(`Message ${messageIndex}: Sender or Receiver participant not found`);
      continue;
    }

    // Self-loops (sender === receiver) are allowed — they represent valid internal system operations
    // e.g. "System calculates total price"

    const isSystemSender = sender.type === 'system' || sender.type === 'object';
    const isSystemReceiver = receiver.type === 'system' || receiver.type === 'object';

    // Validate SSD-specific flow rules (UML Standard)
    if (message.type === 'synchronous' && !message.isReturn) {
      if (sender.type !== 'actor' || !isSystemReceiver) {
        errors.push(`Message ${messageIndex}: Synchronous messages in SSD should go from Actor to System`);
      }
    } else if (message.type === 'return' || message.isReturn) {
      if (!isSystemSender || receiver.type !== 'actor') {
        errors.push(`Message ${messageIndex}: Return messages in SSD should go from System to Actor`);
      }
    }

    // Validate create/delete messages
    if (message.type === 'create' || message.type === 'delete') {
      if (receiver.type === 'actor') {
        errors.push(`Message ${messageIndex}: Actors cannot be created or deleted`);
      }
    }
  }

  // Note: Activation bar validation removed — activation bars are visual aids, not validated semantically

  return {
    isValid: errors.length === 0,
    errors
  };
}; exports.validateSSDSemantics = validateSSDSemantics;

// Database validation for relational SSD data
const validateRelationalSSD = async (
  prisma,
  diagramId,
  semanticData
) => {
  const errors = [];

  try {
    // Get existing participants and messages for this diagram in parallel
    const [existingParticipants, existingMessages] = await Promise.all([
      prisma.sSDParticipant.findMany({
        where: { diagramId }
      }),
      prisma.sSDMessage.findMany({
        where: { diagramId },
        include: {
          returnToMessage: true
        }
      })
    ]);

    // Validate participant constraints
    const systemCount = existingParticipants.filter((p) => p.type === 'system').length;
    const actorCount = existingParticipants.filter((p) => p.type === 'actor').length;

    if (systemCount !== 1) {
      errors.push('Exactly one System participant is required');
    }

    if (actorCount === 0) {
      errors.push('At least one Actor participant is required');
    }

    // Validate message constraints
    for (const message of existingMessages) {
      // Validate return message references
      if (message.isReturn && message.returnToMessageId) {
        const referencedMessage = existingMessages.find((m) => m.id === message.returnToMessageId);
        if (!referencedMessage) {
          errors.push(`Message ${message.id}: Referenced sync message not found`);
        } else if ((referencedMessage).type === 'return') {
          errors.push(`Message ${message.id}: Return message cannot reference another return message`);
        }

        // Return must have higher timeIndex than original call
        if (referencedMessage && message.order <= (referencedMessage).order) {
          errors.push(`Message ${message.id}: Return message must appear after the original call`);
        }
      }

      // Validate no system-to-system messages
      const sender = existingParticipants.find((p) => p.id === message.senderId);
      const receiver = existingParticipants.find((p) => p.id === message.receiverId);

      // Validate SSD-specific flow rules (UML Standard)
      if (sender && receiver) {
        const isSystemSender = (sender).type === 'system' || (sender).type === 'object';
        const isSystemReceiver = (receiver).type === 'system' || (receiver).type === 'object';

        if ((message).type === 'synchronous' && !message.isReturn) {
          if ((sender).type !== 'actor' || !isSystemReceiver) {
            errors.push(`Message ${message.id}: Synchronous messages in SSD should go from Actor to System`);
          }
        }

        if (message.isReturn) {
          if (!isSystemSender || (receiver).type !== 'actor') {
            errors.push(`Message ${message.id}: Return messages in SSD should go from System to Actor`);
          }
        }
      }

    }
  } catch (error) {
    errors.push(`Database validation error: ${error}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}; exports.validateRelationalSSD = validateRelationalSSD;

// Schema for SSD validation endpoint
const ssdValidationSchema = _zod.z.object({
  useCaseDescriptionId: _zod.z.string({ required_error: 'useCaseDescriptionId is required' }),
  semanticData: _zod.z.object({
    lifelines: _zod.z.array(_zod.z.object({
      id: _zod.z.string(),
      label: _zod.z.string(),
      type: _zod.z.enum(['actor', 'system', 'object']),
    })).default([]),
    messages: _zod.z.array(_zod.z.object({
      id: _zod.z.string(),
      order: _zod.z.number(),
      fromLifelineId: _zod.z.string(),
      toLifelineId: _zod.z.string(),
      name: _zod.z.string(),
      type: _zod.z.enum(['synchronous', 'asynchronous', 'return', 'self', 'create', 'delete', 'lost', 'found']),
      guard: _zod.z.string().optional(),
      parameters: _zod.z.array(_zod.z.string()).optional(),
      returnValue: _zod.z.string().optional(),
      stepNo: _zod.z.number().optional(),
      isAsync: _zod.z.boolean().optional(),
      isReturn: _zod.z.boolean().optional(),
      returnToMessageId: _zod.z.string().optional(),
    })).default([]),
    activations: _zod.z.array(_zod.z.object({
      participantId: _zod.z.string(),
      startMessageId: _zod.z.string(),
      endMessageId: _zod.z.string().optional(),
      depthLevel: _zod.z.number(),
    })).default([]).optional(),
  }).optional(),
}); exports.ssdValidationSchema = ssdValidationSchema;


