import { createSlice, } from '@reduxjs/toolkit';
const initialState = {
  currentMode: 'development',
  checkingModeActive: false,
  usedInDescription: [],
  nameRegistry: {},
  tutorialStep: 'USE_CASE', // USE_CASE | DESCRIPTION | SEQUENCE
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
    }
  },
});

export const { setMode, setCheckingModeActive, resetRegistry, markUsedInDescription, lockSystemName, setTutorialStep } = modeSlice.actions;

// Compatibility alias for setCheckingModeActive
export const setCheckingActive = setCheckingModeActive;

// Selectors
export const selectCurrentMode = (state) => state.mode.currentMode;
export const selectIsCheckingActive = (state) => state.mode.checkingModeActive;
export const selectIsTutorialMode = (state) => state.mode.currentMode === 'tutorial';
export const selectConstraintsEnabled = (state) => state.mode.currentMode === 'tutorial';
export const selectTutorialStep = (state) => state.mode.tutorialStep;

export default modeSlice.reducer;
