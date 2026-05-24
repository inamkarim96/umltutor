import { createSlice, } from '@reduxjs/toolkit';
const initialState = {
  currentMode: 'development',
  checkingModeActive: false,
  usedInDescription: [],
  nameRegistry: {},
  /** Current tutorial section id: usecase | description | ssd | class-diagram | sequence-diagram */
  tutorialStep: 'usecase',
  /** Section ids the student has validated and completed */
  tutorialCompletedSteps: [],
  /** Last validation result per section for UI feedback */
  tutorialValidationByStep: {},
};

const modeSlice = createSlice({
  name: 'mode',
  initialState,
  reducers: {
    setMode: (state, action) => {
      state.currentMode = action.payload;
    },
    setCheckingModeActive: (state, action) => {
      state.checkingModeActive = action.payload;
    },
    resetRegistry: (state) => {
      // Currently a no-op, but retained for architectural consistency 
      // where we might clear mode-specific temporary caches.
    },
    markUsedInDescription: (state, action) => {
      const { nodeId } = action.payload;
      if (!state.usedInDescription.includes(nodeId)) {
        state.usedInDescription.push(nodeId);
      }
    },
    lockSystemName: (state, action) => {
      const { name } = action.payload;
      state.nameRegistry.system = {
        lockedName: name,
        type: 'system',
        step: 'DIAGRAM'
      };
    },
    setTutorialStep: (state, action) => {
      state.tutorialStep = action.payload;
    },
    setTutorialCompletedSteps: (state, action) => {
      state.tutorialCompletedSteps = action.payload || [];
    },
    markTutorialStepComplete: (state, action) => {
      const stepId = action.payload;
      if (stepId && !state.tutorialCompletedSteps.includes(stepId)) {
        state.tutorialCompletedSteps.push(stepId);
      }
    },
    setTutorialValidationResult: (state, action) => {
      const { stepId, result } = action.payload;
      if (stepId) {
        state.tutorialValidationByStep[stepId] = result;
      }
    },
    hydrateTutorialProgress: (state, action) => {
      const { currentStep, completedSteps } = action.payload || {};
      if (currentStep) state.tutorialStep = currentStep;
      if (Array.isArray(completedSteps)) state.tutorialCompletedSteps = completedSteps;
    },
    resetTutorialProgress: (state) => {
      state.tutorialStep = 'usecase';
      state.tutorialCompletedSteps = [];
      state.tutorialValidationByStep = {};
    },
  },
});

export const {
  setMode,
  setCheckingModeActive,
  resetRegistry,
  markUsedInDescription,
  lockSystemName,
  setTutorialStep,
  setTutorialCompletedSteps,
  markTutorialStepComplete,
  setTutorialValidationResult,
  hydrateTutorialProgress,
  resetTutorialProgress,
} = modeSlice.actions;

// Compatibility alias for setCheckingModeActive
export const setCheckingActive = setCheckingModeActive;

// Selectors
export const selectCurrentMode = (state) => state.mode.currentMode;
export const selectIsCheckingActive = (state) => state.mode.checkingModeActive;
export const selectIsTutorialMode = (state) => state.mode.currentMode === 'tutorial';
export const selectConstraintsEnabled = (state) => state.mode.currentMode === 'tutorial';
export const selectTutorialStep = (state) => state.mode.tutorialStep;
export const selectTutorialCompletedSteps = (state) => state.mode.tutorialCompletedSteps || [];
export const selectTutorialValidationByStep = (state) => state.mode.tutorialValidationByStep || {};

export default modeSlice.reducer;
