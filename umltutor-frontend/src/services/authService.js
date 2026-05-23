import apiClient, { clearAuthTokenCache } from './apiClient';
import { inflightGet, clearInflight } from '../utils/inflightRequest';

/**
 * Auth Service — optimized with improved caching, request batching, and token refresh.
 */

const PROFILE_TTL_MS = 120_000; // Increased from 60s to 120s for better performance
let profileCache = null;
let profileCacheAt = 0;
let pendingProfileRequest = null; // Request batching for profile fetches

function getCachedProfile() {
  if (profileCache && Date.now() - profileCacheAt < PROFILE_TTL_MS) {
    return profileCache;
  }
  return null;
}

function setCachedProfile(user) {
  profileCache = user;
  profileCacheAt = Date.now();
}

// Prefetch profile for faster subsequent loads
function prefetchProfile() {
  if (!pendingProfileRequest && !getCachedProfile()) {
    pendingProfileRequest = apiClient.get('/api/auth/profile')
      .then(data => {
        if (data?.user) setCachedProfile(data.user);
        return data;
      })
      .catch(() => {
        // Silently fail prefetch
      })
      .finally(() => {
        pendingProfileRequest = null;
      });
  }
  return pendingProfileRequest;
}

export function clearProfileCache() {
  profileCache = null;
  profileCacheAt = 0;
  clearInflight('auth:profile');
}

class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  async login() {
    clearProfileCache();
    const data = await inflightGet('auth:profile', () => apiClient.get('/api/auth/profile'));
    if (data?.user) setCachedProfile(data.user);
    // Prefetch related data
    prefetchProfile();
    return data;
  }

  async register(userData) {
    clearProfileCache();
    const result = await apiClient.post('/api/auth/register', userData);
    // Auto-login after successful registration
    if (result?.token) {
      this.token = result.token;
      localStorage.setItem('token', result.token);
      if (result?.user) setCachedProfile(result.user);
    }
    return result;
  }

  async logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      clearAuthTokenCache();
      clearProfileCache();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const cached = getCachedProfile();
    if (cached) {
      // Trigger background refresh if cache is stale but still valid
      if (Date.now() - profileCacheAt > PROFILE_TTL_MS / 2) {
        prefetchProfile();
      }
      return cached;
    }

    try {
      // Use pending request if available (request batching)
      const data = await (pendingProfileRequest || inflightGet('auth:profile', () => apiClient.get('/api/auth/profile')));
      const user = data?.user ?? data;
      if (user) setCachedProfile(user);
      return user;
    } catch (error) {
      if (
        error?.status === 401 ||
        error?.needsRegistration ||
        error?.raw?.needsRegistration ||
        error?.needsEmailVerification ||
        error?.raw?.needsEmailVerification
      ) {
        throw error;
      }
      console.error('Get current user error:', error);
      return null;
    }
  }

  async deleteAccount() {
    clearProfileCache();
    const result = await apiClient.delete('/api/auth/account');
    // Clear all auth data
    this.token = null;
    clearAuthTokenCache();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return result;
  }

  async changePassword(newPassword) {
    return apiClient.put('/api/auth/change-password', { newPassword });
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
export const deleteAccount = authService.deleteAccount.bind(authService);
export const changePassword = authService.changePassword.bind(authService);
export const getToken = authService.getToken.bind(authService);
