import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import submissionService from '../../services/submissionService';
import { isListFetchStale } from '../../utils/fetchStaleGuard';

// --- THUNKS ---

export const submitAssignmentData = createAsyncThunk(
  'submission/submitData',
  async ({ assignmentId, data, lean = true }, { rejectWithValue }) => {
    try {
      if (!assignmentId || isNaN(Number(assignmentId))) {
        return rejectWithValue('Cannot submit: Invalid assignment ID.');
      }
      return await submissionService.submitAssignmentData(assignmentId, data, { lean });
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to submit assignment');
    }
  }
);

export const fetchMySubmissions = createAsyncThunk(
  'submission/fetchMySubmissions',
  async (_, { rejectWithValue }) => {
    try {
      return await submissionService.getMySubmissions();
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch submissions');
    }
  },
  {
    condition: (_, { getState }) => {
      const { isLoading, submissions, lastFetchedAt } = getState().submission;
      if (isLoading) return false;
      return isListFetchStale(lastFetchedAt, submissions.length > 0);
    },
  }
);

export const fetchAllSubmissionsForTeacher = createAsyncThunk(
  'submission/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await submissionService.getAllSubmissions();
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch all submissions');
    }
  }
);

export const fetchSubmissionStatus = createAsyncThunk(
  'submission/fetchStatus',
  async (arg, { rejectWithValue }) => {
    try {
      const assignmentId = typeof arg === 'object' ? arg.assignmentId : arg;
      const includeReport = typeof arg === 'object' ? !!arg.includeReport : false;
      return await submissionService.getSubmissionStatus(assignmentId, { includeReport });
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch status');
    }
  }
);

export const fetchAssignmentSubmissions = createAsyncThunk(
  'submission/fetchAssignmentSubmissions',
  async (assignmentId, { rejectWithValue }) => {
    try {
      return await submissionService.getAssignmentSubmissions(assignmentId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch submissions');
    }
  }
);
export const runSubmissionCheck = createAsyncThunk(
  'submission/runCheck',
  async (submissionId, { rejectWithValue }) => {
    try {
      return await submissionService.runSubmissionCheck(submissionId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to run submission check');
    }
  }
);

export const gradeSubmission = createAsyncThunk(
  'submission/gradeSubmission',
  async ({ submissionId, grade, feedback }, { rejectWithValue }) => {
    try {
      // Backend expects { score, remarks } or similar, but let's match the unified service
      return await submissionService.gradeSubmission(submissionId, { score: grade, feedback });
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to grade submission');
    }
  }
);

export const saveValidationReport = createAsyncThunk(
  'submission/saveValidationReport',
  async ({ submissionId, report }, { rejectWithValue }) => {
    try {
      const response = await submissionService.saveSubmissionFeedback(submissionId, { report });
      return response?.updated || response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to save validation report');
    }
  }
);

export const requestTutorialMode = createAsyncThunk(
  'submission/requestTutorialMode',
  async (submissionId, { rejectWithValue }) => {
    try {
      const response = await submissionService.requestTutorialMode(submissionId);
      return response?.data || response;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.error?.message || error.message || 'Failed to request tutorial mode');
    }
  }
);

export const approveTutorialMode = createAsyncThunk(
  'submission/approveTutorialMode',
  async (submissionId, { rejectWithValue }) => {
    try {
      const response = await submissionService.approveTutorialMode(submissionId);
      return response?.data || response;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.error?.message || error.message || 'Failed to approve tutorial mode');
    }
  }
);

// --- SLICE ---

const initialState = {
  submissions: [],
  currentSubmission: null,
  assignmentSubmissions: {}, // key: assignmentId, value: submissions array
  isLoading: false,
  isSubmitting: false,
  error: null,
  success: false,
  lastFetchedAt: null,
};

