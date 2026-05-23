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
        <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
            <div className="max-w-md w-full bg-white p-12 rounded-lg border border-black/5 shadow-card hover:shadow-hover transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10">
                    <h2 className="text-center text-4xl font-heading font-extrabold text-ink tracking-tight mb-3">
                        {isForgotPassword ? 'Reset Access' : 'Welcome Back'}
                    </h2>
                    <p className="text-center text-sm text-muted font-medium mb-10">
                        {isForgotPassword ? (
                            'Enter your email to receive a recovery link.'
                        ) : (
                            <>
                                New to UML Tutor?{' '}
                                <Link to="/signup" className="text-accent font-bold font-body hover:text-accent/80 transition-all underline-offset-4 decoration-2 hover:underline">
                                    Create account
                                </Link>
                            </>
                        )}
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {/* Feedback Messages */}
                    {successMessage && (
                        <div className="bg-status-green/10 border-l-4 border-status-green p-4 rounded-sm flex items-center gap-3 animate-fadeIn">
                            <CheckCircle2 className="w-5 h-5 text-status-green" />
                            <span className="text-sm font-semibold text-status-green">{successMessage}</span>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="bg-status-red/10 border-l-4 border-status-red p-4 rounded-sm flex items-center gap-3 animate-shake">
                            <AlertCircle className="w-5 h-5 text-status-red" />
                            <span className="text-sm font-semibold text-status-red">{errorMessage}</span>
                        </div>
                    )}

                    {isForgotPassword ? (
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold font-body text-ink ml-1">Email address</label>
                                <input
                                    id="email"
                                    type="email"
                                    {...register('email')}
                                    className={`mt-1.5 block w-full px-4 py-3 border-2 ${errors.email ? 'border-status-red' : 'border-transparent'} rounded-md bg-surface-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
                                    placeholder="you@example.com"
                                />
                                {errors.email && <p className="mt-1.5 text-xs font-bold font-body text-status-red ml-1">{errors.email.message}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={isLoading}
                                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-md shadow-card hover:shadow-hover hover:-translate-y-[2px] text-sm font-bold font-body text-white transition-all transform active:scale-98 ${
                                    isLoading ? 'bg-accent/50 cursor-not-allowed' : 'bg-accent'
                                }`}
                            >
                                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                            </button>
                            <div className="text-center">
                                <button type="button" onClick={() => { setIsForgotPassword(false); setErrorMessage(''); setSuccessMessage(''); }} className="text-sm font-semibold text-accent hover:text-accent/80 hover:underline">
                                    Back to Login
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-bold font-body text-ink ml-1">Email address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        {...register('email')}
                                        className={`mt-1.5 block w-full px-4 py-3 border-2 ${errors.email ? 'border-status-red' : 'border-transparent'} rounded-md bg-surface-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
                                        placeholder="you@example.com"
                                    />
                                    {errors.email && <p className="mt-1.5 text-xs font-bold font-body text-status-red ml-1">{errors.email.message}</p>}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between ml-1 mb-1.5">
                                        <label htmlFor="password" className="block text-sm font-bold font-body text-ink">Password</label>
                                        <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm font-semibold text-accent hover:text-accent/80 hover:underline">
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            {...register('password')}
                                            className={`block w-full px-4 py-3 border-2 ${errors.password ? 'border-status-red' : 'border-transparent'} rounded-md bg-surface-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all pr-12`}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-accent transition-colors rounded-sm hover:bg-surface-3"
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="mt-1.5 text-xs font-bold font-body text-status-red ml-1">{errors.password.message}</p>}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-md shadow-card hover:shadow-hover hover:-translate-y-[2px] text-sm font-bold font-body text-white transition-all transform active:scale-98 ${
                                    isLoading ? 'bg-accent/50 cursor-not-allowed' : 'bg-accent'
                                }`}
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
