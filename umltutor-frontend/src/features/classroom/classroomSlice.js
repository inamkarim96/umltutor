import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import classroomService from '../../services/classService';

// --- THUNKS ---

export const fetchClasses = createAsyncThunk(
  'classroom/fetchClasses',
  async (role, { rejectWithValue }) => {
    try {
      if (role === 'STUDENT') {
        return await classroomService.getJoinedClasses();
      }
      return await classroomService.getClasses();
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch classes');
    }
  }
);

export const fetchStudents = createAsyncThunk(
  'classroom/fetchStudents',
  async (_, { rejectWithValue }) => {
    try {
      return await classroomService.getStudents();
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch students');
    }
  }
);

export const fetchClassStudents = createAsyncThunk(
  'classroom/fetchClassStudents',
  async (classId, { rejectWithValue }) => {
    try {
      return await classroomService.getClassStudents(classId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch class students');
    }
  }
);

export const createClass = createAsyncThunk(
  'classroom/createClass',
  async (classData, { rejectWithValue }) => {
    try {
      return await classroomService.createClass(classData);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create class');
    }
  }
);

export const joinClass = createAsyncThunk(
  'classroom/joinClass',
  async (classCode, { rejectWithValue }) => {
    try {
      return await classroomService.joinClass(classCode);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to join class');
    }
  }
);

export const addStudentToClass = createAsyncThunk(
  'classroom/addStudentToClass',
  async ({ classId, studentId }, { rejectWithValue }) => {
    try {
      await classroomService.addStudentToClass(classId, studentId);
      return { classId, studentId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add student');
    }
  }
);

export const removeStudentFromClass = createAsyncThunk(
  'classroom/removeStudentFromClass',
  async ({ classId, studentId }, { rejectWithValue }) => {
    try {
      await classroomService.removeStudentFromClass(classId, studentId);
      return { classId, studentId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to remove student');
    }
  }
);

export const fetchClassAnalytics = createAsyncThunk(
  'classroom/fetchClassAnalytics',
  async (classId, { rejectWithValue }) => {
    try {
      return await classroomService.getAnalytics(classId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  }
);

// --- SLICE ---

const initialState = {
  classes: [],
  students: {},
  analytics: {}, // key: classId, value: analytics object
  isLoading: false,
  error: null,
  success: false
};

const classroomSlice = createSlice({
  name: 'classroom',
  initialState,
  reducers: {
    clearStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    setClasses: (state, action) => {
      state.classes = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Classes
      .addCase(fetchClasses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClasses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.classes = action.payload;
      })
      .addCase(fetchClasses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Students
      .addCase(fetchStudents.fulfilled, (state, action) => {
        const studentsMap = {};
        if (Array.isArray(action.payload)) {
          action.payload.forEach(std => {
            studentsMap[std.id] = std;
          });
        }
        state.students = studentsMap;
      })
      // Create Class
      .addCase(createClass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createClass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = true;
        state.classes.push(action.payload);
      })
      .addCase(createClass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Join Class
      .addCase(joinClass.fulfilled, (state, action) => {
        state.classes.push(action.payload);
      })
      // Class Students
      .addCase(fetchClassStudents.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          action.payload.forEach(std => {
            state.students[std.id] = std;
          });
        }
      })
      // Analytics
      .addCase(fetchClassAnalytics.fulfilled, (state, action) => {
        const classId = action.meta.arg;
        state.analytics[classId] = action.payload;
      });
  }
});

export const { clearStatus, setClasses } = classroomSlice.actions;

export const selectClasses = (state) => state.classroom.classes;
export const selectStudents = (state) => state.classroom.students;
export const selectClassroomLoading = (state) => state.classroom.isLoading;
export const selectClassroomError = (state) => state.classroom.error;
export const selectClassAnalytics = (state, classId) => state.classroom.analytics[classId];

export default classroomSlice.reducer;
