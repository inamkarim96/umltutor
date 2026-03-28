"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _prisma = require('../utils/prisma'); var _prisma2 = _interopRequireDefault(_prisma);





 class NotFoundError extends Error {constructor(...args) { super(...args); NotFoundError.prototype.__init.call(this); }

  __init() {this.status = 404 }

} exports.NotFoundError = NotFoundError;



 class ForbiddenError extends Error {constructor(...args2) { super(...args2); ForbiddenError.prototype.__init2.call(this); }

  __init2() {this.status = 403 }

} exports.ForbiddenError = ForbiddenError;



 class BadRequestError extends Error {constructor(...args3) { super(...args3); BadRequestError.prototype.__init3.call(this); }

  __init3() {this.status = 400 }

} exports.BadRequestError = BadRequestError;



























const DESCRIPTION_INCLUDE = {

  mainFlow: { orderBy: { stepNumber: 'asc' }  },

  alternativeFlows: { orderBy: { id: 'asc' }  },

};



const mapDescriptionResponse = (desc) => {

  if (!desc) return null;

  return {

    id: desc.id,

    useCaseNodeId: desc.useCaseNodeId,

    name: desc.name,

    useCaseName: desc.name, // alias for frontend compatibility

    primaryActor: desc.primaryActor,

    secondaryActors: desc.secondaryActors,

    preconditions: desc.preconditions,

    postconditions: desc.postconditions,

    mainFlow: (desc.mainFlow || []).map((step) => ({

      stepNumber: step.stepNumber,

      action: step.action,

    })),

    alternativeFlows: (desc.alternativeFlows || []).map((flow) => ({

      relatedStep: flow.relatedStep,

      condition: flow.condition,

      response: flow.response,

    })),

  };

};



const assertAssignmentAccess = async (userId, submissionId) => {
  const submission = await _prisma2.default.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, studentId: true, assignment: { select: { createdBy: true } } },
  });

  if (!submission) throw new NotFoundError('Submission not found');

  const allowed = submission.studentId === userId || submission.assignment?.createdBy === userId;
  if (!allowed) throw new ForbiddenError('You do not have access to this submission');

  return { type: 'submission', id: submissionId, teacherId: submission.assignment?.createdBy, studentId: submission.studentId };
};



