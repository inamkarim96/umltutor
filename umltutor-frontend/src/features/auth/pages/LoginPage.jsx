import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../contexts/AuthContext';

import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../../config/firebase';
import { reload, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

// Validation schema
const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const LoginPage = () => {
    const { login, authState } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    const handleResendEmail = async () => {
        if (!auth.currentUser) return;
        setIsResending(true);
        try {
            await sendEmailVerification(auth.currentUser);
            setSuccessMessage('Verification email has been resent. Please check your inbox.');
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            setErrorMessage('Failed to resend verification email. Please try again later.');
        } finally {
            setIsResending(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!auth.currentUser) return;
        setIsChecking(true);
        try {
            await reload(auth.currentUser);
            if (auth.currentUser.emailVerified) {
                const newToken = await auth.currentUser.getIdToken(true);
                localStorage.setItem('token', newToken);
                window.location.reload();
            } else {
                setErrorMessage('Email still not verified. Please check your inbox and click the link.');
            }
        } catch (error) {
            setErrorMessage('Error checking status. Please try again.');
        } finally {
            setIsChecking(false);
        }
    };

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    React.useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            // Pre-fill email if provided from registration
            if (location.state.email) {
                setValue('email', location.state.email);
            }
            // Clear location state to prevent message showing again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state, setValue]);

    const onSubmit = async (data) => {
        try {
            setIsLoading(true);
            setErrorMessage('');
            await login(data.email, data.password);
        } catch (error) {
            let apiError = 'Login failed. Please try again.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                apiError = 'Invalid email or password.';
            } else if (error.code === 'auth/too-many-requests') {
                apiError = 'Too many failed login attempts. Please try again later.';
            } else {
                apiError = error.message || apiError;
            }
            setErrorMessage(apiError);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const email = getValues('email');
        if (!email || !email.includes('@')) {
            setErrorMessage('Please enter a valid email address first.');
            return;
        }
        try {
            setIsLoading(true);
            setErrorMessage('');
            await sendPasswordResetEmail(auth, email);
            setSuccessMessage('Password reset email sent. Please check your inbox.');
            setIsForgotPassword(false);
        } catch (error) {
            setErrorMessage(error.message || 'Failed to send reset email.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="sdb-auth-container">
            <div className="sdb-auth-card">
                <div className="sdb-auth-header">
                    <h2 className="sdb-auth-title">
                        {isForgotPassword ? 'Reset Access' : 'Welcome Back'}
                    </h2>
                    <p className="sdb-auth-subtitle">
                        {isForgotPassword ? (
                            'Enter your email to receive a recovery link.'
                        ) : (
                            <>
                                New to UML Tutor?{' '}
                                <Link to="/signup" className="sdb-auth-link">
                                    Create account
                                </Link>
                            </>
                        )}
                    </p>
                </div>

                <div className="sdb-form-container">
                    {/* Feedback Messages */}
                    {successMessage && (
                        <div className="sdb-form-alert sdb-form-alert-success">
                            <CheckCircle2 size={20} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="sdb-form-alert sdb-form-alert-error">
                            <AlertCircle size={20} />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {isForgotPassword ? (
                        <div className="sdb-form-group-container">
                            <div className="sdb-form-group">
                                <label htmlFor="email" className="sdb-form-label">Email address</label>
                                <input
                                    id="email"
                                    type="email"
                                    {...register('email')}
                                    className={`sdb-form-input ${errors.email ? 'sdb-form-input-error' : ''}`}
                                    placeholder="you@example.com"
                                />
                                {errors.email && <p className="sdb-form-error-text">{errors.email.message}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={isLoading}
                                className="sdb-form-submit"
                            >
                                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                            </button>
                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <button type="button" onClick={() => { setIsForgotPassword(false); setErrorMessage(''); setSuccessMessage(''); }} className="sdb-auth-link">
                                    Back to Login
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="sdb-form-group-container">
                                <div className="sdb-form-group">
                                    <label htmlFor="email" className="sdb-form-label">Email address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        {...register('email')}
                                        className={`sdb-form-input ${errors.email ? 'sdb-form-input-error' : ''}`}
                                        placeholder="you@example.com"
                                    />
                                    {errors.email && <p className="sdb-form-error-text">{errors.email.message}</p>}
                                </div>

                                <div className="sdb-form-group">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <label htmlFor="password" className="sdb-form-label" style={{ margin: 0 }}>Password</label>
                                        <button type="button" onClick={() => setIsForgotPassword(true)} className="sdb-auth-link">
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            {...register('password')}
                                            className={`sdb-form-input ${errors.password ? 'sdb-form-input-error' : ''}`}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="sdb-form-error-text">{errors.password.message}</p>}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="sdb-form-submit"
                            >
                                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Log In'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
