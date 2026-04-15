import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import classroomService from '../../services/classService';

// --- THUNKS ---

const EMPTY_ARRAY = [];

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

export const updateClass = createAsyncThunk(
  'classroom/updateClass',
  async ({ classId, data }, { rejectWithValue }) => {
    try {
      return await classroomService.updateClass(classId, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update class');
    }
  }
);

export const regenerateCode = createAsyncThunk(
  'classroom/regenerateCode',
  async (classId, { rejectWithValue }) => {
    try {
      return await classroomService.regenerateCode(classId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to regenerate code');
    }
  }
);

export const fetchAnnouncements = createAsyncThunk(
  'classroom/fetchAnnouncements',
  async (classId, { rejectWithValue }) => {
    try {
      return await classroomService.getAnnouncements(classId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch announcements');
    }
  }
);

export const createAnnouncement = createAsyncThunk(
  'classroom/createAnnouncement',
  async ({ classId, data }, { rejectWithValue }) => {
    try {
      return await classroomService.createAnnouncement(classId, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to post announcement');
    }
  }
);

export const deleteAnnouncement = createAsyncThunk(
  'classroom/deleteAnnouncement',
  async (id, { rejectWithValue }) => {
    try {
      await classroomService.deleteAnnouncement(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete announcement');
    }
  }
);

export const updateAnnouncement = createAsyncThunk(
  'classroom/updateAnnouncement',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await classroomService.updateAnnouncement(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update announcement');
    }
  }
);

export const fetchResources = createAsyncThunk(
  'classroom/fetchResources',
  async (classId, { rejectWithValue }) => {
    try {
      return await classroomService.getResources(classId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch resources');
    }
  }
);

export const uploadResource = createAsyncThunk(
  'classroom/uploadResource',
  async ({ classId, data }, { rejectWithValue }) => {
    try {
      return await classroomService.uploadResource(classId, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to upload resource');
    }
  }
);

export const deleteResource = createAsyncThunk(
  'classroom/deleteResource',
  async (id, { rejectWithValue }) => {
    try {
      await classroomService.deleteResource(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete resource');
    }
  }
);

// --- SLICE ---

const initialState = {
  classes: [],
  students: {},
  analytics: {}, // key: classId, value: analytics object
  announcements: {}, // key: classId, value: array of announcements
  resources: {}, // key: classId, value: array of resources
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
      })
      // Update Class
      .addCase(updateClass.fulfilled, (state, action) => {
        const index = state.classes.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.classes[index] = { ...state.classes[index], ...action.payload };
        }
      })
      // Announcements
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.announcements[action.meta.arg] = action.payload;
      })
      .addCase(createAnnouncement.fulfilled, (state, action) => {
        const classId = action.meta.arg.classId;
        if (!state.announcements[classId]) state.announcements[classId] = [];
        
        const parentId = action.meta.arg.data.parentId;
        if (parentId) {
            // It's a reply
            const parent = state.announcements[classId].find(a => a.id === Number(parentId));
            if (parent) {
                if (!parent.replies) parent.replies = [];
                parent.replies.push(action.payload);
            }
        } else {
            // It's a new post
            state.announcements[classId].unshift(action.payload);
        }
      })
      // Resources
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.resources[action.meta.arg] = action.payload;
      })
      .addCase(uploadResource.fulfilled, (state, action) => {
        const classId = action.meta.arg.classId;
        if (!state.resources[classId]) state.resources[classId] = [];
        state.resources[classId].unshift(action.payload);
      })
      // Deletions
      .addCase(deleteAnnouncement.fulfilled, (state, action) => {
        const id = Number(action.payload);
        Object.keys(state.announcements).forEach(classId => {
          // Remove main announcement
          state.announcements[classId] = state.announcements[classId].filter(a => a.id !== id);
          // Remove from replies
          state.announcements[classId].forEach(a => {
            if (a.replies) {
              a.replies = a.replies.filter(r => r.id !== id);
            }
          });
        });
      })
      .addCase(deleteResource.fulfilled, (state, action) => {
        const id = Number(action.payload);
        Object.keys(state.resources).forEach(classId => {
          state.resources[classId] = state.resources[classId].filter(r => r.id !== id);
        });
      })
      .addCase(updateAnnouncement.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        
        const classId = updated.classId;
        
        if (state.announcements[classId]) {
            if (!updated.parentId) {
                // Updating a main post
                const index = state.announcements[classId].findIndex(a => a.id === updated.id);
                if (index !== -1) {
                    state.announcements[classId][index] = { 
                        ...state.announcements[classId][index], 
                        ...updated 
                    };
                }
            } else {
                // Updating a reply
                state.announcements[classId].forEach(a => {
                    if (a.replies) {
                        const rIndex = a.replies.findIndex(r => r.id === updated.id);
                        if (rIndex !== -1) {
                            a.replies[rIndex] = { ...a.replies[rIndex], ...updated };
                        }
                    }
                });
            }
        }
      });
  }
});

export const { clearStatus, setClasses } = classroomSlice.actions;

export const selectClasses = (state) => state.classroom.classes;
export const selectStudents = (state) => state.classroom.students;
export const selectClassroomLoading = (state) => state.classroom.isLoading;
export const selectClassroomError = (state) => state.classroom.error;
export const selectClassAnalytics = (state, classId) => state.classroom.analytics[classId];
export const selectAnnouncements = (state, classId) => state.classroom.announcements[classId] || EMPTY_ARRAY;
export const selectResources = (state, classId) => state.classroom.resources[classId] || EMPTY_ARRAY;

export default classroomSlice.reducer;