const assertUseCaseNodeExistsInDiagram = async (context, useCaseNodeId) => {



  const submission = await _prisma2.default.submission.findUnique({
    where: { id: context.id },
    include: { useCaseDiagram: true },
  });
  const diagramData = submission?.useCaseDiagram?.data;



  if (!diagramData) {

    throw new BadRequestError('Diagram data not found for this submission');

  }



  const nodes = Array.isArray(_optionalChain([(diagramData ), 'optionalAccess', _6 => _6.nodes])) ? (diagramData ).nodes : [];

  const exists = nodes.some((n) => n && typeof n === 'object' && n.id === useCaseNodeId);

  if (!exists) {

    throw new BadRequestError('useCaseNodeId does not exist in the diagram');

  }

};





 


 const saveDescription = async (

  userId,

  id, // Can be assignmentId or submissionId

  payload

) => {

  const context = await assertAssignmentAccess(userId, id);

  await assertUseCaseNodeExistsInDiagram(context, payload.useCaseNodeId);



  const queryWhere = { submissionId: context.id, useCaseNodeId: payload.useCaseNodeId };





  return _prisma2.default.$transaction(async (tx) => {

    // 1. Find or Create the parent Description

    let description = await tx.useCaseDescription.findFirst({

      where: queryWhere,

    });



    const commonData = {

      name: payload.name,

      primaryActor: payload.primaryActor,

      secondaryActors: payload.secondaryActors ,

      preconditions: _nullishCoalesce(payload.preconditions, () => ( null)),

      postconditions: _nullishCoalesce(payload.postconditions, () => ( null)),

    };



    if (!description) {

      description = await tx.useCaseDescription.create({

        data: {

          ...commonData,

          useCaseNodeId: payload.useCaseNodeId,

          submission: { connect: { id: context.id } },



        },

      });

    } else {

      description = await tx.useCaseDescription.update({

        where: { id: description.id },

        data: commonData,

      });

    }



    // 2. Smart update Main Flow Steps - compare and apply changes only

    const mainFlowSteps = payload.mainFlow;

    if (mainFlowSteps !== undefined && mainFlowSteps !== null && mainFlowSteps.length > 0) {

      // Get existing steps

      const existingSteps = await tx.mainFlowStep.findMany({

        where: { useCaseDescriptionId: description.id },

        orderBy: { stepNumber: 'asc' },

      });



      // Build maps for comparison

      const existingMap = new Map(existingSteps.map(s => [s.stepNumber, s]));

      const incomingMap = new Map(_optionalChain([mainFlowSteps, 'optionalAccess', _7 => _7.map, 'call', _8 => _8((s) => [s.stepNumber, s])]) || []);



      // Steps to delete: exist in DB but not in incoming

      const stepNumbersToDelete = existingSteps

        .filter(s => !incomingMap.has(s.stepNumber))

        .map(s => s.stepNumber);



      if (stepNumbersToDelete.length > 0) {

        await tx.mainFlowStep.deleteMany({

          where: {

            useCaseDescriptionId: description.id,

            stepNumber: { in: stepNumbersToDelete },

          },

        });

      }



      // Process incoming steps

      for (const step of mainFlowSteps || []) {

        const existing = existingMap.get(step.stepNumber);

        const action = step.description || step.action || "";



        if (!existing) {

          // Create new step

          await tx.mainFlowStep.create({

            data: {

              useCaseDescriptionId: description.id,

              stepNumber: step.stepNumber,

              action,

            },

          });

        } else if (existing.action !== action) {

          // Update existing step only if changed

          await tx.mainFlowStep.update({

            where: { id: existing.id },

            data: { action },

          });

        }

      }

    }



    // 3. Smart update Alternative Flows - compare and apply changes only

    if (payload.alternativeFlows !== undefined) {

      // Get existing flows

      const existingFlows = await tx.alternativeFlow.findMany({

        where: { useCaseDescriptionId: description.id },

        orderBy: { id: 'asc' },

      });



      // Build maps for comparison using composite key (relatedStep + condition)

      const buildFlowKey = (f) => `${_nullishCoalesce(_nullishCoalesce(f.relatedStep, () => ( f.stepNumber)), () => ( 0))}:${f.condition}`;

      const existingMap = new Map(existingFlows.map(f => [buildFlowKey(f), f]));

      const incomingFlows = payload.alternativeFlows || [];

      const incomingMap = new Map(incomingFlows.map((f) => [buildFlowKey(f), f]));



      // Flows to delete: exist in DB but not in incoming

      const flowIdsToDelete = existingFlows

        .filter(f => !incomingMap.has(buildFlowKey(f)))

        .map(f => f.id);



      if (flowIdsToDelete.length > 0) {

        await tx.alternativeFlow.deleteMany({

          where: {

            useCaseDescriptionId: description.id,

            id: { in: flowIdsToDelete },

          },

        });

      }



      // Process incoming flows

      for (const flow of incomingFlows) {

        const flowKey = buildFlowKey(flow);

        const existing = existingMap.get(flowKey);

        const relatedStep = _nullishCoalesce(_nullishCoalesce(flow.relatedStep, () => ( flow.stepNumber)), () => ( 0));

        const response = flow.systemResponse || flow.response || "";



        if (!existing) {

          // Create new flow

          await tx.alternativeFlow.create({

            data: {

              useCaseDescriptionId: description.id,

              relatedStep,

              condition: flow.condition,

              response,

            },

          });

        } else if (existing.response !== response) {

          // Update existing flow only if changed

          await tx.alternativeFlow.update({

            where: { id: existing.id },

            data: { response },

          });

        }

      }

    }



    // Return the full object

    const result = await tx.useCaseDescription.findUnique({

      where: { id: description.id },

      include: DESCRIPTION_INCLUDE,

    });



    return mapDescriptionResponse(result);

  });

}; exports.saveDescription = saveDescription;



 const getDescriptions = async (userId, id) => {

  const context = await assertAssignmentAccess(userId, id);



  const where = { submissionId: id };





  const results = await _prisma2.default.useCaseDescription.findMany({

    where,

    include: DESCRIPTION_INCLUDE,

    orderBy: { updatedAt: 'desc' },

  });



  return results.map(mapDescriptionResponse);

}; exports.getDescriptions = getDescriptions;



 const updateDescription = async (

  userId,

  descriptionId,

  descriptionData

) => {

  // reusing saveDescription logic might be overkill if we only want to update a few fields,

  // but for simplicity and following the pattern of child replacement:

  const existing = await _prisma2.default.useCaseDescription.findUnique({

    where: { id: descriptionId },

  });



  if (!existing) throw new NotFoundError('Description not found');



  const accessId = existing.submissionId;

  if (!accessId) throw new BadRequestError('Description not linked');

  await assertAssignmentAccess(userId, accessId.toString());





  return _prisma2.default.$transaction(async (tx) => {

    const updated = await tx.useCaseDescription.update({

      where: { id: descriptionId },

      data: {

        name: descriptionData.name,

        primaryActor: descriptionData.primaryActor,

        secondaryActors: descriptionData.secondaryActors ,

        preconditions: descriptionData.preconditions,

        postconditions: descriptionData.postconditions,

      },

      include: DESCRIPTION_INCLUDE,

    });



    const mainFlowSteps = _nullishCoalesce(descriptionData.mainFlowSteps, () => ( descriptionData.mainFlow));

    if (mainFlowSteps !== undefined) {

      // Get existing steps

      const existingSteps = await tx.mainFlowStep.findMany({

        where: { useCaseDescriptionId: descriptionId },

        orderBy: { stepNumber: 'asc' },

      });



      // Build maps for comparison

      const existingMap = new Map(existingSteps.map(s => [s.stepNumber, s]));

      const incomingMap = new Map(_optionalChain([mainFlowSteps, 'optionalAccess', _9 => _9.map, 'call', _10 => _10((s) => [s.stepNumber, s])]) || []);



      // Steps to delete: exist in DB but not in incoming

      const stepNumbersToDelete = existingSteps

        .filter(s => !incomingMap.has(s.stepNumber))

        .map(s => s.stepNumber);



      if (stepNumbersToDelete.length > 0) {

        await tx.mainFlowStep.deleteMany({

          where: {

            useCaseDescriptionId: descriptionId,

            stepNumber: { in: stepNumbersToDelete },

          },

        });

      }



      // Process incoming steps

      for (const step of mainFlowSteps || []) {

        const existing = existingMap.get(step.stepNumber);

        const action = step.description || step.action || "";



        if (!existing) {

          // Create new step

          await tx.mainFlowStep.create({

            data: {

              useCaseDescriptionId: descriptionId,

              stepNumber: step.stepNumber,

              action,

            },

          });

        } else if (existing.action !== action) {

          // Update existing step only if changed

          await tx.mainFlowStep.update({

            where: { id: existing.id },

            data: { action },

          });

        }

      }

    }



    if (descriptionData.alternativeFlows !== undefined) {

      // Get existing flows

      const existingFlows = await tx.alternativeFlow.findMany({

        where: { useCaseDescriptionId: descriptionId },

        orderBy: { id: 'asc' },

      });



      // Build maps for comparison using composite key (relatedStep + condition)

      const buildFlowKey = (f) => `${_nullishCoalesce(_nullishCoalesce(f.relatedStep, () => ( f.stepNumber)), () => ( 0))}:${f.condition}`;

      const existingMap = new Map(existingFlows.map(f => [buildFlowKey(f), f]));

      const incomingFlows = descriptionData.alternativeFlows || [];

      const incomingMap = new Map(incomingFlows.map((f) => [buildFlowKey(f), f]));



      // Flows to delete: exist in DB but not in incoming

      const flowIdsToDelete = existingFlows

        .filter(f => !incomingMap.has(buildFlowKey(f)))

        .map(f => f.id);



      if (flowIdsToDelete.length > 0) {

        await tx.alternativeFlow.deleteMany({

          where: {

            useCaseDescriptionId: descriptionId,

            id: { in: flowIdsToDelete },

          },

        });

      }



      // Process incoming flows

      for (const flow of incomingFlows) {

        const flowKey = buildFlowKey(flow);

        const existing = existingMap.get(flowKey);

        const relatedStep = _nullishCoalesce(_nullishCoalesce(flow.relatedStep, () => ( flow.stepNumber)), () => ( 0));

        const response = flow.systemResponse || flow.response || "";



        if (!existing) {

          // Create new flow

          await tx.alternativeFlow.create({

            data: {

              useCaseDescriptionId: descriptionId,

              relatedStep,

              condition: flow.condition,

              response,

            },

          });

        } else if (existing.response !== response) {

          // Update existing flow only if changed

          await tx.alternativeFlow.update({

            where: { id: existing.id },

            data: { response },

          });

        }

      }

    }



    const result = await tx.useCaseDescription.findUnique({

      where: { id: descriptionId },

      include: DESCRIPTION_INCLUDE,

    });



    return mapDescriptionResponse(result);

  });

}; exports.updateDescription = updateDescription;
