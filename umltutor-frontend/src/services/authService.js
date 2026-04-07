import apiClient from './apiClient';

class AuthService {
  __init() { this.token = null }

  constructor() {
    AuthService.prototype.__init.call(this);
    this.token = localStorage.getItem('token');
  }

  async login(credentials) {
    // With Firebase, we don't necessarily need a backend login call 
    // unless we want to do additional logging or session management.
    // However, we still need to fetch the user profile.
    const data = await apiClient.get('/api/auth/profile');
    return data;
  }

  async register(userData) {
    // userData should now include firebaseUid
    const data = await apiClient.post('/api/auth/register', userData);
    return data;
  }

  async logout() {
    try {
      // Backend logout might still be useful to clear server-side sessions/logs
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser() {
    // The token is now managed by Firebase and automatically refreshed.
    // apiClient interceptor will pick it up from localStorage.
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const data = await apiClient.get('/api/auth/profile');
      return data.user;
    } catch (error) {
      // Re-throw 401s or specific flags so AuthContext can properly handle the state transition
      if (error?.status === 401 || error?.needsRegistration || error?.raw?.needsRegistration || 
          error?.needsEmailVerification || error?.raw?.needsEmailVerification) {
        throw error;
      }
      
      console.error('Get current user error:', error);
      return null;
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }
}

const authService = new AuthService();
export default authService;
export const login = authService.login.bind(authService);
export const register = authService.register.bind(authService);
export const logout = authService.logout.bind(authService);
export const getCurrentUser = authService.getCurrentUser.bind(authService);
export const getToken = authService.getToken.bind(authService);
