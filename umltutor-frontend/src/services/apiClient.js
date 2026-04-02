import axios from 'axios';
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

// Request Interceptor: Attach Auth Token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
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
                // Return payload if present, otherwise return full data (which might contain message etc)
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
                // If it's a login or registration request, do NOT trigger terminal auth failure (handled locally)
                const config = error.config;
                const isAuthEndpoint = config.url.includes('/api/auth/login') || config.url.includes('/api/auth/register');

                if (!isAuthEndpoint) {
                    console.warn('Unauthorized access, triggering auth failure event...');
                    eventBus.emit(GLOBAL_EVENTS.AUTH_FAILURE);
                    eventBus.emit(GLOBAL_EVENTS.SHOW_TOAST, {
                        message: 'Session expired. Please log in again.',
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
                raw: data // Keep raw for debugging if needed
            };

            return Promise.reject(apiError);
        }

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
