import axios from 'axios';
import { auth } from '../config/firebase';
import { eventBus, GLOBAL_EVENTS } from '../utils/events';

const API_BASE_URL = process.env.API_BASE_URL || '';

/**
 * Centralized API Client with authentication and standard response handling
 */
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach a FRESH Firebase Auth Token on every request.
// auth.currentUser.getIdToken() automatically refreshes the token if it has expired,
// solving the 401 errors that occur after 1 hour.
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                // getIdToken() returns cached token OR silently refreshes if expired
                const token = await currentUser.getIdToken();
                config.headers.Authorization = `Bearer ${token}`;
                // Keep localStorage in sync for any legacy code that reads it
                localStorage.setItem('token', token);
            } else {
                // Fallback: use cached token from localStorage if Firebase user is not yet loaded
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
        } catch (err) {
            console.warn('Failed to get Firebase token for request:', err);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Flatten success data and handle errors centrally
apiClient.interceptors.response.use(
    (response) => {
        // Unwrap backend success/data wrapper if it exists
        if (response.data && response.data.success !== undefined) {
            if (response.data.success) {
                return response.data.data !== undefined ? response.data.data : response.data;
            }
            // If success is false, treat as error even if HTTP status is 200
            const errorMessage = response.data.error?.message || response.data.message || 'Operation failed';
            return Promise.reject({
                message: errorMessage,
                status: response.status,
                code: response.data.error?.code || 'OPERATION_FAILED',
                details: response.data.error?.details || null
            });
        }
        return response.data;
    },
    (error) => {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            if (status === 401) {
                const config = error.config;
                const isAuthEndpoint = config?.url?.includes('/api/auth/');
                const isVerificationNeeded = data?.needsEmailVerification;
                const isRegistrationNeeded = data?.needsRegistration;

                if (isRegistrationNeeded) {
                    eventBus.emit(GLOBAL_EVENTS.SHOW_TOAST, {
                        message: 'Additional registration steps required. Redirecting...',
                        type: 'info'
                    });
                } else if (isVerificationNeeded) {
                    eventBus.emit(GLOBAL_EVENTS.SHOW_TOAST, {
                        message: 'Please verify your email before accessing the dashboard.',
                        type: 'warning'
                    });
                } else if (!isAuthEndpoint) {
                    console.warn('Unauthorized access - session may have expired');
                    eventBus.emit(GLOBAL_EVENTS.AUTH_FAILURE);
                    eventBus.emit(GLOBAL_EVENTS.SHOW_TOAST, {
                        message: 'Session expired or token invalid. Please log in again.',
                        type: 'error'
                    });
                }
            } else if (status >= 500) {

                eventBus.emit(GLOBAL_EVENTS.SHOW_TOAST, {
                    message: 'Server error. Please try again later.',
                    type: 'error'
                });
            } else if (status === 403) {
                eventBus.emit(GLOBAL_EVENTS.SHOW_TOAST, {
                    message: 'You do not have permission to perform this action.',
                    type: 'warning'
                });
            }

            const apiError = {
                message: data?.error?.message || data?.message || error.message || 'An unexpected error occurred',
                code: data?.error?.code || `HTTP_${status}`,
                details: data?.error?.details || data?.details || null,
                status,
                needsRegistration: data?.needsRegistration || false,
                needsEmailVerification: data?.needsEmailVerification || false,
                raw: data
            };

            return Promise.reject(apiError);
        }

        // Network error
        eventBus.emit(GLOBAL_EVENTS.SHOW_TOAST, {
            message: 'Network error. Please check your connection.',
            type: 'error'
        });

        return Promise.reject({
            message: 'Network error or server unreachable',
            code: 'NETWORK_ERROR',
            status: 0,
        });
    }
);

export default apiClient;
