/**
 * Build minimal submission payloads so draft saves only send the active section.
 */

export function buildSavePayload(model, { status = 'draft', section } = {}) {
  const payload = { status };

  if (!model) return payload;

  if (!section) {
    if (model.diagram) payload.useCaseDiagram = model.diagram;
    if (model.descriptions) payload.useCaseDescription = model.descriptions;
    if (model.ssds) payload.systemSequenceDiagram = model.ssds;
    if (model.classDiagram) payload.classDiagram = model.classDiagram;
    if (model.sequenceDiagrams) payload.sequenceDiagram = model.sequenceDiagrams;
    return payload;
  }

  switch (section) {
    case 'usecase':
      if (model.diagram) payload.useCaseDiagram = model.diagram;
      break;
    case 'description':
      if (model.descriptions) payload.useCaseDescription = model.descriptions;
      break;
    case 'ssd':
      if (model.ssds) payload.systemSequenceDiagram = model.ssds;
      break;
    case 'class-diagram':
      if (model.classDiagram) payload.classDiagram = model.classDiagram;
      break;
    case 'sequence-diagram':
      if (model.sequenceDiagrams) payload.sequenceDiagram = model.sequenceDiagrams;
      break;
    default:
      if (model.diagram) payload.useCaseDiagram = model.diagram;
      if (model.descriptions) payload.useCaseDescription = model.descriptions;
      if (model.ssds) payload.systemSequenceDiagram = model.ssds;
      if (model.classDiagram) payload.classDiagram = model.classDiagram;
      if (model.sequenceDiagrams) payload.sequenceDiagram = model.sequenceDiagrams;
  }

  return payload;
}

export function toSubmissionStatus(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return {
    id: payload.id,
    status: payload.status,
    submittedAt: payload.submittedAt,
    score: payload.score ?? 0,
    remarks: payload.remarks,
    tutorialRequested: payload.tutorialRequested,
    tutorialApproved: payload.tutorialApproved,
  };
}
