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
        redirectPath: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    // Listen for Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setIsLoading(true);
            try {
                if (firebaseUser) {
                    // Check if email is verified
                    const isEmailVerified = firebaseUser.emailVerified;
                    
                    const token = await firebaseUser.getIdToken();
                    localStorage.setItem('token', token);

                    // Sync with our backend to get the full user profile (role, etc.)
                    let currentUser = null;
                    try {
                        currentUser = await authService.getCurrentUser();
                    } catch (error) {
                        // Handle the case where Firebase user is valid but local profile doesn't exist yet
                        if (error?.needsRegistration || error?.raw?.needsRegistration) {
                            console.log('User needs profile completion');
                            setAuthState(prev => ({
                                isAuthenticated: false,
                                user: { 
                                    email: firebaseUser.email, 
                                    firebaseUid: firebaseUser.uid,
                                    displayName: firebaseUser.displayName 
                                },
                                token: null,
                                isGuest: true,
                                needsProfileCompletion: true,
                                needsEmailVerification: !isEmailVerified,
                                redirectPath: prev.redirectPath,
                            }));
                            setIsLoading(false);
                            return;
                        }

                        // Handle the case where backend blocks profile fetch due to verification
                        if (error?.needsEmailVerification || error?.raw?.needsEmailVerification || !isEmailVerified) {
                             setAuthState(prev => ({
                                isAuthenticated: false,
                                user: { email: firebaseUser.email, firebaseUid: firebaseUser.uid },
                                token: null,
                                isGuest: true,
                                needsProfileCompletion: false,
                                needsEmailVerification: true,
                                redirectPath: prev.redirectPath,
                            }));
                            setIsLoading(false);
                            return;
                        }
                        
                        throw error;
                    }
                    
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
                dispatch(reduxLogout());
            } finally {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [dispatch]);

    // Handle redirection based on auth state
    useEffect(() => {
        if (isLoading) return;

        // Note: verify-email page and select-role page have been removed. 
        // We now show prompts in the Login/Register pages for unverified users.

        if (authState.isAuthenticated && authState.user) {
            // Already authenticated, but on an auth page? Move to dashboard/redirectPath
            if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/signup' || location.pathname === '/') {
                const path = authState.redirectPath || '/dashboard';
                clearRedirectPath();
                navigate(path, { replace: true });
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
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            await authService.register({
                email,
                firstName,
                lastName,
                role,
                firebaseUid: userCredential.user.uid
            });

            return userCredential.user;
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

