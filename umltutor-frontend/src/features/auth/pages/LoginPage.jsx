import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../contexts/AuthContext';

import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../../../config/firebase';
import { reload, sendEmailVerification } from 'firebase/auth';
import { Mail, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

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
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl transition-all hover:shadow-2xl">
                <div className="space-y-2">
                    <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">Sign in to UML Tutor</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500 underline-offset-4 hover:underline transition-all">
                            Sign up here
                        </Link>
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {/* Verification Alert Section */}
                    {authState?.needsEmailVerification && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4 animate-fadeIn">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-amber-900">Verify your email</h3>
                                    <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                        Check your inbox at <span className="font-bold">{auth.currentUser?.email}</span>. 
                                        Click the verification link to proceed.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <button
                                    onClick={handleCheckStatus}
                                    disabled={isChecking}
                                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    {isChecking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    Check Status
                                </button>
                                <button
                                    onClick={handleResendEmail}
                                    disabled={isResending}
                                    className="flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isResending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                    Resend Link
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Feedback Messages */}
                    {successMessage && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-center gap-3 animate-fadeIn">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-800">{successMessage}</span>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center gap-3 animate-shake">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <span className="text-sm font-semibold text-red-800">{errorMessage}</span>
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-gray-700 ml-1">Email address</label>
                                <input
                                    id="email"
                                    type="email"
                                    {...register('email')}
                                    className={`mt-1.5 block w-full px-4 py-3 border-2 ${errors.email ? 'border-red-200' : 'border-gray-100'} rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`}
                                    placeholder="you@example.com"
                                />
                                {errors.email && <p className="mt-1.5 text-xs font-bold text-red-500 ml-1">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-bold text-gray-700 ml-1">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    {...register('password')}
                                    className={`mt-1.5 block w-full px-4 py-3 border-2 ${errors.password ? 'border-red-200' : 'border-gray-100'} rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`}
                                    placeholder="••••••••"
                                />
                                {errors.password && <p className="mt-1.5 text-xs font-bold text-red-500 ml-1">{errors.password.message}</p>}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all transform active:scale-98 ${
                                isLoading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
                            }`}
                        >
                            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Log In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
