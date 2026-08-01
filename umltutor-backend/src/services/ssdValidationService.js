"use strict"; Object.defineProperty(exports, "__esModule", { value: true }); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _zod = require('zod');

// UML System Sequence Diagram Validation Rules
const validateSSDSemantics = (semanticData) => {
  const structuredErrors = [];

  // 1. Validate participants
  const participants = semanticData.lifelines || [];
  const systemParticipants = participants.filter((p) => p.type === 'system');
  const actorParticipants = participants.filter((p) => p.type === 'actor');
  const objectParticipants = participants.filter((p) => p.type === 'object' || (p.type !== 'system' && p.type !== 'actor'));

  if (objectParticipants.length > 0) {
    objectParticipants.forEach((p) => {
      structuredErrors.push({
        code: 'SSD_OBJECT_NOT_ALLOWED',
        message: `Object lifeline "${p.label || p.name || 'Object'}" is not allowed in a System Sequence Diagram. SSDs can ONLY contain Actor and System lifelines. Internal objects belong in Step 5 (Detailed Sequence Diagram).`,
        type: 'ssd',
        severity: 'error',
        relatedId: p.id
      });
    });
  }

  if (systemParticipants.length === 0) {
    structuredErrors.push({ code: 'SSD_SYSTEM_MISSING', message: 'Exactly one System participant is required for an SSD', type: 'ssd', severity: 'error' });
  } else if (systemParticipants.length > 1) {
    systemParticipants.forEach((p) => {
      structuredErrors.push({ code: 'SSD_MULTIPLE_SYSTEMS', message: `SSD contains ${systemParticipants.length} System lifelines; exactly one System participant is required`, type: 'ssd', severity: 'error', relatedId: p.id });
    });
  }

  if (actorParticipants.length === 0) {
    structuredErrors.push({ code: 'SSD_ACTOR_MISSING', message: 'At least one Actor participant is required for an SSD', type: 'ssd', severity: 'error' });
  }

  // 2. Validate messages
  const messages = semanticData.messages || [];

  // Check duplicate message names (normalized to ignore whitespace/case)
  const seenNames = new Map();
  messages.forEach((message) => {
    const name = (message.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!name) return;
    const previous = seenNames.get(name);
    if (previous) {
      structuredErrors.push({ code: 'SSD_DUPLICATE_MESSAGE', message: `Duplicate message name "${message.name}" appears multiple times in the SSD`, type: 'ssd', severity: 'warning', relatedId: message.id });
    } else {
      seenNames.set(name, message.id);
    }
  });

  // Check time ordering
  const sortedMessages = [...messages].sort((a, b) => (a.order || 0) - (b.order || 0));

  for (let i = 0; i < sortedMessages.length; i++) {
    const message = sortedMessages[i];
    const messageIndex = i + 1;

    // Validate participant references
    const senderExists = participants.some((p) => p.id === message.fromLifelineId);
    const receiverExists = participants.some((p) => p.id === message.toLifelineId);

    if (!senderExists) {
      structuredErrors.push({ code: 'SSD_SENDER_NOT_FOUND', message: `Message ${messageIndex}: Sender participant not found`, type: 'ssd', severity: 'error', relatedId: message.id });
    }

    if (!receiverExists) {
      structuredErrors.push({ code: 'SSD_RECEIVER_NOT_FOUND', message: `Message ${messageIndex}: Receiver participant not found`, type: 'ssd', severity: 'error', relatedId: message.id });
    }

    const sender = participants.find((p) => p.id === message.fromLifelineId);
    const receiver = participants.find((p) => p.id === message.toLifelineId);

    if (!sender || !receiver) {
      if (senderExists || receiverExists) {
        structuredErrors.push({ code: 'SSD_PARTICIPANT_MISMATCH', message: `Message ${messageIndex}: Sender or Receiver participant not found`, type: 'ssd', severity: 'error', relatedId: message.id });
      }
      continue;
    }

    // Self-loops (sender === receiver or message.type === 'self') are allowed — they represent valid internal system operations
    const isSelfLoop = message.type === 'self' || sender.id === receiver.id;

    const isSystemSender = sender.type === 'system' || sender.type === 'object';
    const isSystemReceiver = receiver.type === 'system' || receiver.type === 'object';

    // Validate SSD-specific flow rules (UML Standard)
    if (!isSelfLoop) {
      if (message.type === 'synchronous' && !message.isReturn) {
        if (sender.type !== 'actor' || !isSystemReceiver) {
          structuredErrors.push({ code: 'SSD_MESSAGE_DIRECTION', message: `Message ${messageIndex}: Synchronous messages in SSD should go from Actor to System`, type: 'ssd', severity: 'error', relatedId: message.id });
        }
      } else if (message.type === 'return' || message.isReturn) {
        if (!isSystemSender || receiver.type !== 'actor') {
          structuredErrors.push({ code: 'SSD_RETURN_DIRECTION', message: `Message ${messageIndex}: Return messages in SSD should go from System to Actor`, type: 'ssd', severity: 'error', relatedId: message.id });
        }
      }
    }

    // Validate create/delete messages
    if (message.type === 'create' || message.type === 'delete') {
      if (receiver.type === 'actor') {
        structuredErrors.push({ code: 'SSD_CREATE_DELETE_ACTOR', message: `Message ${messageIndex}: Actors cannot be created or deleted`, type: 'ssd', severity: 'error', relatedId: message.id });
      }
    }
  }

  // Note: Activation bar validation removed — activation bars are visual aids, not validated semantically

  return {
    isValid: structuredErrors.length === 0,
    errors: structuredErrors.map((e) => e.message),
    structuredErrors
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


