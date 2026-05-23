import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationAPI from '../../services/notificationAPI';
import { isListFetchStale } from '../../utils/fetchStaleGuard';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await notificationAPI.getNotifications();
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  },
  {
    condition: (_, { getState }) => {
      const { isLoading, notifications, lastFetchedAt } = getState().notifications;
      if (isLoading) return false;
      return isListFetchStale(lastFetchedAt, notifications.length > 0);
    },
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await notificationAPI.markAsRead(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationAPI.markAllAsRead();
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to mark all notifications as read');
    }
  }
);

const initialState = {
  notifications: [],
  isLoading: false,
  error: null,
  unreadCount: 0,
  lastFetchedAt: null,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
        state.notifications.unshift(action.payload);
        state.unreadCount += 1;
    },
    clearAllNotifications: (state) => {
        state.notifications = [];
        state.unreadCount = 0;
    },
    removeNotification: (state, action) => {
        const id = action.payload;
        state.notifications = state.notifications.filter(n => n.id !== id);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload || [];
        state.unreadCount = (action.payload || []).filter(n => !n.isRead).length;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.isRead) {
          notification.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications.forEach(n => n.isRead = true);
        state.unreadCount = 0;
      });
  }
});

export const { addNotification, clearAllNotifications, removeNotification } = notificationSlice.actions;

export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectIsLoading = (state) => state.notifications.isLoading;

export default notificationSlice.reducer;
