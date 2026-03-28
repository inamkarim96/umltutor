import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import * as authService from '../services/authService';
import { useAppDispatch } from '../app/hooks';
import { setUser as setReduxUser, setToken as setReduxToken, logout as reduxLogout } from '../features/auth';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        user: null,
        token: null,
        isGuest: true,
        redirectPath: null,
    });
    const [isLoading, setIsLoading] = useState(true);

    // Load user on mount and handle redirect
    useEffect(() => {
        loadUser();
    }, []);

    // Handle redirect after login based on role
    useEffect(() => {
        if (authState.isAuthenticated && authState.user && authState.redirectPath) {
            const redirectPath = authState.redirectPath;
            clearRedirectPath();
            navigate(redirectPath, { replace: true });
        }
    }, [authState.isAuthenticated, authState?.user?.role, authState.redirectPath, navigate]);

    const loadUser = async () => {
        try {
            setIsLoading(true);
            const currentUser = await authService.getCurrentUser();
            const token = authService.getToken();

            if (currentUser && token) {
                setAuthState({
                    isAuthenticated: true,
                    user: currentUser,
                    token,
                    isGuest: false,
                    redirectPath: authState.redirectPath, // preserve redirect path
                });
                
                // Keep Redux in sync
                dispatch(setReduxUser(currentUser));
                dispatch(setReduxToken(token));
            } else {
                setAuthState({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    isGuest: true,
                    redirectPath: authState.redirectPath, // preserve redirect path
                });
                dispatch(reduxLogout());
            }
        } catch (error) {
            setAuthState({
                isAuthenticated: false,
                user: null,
                token: null,
                isGuest: true,
                redirectPath: authState.redirectPath,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await authService.login({ email, password });
            const token = response.token;
            const user = response.user;

            setAuthState({
                isAuthenticated: true,
                user,
                token,
                isGuest: false,
                redirectPath: null, // Clear redirect path on successful login
            });

            // Keep Redux in sync
            dispatch(setReduxUser(user));
            dispatch(setReduxToken(token));
        } catch (error) {
            throw error;
        }
    };

    const register = async (
        email,
        password,
        firstName,
        lastName,
        role
    ) => {
        try {
            const response = await authService.register({
                email,
                password,
                firstName,
                lastName,
                role: role,
            });
            const token = response.token;
            const user = response.user;

            setAuthState({
                isAuthenticated: true,
                user,
                token,
                isGuest: false,
                redirectPath: null, // Clear redirect path on successful registration
            });

            // Keep Redux in sync
            dispatch(setReduxUser(user));
            dispatch(setReduxToken(token));
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            // Silently handle logout errors
        } finally {
            // Clear auth state completely
            setAuthState({
                isAuthenticated: false,
                user: null,
                token: null,
                isGuest: true,
                redirectPath: null,
            });
            
            // Keep Redux in sync
            dispatch(reduxLogout());

            // Navigate to landing page and replace history
            navigate('/', { replace: true });
        }
    };

    const setRedirectPath = (path) => {
        setAuthState(prev => ({
            ...prev,
            redirectPath: path,
        }));
    };

    const clearRedirectPath = () => {
        setAuthState(prev => ({
            ...prev,
            redirectPath: null,
        }));
    };

    const value = {
        authState,
        isLoading,
        login,
        register,
        logout,
        refreshUser: loadUser,
        setRedirectPath,
        clearRedirectPath,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

