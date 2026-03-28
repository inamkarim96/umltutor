import apiClient from './apiClient';

class AuthService {
  __init() { this.token = null }

  constructor() {
    AuthService.prototype.__init.call(this);
    this.token = localStorage.getItem('token');
  }

  async login(credentials) {
    // apiClient already handles unwrapping and common errors via interceptors
    const data = await apiClient.post('/api/auth/login', credentials);
    
    // Auth-specific persistence logic
    this.token = data.token;
    localStorage.setItem('token', this.token);

    return data;
  }

  async register(userData) {
    const data = await apiClient.post('/api/auth/register', userData);
    
    this.token = data.token;
    localStorage.setItem('token', this.token);

    return data;
  }

  async logout() {
    try {
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
    if (!this.token) return null;

    try {
      // apiClient already attaches authorization header via request interceptor
      const data = await apiClient.get('/api/auth/profile');
      return data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  getToken() {
    return this.token;
  }
}


const authService = new AuthService();
export default authService;
export const login = authService.login.bind(authService);
export const register = authService.register.bind(authService);
export const logout = authService.logout.bind(authService);
export const getCurrentUser = authService.getCurrentUser.bind(authService);
export const getToken = authService.getToken.bind(authService);
