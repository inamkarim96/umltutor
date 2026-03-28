import { createSlice, } from '@reduxjs/toolkit';












const initialState = {
  tutorialModel: null,
  developmentModel: null,
  activeUseCaseId: null,
};

const umlSlice = createSlice({
  name: 'uml',
  initialState,
  reducers: {
    setModel: (state, action) => {
      const { mode, model } = action.payload;
      // Normalize persisted models that may store nested fields as JSON strings
      const normalizedModel = model ? { ...model } : model;
      if (normalizedModel) {
        if (typeof normalizedModel.descriptions === 'string') {
          try { normalizedModel.descriptions = JSON.parse(normalizedModel.descriptions); } catch { normalizedModel.descriptions = {}; }
        }
        if (typeof normalizedModel.ssds === 'string') {
          try { normalizedModel.ssds = JSON.parse(normalizedModel.ssds); } catch { normalizedModel.ssds = {}; }
        }
        if (typeof normalizedModel.diagram === 'string') {
          try { normalizedModel.diagram = JSON.parse(normalizedModel.diagram); } catch { normalizedModel.diagram = { nodes: [], edges: [] }; }
        }
      }
      if (mode === 'tutorial') {
        state.tutorialModel = normalizedModel;
      } else {
        state.developmentModel = normalizedModel;
      }
    },
    clearModeState: (state, action) => {
      if (action.payload === 'tutorial') {
        state.tutorialModel = null;
      } else {
        state.developmentModel = null;
      }
      state.activeUseCaseId = null;
    },
    updateDiagram: (state, action) => {
      const { mode, diagram } = action.payload;
      const model = mode === 'tutorial' ? state.tutorialModel : state.developmentModel;
      if (model) {
        model.diagram = diagram;
        model.updatedAt = new Date().toISOString();
      }
    },
    updateDescription: (state, action) => {
      const { mode, id, description } = action.payload;
      const model = mode === 'tutorial' ? state.tutorialModel : state.developmentModel;
      if (model) {
        if (typeof model.descriptions === 'string') {
          try { model.descriptions = JSON.parse(model.descriptions); } catch { model.descriptions = {}; }
        }
        if (!model.descriptions || typeof model.descriptions !== 'object') model.descriptions = {};
        model.descriptions[id] = description;
        model.updatedAt = new Date().toISOString();
      }
    },
    updateSSD: (state, action) => {
      const { mode, id, ssd } = action.payload;
      const model = mode === 'tutorial' ? state.tutorialModel : state.developmentModel;
      if (model) {
        if (typeof model.ssds === 'string') {
          try { model.ssds = JSON.parse(model.ssds); } catch { model.ssds = {}; }
        }
        if (!model.ssds || typeof model.ssds !== 'object') model.ssds = {};
        model.ssds[id] = ssd;
        model.updatedAt = new Date().toISOString();
      }
    },
    setActiveUseCase: (state, action) => {
      state.activeUseCaseId = action.payload;
    },
    renameNode: (state, action) => {
      const { mode, nodeId, newName, nodeType } = action.payload;
      const model = mode === 'tutorial' ? state.tutorialModel : state.developmentModel;
      if (!model) return;

      // 1. Update Diagram Node Label
      model.diagram.nodes = model.diagram.nodes.map(node =>
        node.id === nodeId ? { ...node, data: { ...node.data, label: newName } } : node
      );

      // 2. Cascade to descriptions if it's a Use Case
      if (nodeType === 'usecase' && model.descriptions && model.descriptions[nodeId]) {
        model.descriptions[nodeId].useCaseName = newName;
      }

      // 3. Cascade to SSDs if it's an Actor or Use Case
      if (nodeType === 'usecase' && model.ssds && model.ssds[nodeId]) {
        model.ssds[nodeId].useCaseName = newName;
      }

      model.updatedAt = new Date().toISOString();
    },
    removeNode: (state, action) => {
      const { mode, nodeId, nodeType } = action.payload;
      const model = mode === 'tutorial' ? state.tutorialModel : state.developmentModel;
      if (!model) return;

      // 1. Remove from Diagram
      model.diagram.nodes = model.diagram.nodes.filter(node => node.id !== nodeId);
      model.diagram.edges = model.diagram.edges.filter(edge =>
        edge.source !== nodeId && edge.target !== nodeId
      );

      // 2. Cleanup associated data
      if (nodeType === 'usecase') {
        if (model.descriptions) delete model.descriptions[nodeId];
        if (model.ssds) delete model.ssds[nodeId];
      }

      model.updatedAt = new Date().toISOString();
    },
    updateDescriptionField: (state, action) => {
      const { mode, useCaseId, field, value } = action.payload;
      const model = mode === 'tutorial' ? state.tutorialModel : state.developmentModel;
      if (model && model.descriptions && model.descriptions[useCaseId]) {
        (model.descriptions[useCaseId] )[field] = value;
        model.updatedAt = new Date().toISOString();
      }
    },
    updateSSDLifelineName: (state, action) => {
      const { mode, useCaseId, lifelineId, newName } = action.payload;
      const model = mode === 'tutorial' ? state.tutorialModel : state.developmentModel;
      if (model && model.ssds && model.ssds[useCaseId]) {
        const ssd = model.ssds[useCaseId];
        ssd.nodes = ssd.nodes.map(n =>
          n.id === lifelineId ? { ...n, data: { ...n.data, label: newName } } : n
        );
        model.updatedAt = new Date().toISOString();
      }
    },
    initializeModel: (state, action) => {
      const { mode, assignmentId, assignmentTitle } = action.payload;
      const existingModel = mode === 'tutorial' ? state.tutorialModel : state.developmentModel;
      
      if (!existingModel) {
        const newModel = {
          id: assignmentId,
          title: assignmentTitle,
          diagram: { nodes: [], edges: [] },
          descriptions: {},
          ssds: {},
          updatedAt: new Date().toISOString(),
          version: 1
        };
        
        if (mode === 'tutorial') {
          state.tutorialModel = newModel;
        } else {
          state.developmentModel = newModel;
        }
      }
    }
  },
});

export const {
  setModel,
  clearModeState,
  updateDiagram,
  updateDescription,
  updateSSD,
  setActiveUseCase,
  renameNode,
  removeNode,
  updateDescriptionField,
  updateSSDLifelineName,
  initializeModel
} = umlSlice.actions;

// Selectors
export const selectTutorialModel = (state) => state.uml.tutorialModel;
export const selectDevelopmentModel = (state) => state.uml.developmentModel;
export const selectActiveUseCaseId = (state) => state.uml.activeUseCaseId;
export const selectUMLState = (state) => state.uml;

export default umlSlice.reducer;
