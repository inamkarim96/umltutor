import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    sendEmailVerification
} from 'firebase/auth';
import { auth } from '../config/firebase';

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
        needsProfileCompletion: false,
        needsEmailVerification: false,
        redirectPath: null,
    });
    const [isLoading, setIsLoading] = useState(true);

    // Listen for Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setIsLoading(true);
            try {
                if (firebaseUser) {
                    const isEmailVerified = firebaseUser.emailVerified;
                    const token = await firebaseUser.getIdToken();
                    localStorage.setItem('token', token);

                    try {
                        // Sync with our backend to get the full user profile (role, etc.)
                        const currentUser = await authService.getCurrentUser();
                        
                        if (currentUser) {
                            setAuthState(prev => ({
                                isAuthenticated: isEmailVerified,
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
    }, [authState.isAuthenticated, authState.needsProfileCompletion, authState.needsEmailVerification, authState.user, authState.redirectPath, navigate, location.pathname, isLoading]);

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
                // we treat the registration as successful but not yet fully authenticated.
                if (!error?.needsEmailVerification && !error?.raw?.needsEmailVerification) {
                    throw error;
                }
                console.log('Registration successful, but email verification pending.');
            }

            const isEmailVerified = firebaseUser.emailVerified;
            const token = await firebaseUser.getIdToken();

            setAuthState(prev => ({
                ...prev,
                isAuthenticated: isEmailVerified,
                user: currentUser || { email, firstName, lastName, role, firebaseUid: firebaseUser.uid },
                token,
                needsProfileCompletion: false,
                isGuest: !isEmailVerified
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

    const value = {
        authState,
        isLoading,
        login,
        register,
        logout,
        setRedirectPath,
        clearRedirectPath,
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
