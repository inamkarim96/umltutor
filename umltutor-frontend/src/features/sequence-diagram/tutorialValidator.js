import { checkConsistency } from '../checking/ConsistencyChecker';

const normalizeSsd = (raw) => {
  if (!raw) return null;
  if (raw.semanticData) return raw.semanticData;
  if (raw.lifelines) return raw;
  return null;
};

/**
 * Validates one sequence diagram for a use case.
 */
export const validateSequenceDiagramTutorial = (model, useCaseId) => {
  const seq = model?.sequenceDiagrams?.[useCaseId];
  const description = model?.descriptions?.[useCaseId];
  const ucLabel =
    model?.diagram?.nodes?.find((n) => n.id === useCaseId)?.data?.label || 'Use Case';

  const nodes = seq?.nodes || [];
  const edges = seq?.edges || [];

  if (!seq || nodes.length < 2) {
    return {
      isValid: false,
      message: `[${ucLabel}] Sequence diagram needs at least two lifelines.`,
    };
  }

  if (edges.length === 0) {
    return {
      isValid: false,
      message: `[${ucLabel}] Add messages to show the interaction flow.`,
    };
  }

  if (!description?.mainFlow?.length) {
    return {
      isValid: false,
      message: `[${ucLabel}] Complete the use case description (Step 2) first.`,
    };
  }

  const diagramActors =
    model.diagram?.nodes
      ?.filter((n) => n.type === 'actor')
      ?.map((n) => n.data?.label)
      .filter(Boolean) || [];

  const seqMessages = edges.map((e, idx) => ({
    text: e.data?.label || '',
    order: idx + 1,
    senderLabel: nodes.find((n) => n.id === e.source)?.data?.label || '',
    senderType: nodes.find((n) => n.id === e.source)?.data?.isActor ? 'actor' : 'object',
  }));

  const consistencyIssues = checkConsistency(
    description.mainFlow,
    seqMessages,
    diagramActors,
    description.primaryActor
  );
  const errors = consistencyIssues.filter((i) => i.type === 'error' || i.severity === 'error');
  if (errors.length > 0) {
    return {
      isValid: false,
      message: `[${ucLabel}] ${errors[0].message}`,
    };
  }

  const ssd = normalizeSsd(model?.ssds?.[useCaseId]);
  if (ssd?.messages?.length) {
    const ssdNames = ssd.messages
      .filter((m) => !m.isReturn)
      .map((m) => (m.name || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);
    const seqNames = edges
      .map((e) => (e.data?.label || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);
    const missing = ssdNames.filter(
      (sn) => !seqNames.some((qn) => qn.includes(sn) || sn.includes(qn))
    );
    if (missing.length > 0 && ssdNames.length > 0) {
      return {
        isValid: false,
        message: `[${ucLabel}] Reflect SSD messages in the sequence diagram (missing coverage).`,
      };
    }
  }

  return { isValid: true, message: `[${ucLabel}] Sequence diagram is valid.` };
};

export const validateAllSequenceDiagramsTutorial = (model) => {
  const useCaseNodes =
    model?.diagram?.nodes?.filter((n) => n.type === 'usecase' || n.type === 'useCase') || [];

  if (useCaseNodes.length === 0) {
    return { isValid: false, message: 'No use cases found. Complete Step 1 first.' };
  }

  for (const node of useCaseNodes) {
    const result = validateSequenceDiagramTutorial(model, node.id);
    if (!result.isValid) return result;
  }

  return { isValid: true, message: 'All sequence diagrams validated!' };
};
