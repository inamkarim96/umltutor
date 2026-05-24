import { validateUseCaseDiagramTutorial } from '../diagram/tutorialValidator';
import { validateAllDescriptionsTutorial } from '../description/descriptionValidator';
import { validateAllSSDsTutorial } from '../ssd/ssdValidator';
import { validateClassDiagramTutorial } from '../class-diagram/tutorialValidator';
import { validateAllSequenceDiagramsTutorial } from '../sequence-diagram/tutorialValidator';

/** Canonical tutorial steps (matches workspace editors). */
export const TUTORIAL_STEPS = [
  {
    id: 'usecase',
    stepKey: 'USE_CASE',
    order: 1,
    label: 'Use Case Diagram',
    shortLabel: 'Use Case',
    description: 'Define actors, system boundary, and use cases.',
    icon: 'Share2',
  },
  {
    id: 'description',
    stepKey: 'DESCRIPTION',
    order: 2,
    label: 'Use Case Descriptions',
    shortLabel: 'Descriptions',
    description: 'Write scenarios for each use case.',
    icon: 'FileText',
  },
  {
    id: 'ssd',
    stepKey: 'SSD',
    order: 3,
    label: 'System Sequence Diagrams',
    shortLabel: 'SSD',
    description: 'Model system-level interactions per use case.',
    icon: 'Database',
  },
  {
    id: 'class-diagram',
    stepKey: 'CLASS_DIAGRAM',
    order: 4,
    label: 'Class Diagram',
    shortLabel: 'Class',
    description: 'Define structural classes and operations.',
    icon: 'Database',
  },
  {
    id: 'sequence-diagram',
    stepKey: 'SEQUENCE_DIAGRAM',
    order: 5,
    label: 'Sequence Diagrams',
    shortLabel: 'Sequence',
    description: 'Detail object interactions per use case.',
    icon: 'Share2',
  },
];

const LEGACY_STEP_MAP = {
  USE_CASE: 'usecase',
  DESCRIPTION: 'description',
  SEQUENCE: 'ssd',
  SSD: 'ssd',
  CLASS_DIAGRAM: 'class-diagram',
  SEQUENCE_DIAGRAM: 'sequence-diagram',
};

export const normalizeTutorialStepId = (step) => LEGACY_STEP_MAP[step] || step || 'usecase';

export const getStepById = (sectionId) =>
  TUTORIAL_STEPS.find((s) => s.id === normalizeTutorialStepId(sectionId)) || TUTORIAL_STEPS[0];

export const getNextStepId = (sectionId) => {
  const idx = TUTORIAL_STEPS.findIndex((s) => s.id === normalizeTutorialStepId(sectionId));
  if (idx === -1 || idx >= TUTORIAL_STEPS.length - 1) return null;
  return TUTORIAL_STEPS[idx + 1].id;
};

export const getPreviousStepId = (sectionId) => {
  const idx = TUTORIAL_STEPS.findIndex((s) => s.id === normalizeTutorialStepId(sectionId));
  if (idx <= 0) return null;
  return TUTORIAL_STEPS[idx - 1].id;
};

export const isStepUnlocked = (stepId, completedSteps) => {
  const normalized = normalizeTutorialStepId(stepId);
  const index = TUTORIAL_STEPS.findIndex((s) => s.id === normalized);
  if (index <= 0) return true;
  for (let i = 0; i < index; i++) {
    if (!completedSteps.includes(TUTORIAL_STEPS[i].id)) return false;
  }
  return true;
};

export const computeTutorialProgress = (completedSteps) => {
  const total = TUTORIAL_STEPS.length;
  const done = TUTORIAL_STEPS.filter((s) => completedSteps.includes(s.id)).length;
  return {
    completed: done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
};

/**
 * Run tutorial validation for a single workspace section.
 */
export const validateTutorialSection = (sectionId, model, systemName) => {
  const id = normalizeTutorialStepId(sectionId);
  const nodes = model?.diagram?.nodes || [];
  const edges = model?.diagram?.edges || [];
  const useCaseNodes = nodes.filter((n) => n.type === 'usecase' || n.type === 'useCase');

  switch (id) {
    case 'usecase':
      return validateUseCaseDiagramTutorial(nodes, edges, systemName);
    case 'description':
      return validateAllDescriptionsTutorial(
        useCaseNodes,
        model?.descriptions || {},
        nodes,
        edges
      );
    case 'ssd':
      return validateAllSSDsTutorial(model);
    case 'class-diagram':
      return validateClassDiagramTutorial(model?.classDiagram);
    case 'sequence-diagram':
      return validateAllSequenceDiagramsTutorial(model);
    default:
      return { isValid: false, message: 'Unknown tutorial step.' };
  }
};

export const getTutorialStorageKey = (assignmentId) =>
  `umltutor_tutorial_progress_${assignmentId || 'guest'}`;

export const loadTutorialProgressFromStorage = (assignmentId) => {
  try {
    const raw = localStorage.getItem(getTutorialStorageKey(assignmentId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveTutorialProgressToStorage = (assignmentId, payload) => {
  try {
    localStorage.setItem(getTutorialStorageKey(assignmentId), JSON.stringify({
      ...payload,
      updatedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('Could not persist tutorial progress locally', e);
  }
};
