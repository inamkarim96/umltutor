import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import assignmentService from '../../services/assignmentService';
import { isListFetchStale } from '../../utils/fetchStaleGuard';

// --- THUNKS ---

export const fetchAllAssignments = createAsyncThunk(
  'assignments/fetchAll',
  async (role, { rejectWithValue }) => {
    try {
      if (role === 'STUDENT') {
        return await assignmentService.getStudentAssignments();
      }
      return await assignmentService.getAssignmentDefinitions();
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch assignments');
    }
  },
  {
    condition: (_, { getState }) => {
      const { isLoading, assignments, lastFetchedAt } = getState().assignments;
      if (isLoading) return false;
      return isListFetchStale(lastFetchedAt, assignments.length > 0);
    },
  }
);

export const fetchAssignmentById = createAsyncThunk(
  'assignments/fetchById',
  async ({ id, role }, { rejectWithValue }) => {
    try {
      if (role === 'STUDENT') {
        return await assignmentService.getStudentAssignment(id);
      }
      return await assignmentService.getAssignment(id);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch assignment');
    }
  }
);

export const createAssignment = createAsyncThunk(
  'assignments/create',
  async ({ classId, data }, { rejectWithValue }) => {
    try {
      return await assignmentService.createAssignmentDefinition(classId, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create assignment');
    }
  }
);

export const updateAssignment = createAsyncThunk(
  'assignments/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await assignmentService.updateAssignmentDefinition(id, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update assignment');
    }
  }
);

export const deleteAssignment = createAsyncThunk(
  'assignments/delete',
  async (id, { rejectWithValue }) => {
    try {
      await assignmentService.deleteAssignmentDefinition(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete assignment');
    }
  }
);

// --- SLICE ---

const initialState = {
  assignments: [],
  assignmentDetail: null,
  isLoading: false,
  error: null,
  success: false,
  lastFetchedAt: null,
};

const assignmentSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    clearStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    setAssignments: (state, action) => {
      state.assignments = action.payload;
    },
    setAssignmentDetail: (state, action) => {
      state.assignmentDetail = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchAllAssignments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllAssignments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.assignments = action.payload;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchAllAssignments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchAssignmentById.fulfilled, (state, action) => {
        state.assignmentDetail = action.payload;
        // Also update in list if exists
        const idx = state.assignments.findIndex(a => a.id === action.payload.id);
        if (idx !== -1) state.assignments[idx] = { ...state.assignments[idx], ...action.payload };
      })
      // Create
      .addCase(createAssignment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = true;
        state.assignments.unshift(action.payload);
      })
      .addCase(createAssignment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Update
      .addCase(updateAssignment.fulfilled, (state, action) => {
        const index = state.assignments.findIndex(a => a.id === action.payload.id);
        if (index !== -1) state.assignments[index] = action.payload;
        if (state.assignmentDetail?.id === action.payload.id) state.assignmentDetail = action.payload;
      })
      // Delete
      .addCase(deleteAssignment.fulfilled, (state, action) => {
        state.assignments = state.assignments.filter(a => a.id !== action.payload);
        if (state.assignmentDetail?.id === action.payload) state.assignmentDetail = null;
      });
  }
});

export const { clearStatus, setAssignments, setAssignmentDetail } = assignmentSlice.actions;

const EMPTY_ARRAY = [];

export const selectAllAssignments = (state) => state.assignments.assignments || EMPTY_ARRAY;
export const selectAssignmentDetail = (state) => state.assignments.assignmentDetail;
export const selectAssignmentLoading = (state) => state.assignments.isLoading;
export const selectAssignmentError = (state) => state.assignments.error;
export const selectAssignmentSuccess = (state) => state.assignments.success;

export default assignmentSlice.reducer;
