import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from 'firebase/auth';
import { auth } from '../config/firebase';

import * as authService from '../services/authService';
import { useAppDispatch } from '../app/hooks';
import { setUser as setReduxUser, setToken as setReduxToken, logout as reduxLogout } from '../features/auth';
import { clearAuthTokenCache } from '../services/apiClient';
import { clearProfileCache } from '../services/authService';

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
        needsProfileCompletion: false,
        needsEmailVerification: false,
        redirectPath: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const lastCheckedUid = useRef(null);
    const checkingInProgress = useRef(false);

    // Listen for Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            // Prevent redundant checks if we already have this user and didn't sign out
            if (firebaseUser?.uid === lastCheckedUid.current && authState.user && !checkingInProgress.current) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                if (firebaseUser) {
                    lastCheckedUid.current = firebaseUser.uid;
                    checkingInProgress.current = true;
                    
                    const isEmailVerified = firebaseUser.emailVerified;
                    const token = await firebaseUser.getIdToken(false);
                    localStorage.setItem('token', token);

                    try {
                        // Sync with our backend to get the full user profile (role, etc.)
                        const currentUser = await authService.getCurrentUser();

                        if (currentUser) {
                            setAuthState(prev => ({
                                isAuthenticated: true, // Allow session even if not verified
                                user: currentUser,
                                token,
                                isGuest: !isEmailVerified,
                                needsProfileCompletion: false,
                                needsEmailVerification: !isEmailVerified,
                                redirectPath: prev.redirectPath,
                            }));

                            if (isEmailVerified) {
                                dispatch(setReduxUser(currentUser));
                                dispatch(setReduxToken(token));
                            }
                        }
                    } catch (error) {
                        // Handle the case where Firebase user is valid but local profile doesn't exist yet
                        if (error?.needsRegistration || error?.raw?.needsRegistration) {
                            setAuthState(prev => ({
                                isAuthenticated: false,
                                user: {
                                    email: firebaseUser.email,
                                    firebaseUid: firebaseUser.uid,
                                    displayName: firebaseUser.displayName
                                },
                                token,
                                isGuest: false,
                                needsProfileCompletion: true,
                                needsEmailVerification: !isEmailVerified,
                                redirectPath: prev.redirectPath,
                            }));
                        } else if (error?.needsEmailVerification || error?.raw?.needsEmailVerification || !isEmailVerified) {
                            setAuthState(prev => ({
                                isAuthenticated: false,
                                user: { email: firebaseUser.email, firebaseUid: firebaseUser.uid },
                                token,
                                isGuest: true,
                                needsProfileCompletion: false,
                                needsEmailVerification: true,
                                redirectPath: prev.redirectPath,
                            }));
                        } else {
                            throw error;
                        }
                    }
                } else {
                    // User is signed out
                    lastCheckedUid.current = null;
                    localStorage.removeItem('token');
                    setAuthState(prev => ({
                        isAuthenticated: false,
                        user: null,
                        token: null,
                        isGuest: true,
                        needsProfileCompletion: false,
                        needsEmailVerification: false,
                        redirectPath: prev.redirectPath,
                    }));
                    dispatch(reduxLogout());
                }
            } catch (error) {
                console.error('Auth state change error:', error);
                if (!error?.needsRegistration && !error?.raw?.needsRegistration) {
                    dispatch(reduxLogout());
                }
            } finally {
                checkingInProgress.current = false;
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [dispatch]);

    // Handle redirection based on auth state
    useEffect(() => {
        if (isLoading) return;

        if (authState.isAuthenticated && authState.user) {
            if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/signup' || location.pathname === '/') {
                const path = authState.redirectPath || '/dashboard';
                clearRedirectPath();
                navigate(path, { replace: true });
            }
        }
        else if (authState.needsProfileCompletion && !isLoading) {
            if (location.pathname !== '/register') {
                navigate('/register', { replace: true });
            }
        }
    }, [authState.isAuthenticated, authState.needsProfileCompletion, authState.needsEmailVerification, authState.user, authState.redirectPath, navigate, isLoading]);

    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (email, password, firstName, lastName, role) => {
        try {
            let firebaseUser = auth.currentUser;

            if (!firebaseUser) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                firebaseUser = userCredential.user;
                await sendEmailVerification(firebaseUser);
            }

            await authService.register({
                email,
                firstName,
                lastName,
                role,
                firebaseUid: firebaseUser.uid
            });

            let currentUser = null;
            try {
                currentUser = await authService.getCurrentUser();
            } catch (error) {
                // If the error is just that email verification is required, 
                // or any other profile-fetch error during registration,
                // we treat the registration as successful but not yet fully authenticated.
                const isVerificationError =
                    error?.needsEmailVerification ||
                    error?.raw?.needsEmailVerification ||
                    (error?.message && error.message.toLowerCase().includes('verification'));

                if (!isVerificationError) {
                    throw error;
                }
            }

            const isEmailVerified = firebaseUser.emailVerified;
            const token = await firebaseUser.getIdToken();

            setAuthState(prev => ({
                ...prev,
                isAuthenticated: true, // Allow navigation to dashboard
                user: currentUser || { email, firstName, lastName, role, firebaseUid: firebaseUser.uid },
                token,
                needsProfileCompletion: false,
                isGuest: !isEmailVerified,
                needsEmailVerification: !isEmailVerified
            }));

            if (isEmailVerified) {
                dispatch(setReduxUser(currentUser));
                dispatch(setReduxToken(token));
            }

            return firebaseUser;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            clearAuthTokenCache();
            clearProfileCache();
            localStorage.removeItem('token');
            setAuthState({
                isAuthenticated: false,
                user: null,
                token: null,
                isGuest: true,
                needsProfileCompletion: false,
                needsEmailVerification: false,
                redirectPath: null,
            });
            dispatch(reduxLogout());
            navigate('/', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const setRedirectPath = (path) => {
        setAuthState(prev => ({ ...prev, redirectPath: path }));
    };

    const clearRedirectPath = () => {
        setAuthState(prev => ({ ...prev, redirectPath: null }));
    };

    const changePassword = async (oldPassword, newPassword) => {
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error("No authenticated user found");

        try {
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, oldPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password in Firebase
            await updatePassword(user, newPassword);

            // Update password in local database
            await authService.changePassword(newPassword);

            return true;
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    };

    const deleteUserAccount = async (password) => {
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error("No authenticated user found");

        try {
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);

            // Delete from Backend first (to clean up linked data)
            await authService.deleteAccount();

            // Delete from Firebase
            await deleteUser(user);

            // Clean up state
            await logout();
            return true;
        } catch (error) {
            console.error('Delete account error:', error);
            throw error;
        }
    };

    const value = {
        authState,
        isLoading,
        login,
        register,
        logout,
        setRedirectPath,
        clearRedirectPath,
        changePassword,
        deleteUserAccount
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
