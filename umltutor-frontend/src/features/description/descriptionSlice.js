import { createSlice, } from '@reduxjs/toolkit';

const initialState = {
  descriptions: [],
  currentDescription: null,
  isDirty: false,
};

const descriptionSlice = createSlice({
  name: 'description',
  initialState,
  reducers: {
    setDescriptions: (state, action) => {
      state.descriptions = action.payload;
      state.isDirty = true;
    },
    setCurrentDescription: (state, action) => {
      state.currentDescription = action.payload;
    },
    clearDirty: (state) => {
      state.isDirty = false;
    },
    updateDescriptionField: (state, action) => {
      if (state.currentDescription) {
        state.currentDescription[action.payload.field] = action.payload.value;
        state.isDirty = true;
      }
    },
  },
});

export const { setDescriptions, setCurrentDescription, clearDirty, updateDescriptionField } = descriptionSlice.actions;

export const selectDescriptionByNodeId = (state, nodeId) =>
  state.description.descriptions.find(desc => desc.nodeId === nodeId);
export const selectIsDescriptionComplete = (state, nodeId) => {
  const desc = state.description.descriptions.find(desc => desc.nodeId === nodeId);
  return desc ? desc.steps.every(step => step.trim() !== '') : false;
};

export default descriptionSlice.reducer;
