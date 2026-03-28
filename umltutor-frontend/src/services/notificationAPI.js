import apiClient from './apiClient';

/**
 * Notification Service organized by feature and user role
 * Comprehensive notification management for all user types
 */
export const notificationAPI = {
  // === NOTIFICATION RETRIEVAL ===
  getNotifications: async (filters = {}) => {
    return apiClient.get('/api/notifications', { params: filters });
  },

  getUnreadNotifications: async () => {
    return apiClient.get('/api/notifications/unread');
  },

  getNotificationCount: async () => {
    return apiClient.get('/api/notifications/count');
  },

  // === NOTIFICATION STATUS MANAGEMENT ===
  markAsRead: async (id) => {
    return apiClient.patch(`/api/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    return apiClient.post('/api/notifications/read-all');
  },

  // === NOTIFICATION ACTIONS ===
  deleteNotification: async (id) => {
    return apiClient.delete(`/api/notifications/${id}`);
  }
};

export default notificationAPI;