const submissionSlice = createSlice({
  name: 'submission',
  initialState,
  reducers: {
    resetStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    setCurrentSubmission: (state, action) => {
      state.currentSubmission = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Submit
      .addCase(submitAssignmentData.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
        state.success = false;
      })
      .addCase(submitAssignmentData.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.success = true;
        const payload = action.payload;
        if (payload) {
          state.currentSubmission = {
            ...(state.currentSubmission || {}),
            id: payload.id ?? state.currentSubmission?.id,
            status: payload.status ?? state.currentSubmission?.status,
            submittedAt: payload.submittedAt ?? state.currentSubmission?.submittedAt,
          };
        }
      })
      .addCase(submitAssignmentData.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
        state.success = false;
      })
      // My Submissions
      .addCase(fetchMySubmissions.fulfilled, (state, action) => {
        state.submissions = action.payload;
        state.lastFetchedAt = Date.now();
      })
      // Teacher All Submissions
      .addCase(fetchAllSubmissionsForTeacher.fulfilled, (state, action) => {
        state.submissions = action.payload;
      })
      // Status
      .addCase(fetchSubmissionStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSubmission = action.payload;
      })
      // Teacher: Assignment Submissions
      .addCase(fetchAssignmentSubmissions.fulfilled, (state, action) => {
        const assignmentId = action.meta.arg;
        state.assignmentSubmissions[assignmentId] = action.payload;
      })
      // Run Check
      .addCase(runSubmissionCheck.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(runSubmissionCheck.fulfilled, (state, action) => {
        state.isLoading = false;
        const updated = action.payload;
        if (!updated) return;

        if (state.currentSubmission?.id === updated.id) {
          state.currentSubmission = { ...state.currentSubmission, ...updated };
        }

        // Update in main submissions list
        const idx = state.submissions.findIndex(s => s.id === updated.id);
        if (idx !== -1) state.submissions[idx] = { ...state.submissions[idx], ...updated };

        // Update in assignmentSubmissions list
        const aid = updated.assignmentId;
        if (state.assignmentSubmissions[aid]) {
          const sIdx = state.assignmentSubmissions[aid].findIndex(s => (s.id === updated.id) || (s.submissionId === updated.id));
          if (sIdx !== -1) {
            const existing = state.assignmentSubmissions[aid][sIdx];
            state.assignmentSubmissions[aid][sIdx] = {
              ...existing,
              ...updated,
              // Keep original field names if they were different
              submissionId: updated.id,
              status: updated.status
            };
          }
        }
      })
      .addCase(runSubmissionCheck.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Grade
      .addCase(gradeSubmission.fulfilled, (state, action) => {
        const updated = action.payload;
        // Update in lists if present
        if (state.currentSubmission?.id === updated.id) {
          state.currentSubmission = { ...state.currentSubmission, ...updated };
        }
        // Update in my submissions
        const idx = state.submissions.findIndex(s => s.id === updated.id);
        if (idx !== -1) state.submissions[idx] = { ...state.submissions[idx], ...updated };
        // Update in teacher lists
        Object.keys(state.assignmentSubmissions).forEach(aid => {
          const sIdx = state.assignmentSubmissions[aid].findIndex(s => s.id === updated.id);
          if (sIdx !== -1) state.assignmentSubmissions[aid][sIdx] = { ...state.assignmentSubmissions[aid][sIdx], ...updated };
        });
      })
      // Validation Report
      .addCase(saveValidationReport.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        // Update in lists if present
        if (state.currentSubmission?.id === updated.id) {
          state.currentSubmission = { ...state.currentSubmission, ...updated };
        }
        // Update in my submissions
        const idx = state.submissions.findIndex(s => s.id === updated.id);
        if (idx !== -1) state.submissions[idx] = { ...state.submissions[idx], ...updated };
        // Update in teacher lists
        Object.keys(state.assignmentSubmissions).forEach(aid => {
          const sIdx = state.assignmentSubmissions[aid].findIndex(s => s.id === updated.id);
          if (sIdx !== -1) state.assignmentSubmissions[aid][sIdx] = { ...state.assignmentSubmissions[aid][sIdx], ...updated };
        });
      })
      // Tutorial Mode Request
      .addCase(requestTutorialMode.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        if (state.currentSubmission?.id === updated.id) {
          state.currentSubmission = { ...state.currentSubmission, ...updated };
        }
        const idx = state.submissions.findIndex(s => s.id === updated.id);
        if (idx !== -1) state.submissions[idx] = { ...state.submissions[idx], ...updated };
      })
      // Tutorial Mode Approve
      .addCase(approveTutorialMode.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        if (state.currentSubmission?.id === updated.id) {
          state.currentSubmission = { ...state.currentSubmission, ...updated };
        }
        Object.keys(state.assignmentSubmissions).forEach(aid => {
          const sIdx = state.assignmentSubmissions[aid].findIndex(s => (s.id === updated.id) || (s.submissionId === updated.id));
          if (sIdx !== -1) {
            const existing = state.assignmentSubmissions[aid][sIdx];
            state.assignmentSubmissions[aid][sIdx] = {
              ...existing,
              ...updated,
              submissionId: updated.id,
              status: updated.status
            };
          }
        });
      });
  }
});

export const { resetStatus, setCurrentSubmission } = submissionSlice.actions;

const EMPTY_ARRAY = [];

export const selectSubmissions = (state) => state.submission.submissions || EMPTY_ARRAY;
export const selectCurrentSubmission = (state) => state.submission.currentSubmission;
export const selectAssignmentSubmissions = (state, aid) => state.submission.assignmentSubmissions[aid] || EMPTY_ARRAY;
export const selectSubmissionLoading = (state) => state.submission.isLoading;
export const selectIsSubmitting = (state) => state.submission.isSubmitting;
export const selectSubmissionError = (state) => state.submission.error;
export const selectSubmissionSuccess = (state) => state.submission.success;

export default submissionSlice.reducer;
