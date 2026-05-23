import apiClient from './apiClient';
import { inflightGet, clearInflight } from '../utils/inflightRequest';

/**
 * Notification API — parallel GETs deduplicated (StrictMode-safe).
 * Optimized with intelligent polling, WebSocket support, and cache invalidation.
 */

// Polling configuration
const POLL_INTERVAL = 30000; // 30 seconds
const FAST_POLL_INTERVAL = 5000; // 5 seconds for unread notifications
let pollTimer = null;
let isPolling = false;

// WebSocket connection (optional, for real-time updates)
let wsConnection = null;
let wsReconnectTimer = null;

function startPolling(callback, fast = false) {
  if (isPolling) return;
  isPolling = true;
  
  const interval = fast ? FAST_POLL_INTERVAL : POLL_INTERVAL;
  pollTimer = setInterval(() => {
    callback().catch(err => console.error('Polling error:', err));
  }, interval);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isPolling = false;
}

function connectWebSocket(onMessage) {
  if (wsConnection) return wsConnection;
  
  try {
    const wsUrl = process.env.REACT_APP_WS_URL || window.location.origin.replace('http', 'ws');
    wsConnection = new WebSocket(`${wsUrl}/ws/notifications`);
    
    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
        // Invalidate cache on new notification
        clearInflight('notifications:*');
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };
    
    wsConnection.onclose = () => {
      wsConnection = null;
      // Attempt reconnection after 5 seconds
      wsReconnectTimer = setTimeout(() => connectWebSocket(onMessage), 5000);
    };
    
    wsConnection.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    
    return wsConnection;
  } catch (err) {
    console.error('WebSocket connection failed:', err);
    return null;
  }
}

function disconnectWebSocket() {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
}
export const notificationAPI = {
  getNotifications: async (filters = {}) => {
    const key = `notifications:list:${JSON.stringify(filters)}`;
    return inflightGet(key, () => apiClient.get('/api/notifications', { params: filters }));
  },

  getNotificationsPaginated: async (page = 1, limit = 20, filters = {}) => {
    const key = `notifications:list:page:${page}:limit:${limit}:${JSON.stringify(filters)}`;
    return inflightGet(key, () => apiClient.get('/api/notifications', { params: { ...filters, page, limit } }));
  },

  getUnreadNotifications: async () => {
    return inflightGet('notifications:unread', () => apiClient.get('/api/notifications/unread'));
  },

  getNotificationCount: async () => {
    return inflightGet('notifications:count', () => apiClient.get('/api/notifications/count'));
  },

  markAsRead: async (id) => {
    const result = await apiClient.patch(`/api/notifications/${id}/read`);
    // Invalidate relevant caches
    clearInflight('notifications:*');
    clearInflight('notifications:unread');
    clearInflight('notifications:count');
    return result;
  },

  markAllAsRead: async () => {
    const result = await apiClient.post('/api/notifications/read-all');
    // Invalidate relevant caches
    clearInflight('notifications:*');
    clearInflight('notifications:unread');
    clearInflight('notifications:count');
    return result;
  },

  deleteNotification: async (id) => {
    const result = await apiClient.delete(`/api/notifications/${id}`);
    // Invalidate relevant caches
    clearInflight('notifications:*');
    clearInflight('notifications:unread');
    clearInflight('notifications:count');
    return result;
  },

  // Polling control
  startPolling,
  stopPolling,
  
  // WebSocket control
  connectWebSocket,
  disconnectWebSocket,
};

export default notificationAPI;
