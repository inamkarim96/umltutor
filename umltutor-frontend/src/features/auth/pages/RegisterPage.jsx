import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../../../types/auth';
import { useErrorToast } from '../../../components/ui/Toast';
import { Eye, EyeOff } from 'lucide-react';

// Validation schema
const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    role: z.enum(['STUDENT', 'TEACHER'], {
        errorMap: () => ({ message: 'Please select a role' }),
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

const RegisterPage = () => {
    const { register: registerUser, authState } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        handleSubmit,
        setError,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: authState.user?.email || '',
            firstName: authState.user?.firstName || '',
            lastName: authState.user?.lastName || '',
            role: authState.user?.role || '',
        }
    });

    React.useEffect(() => {
        if (authState.needsProfileCompletion && authState.user?.email) {
            setValue('email', authState.user.email);
            // Hide password fields by setting dummy values to pass validation
            setValue('password', 'ALREADY_AUTHENTICATED');
            setValue('confirmPassword', 'ALREADY_AUTHENTICATED');
        }
    }, [authState.needsProfileCompletion, authState.user?.email, setValue]);

    const showErrorToast = useErrorToast();

    const onSubmit = async (data) => {
        try {
            setIsLoading(true);
            setErrorMessage('');
            await registerUser(
                data.email,
                data.password,
                data.firstName,
                data.lastName,
                data.role
            );
            // Redirect to login with success message
            navigate('/login', { 
                state: { 
                    message: 'Account created successfully! Please check your email inbox to verify your account before logging in.',
                    email: data.email
                } 
            });
        } catch (error) {
            const isVerificationError = 
                error?.needsEmailVerification || 
                error?.raw?.needsEmailVerification ||
                (error?.message && error.message.toLowerCase().includes('verification'));

            if (isVerificationError) {
                // Even if there's a verification error, registration is complete,
                // so we still navigate to login as requested by the user.
                navigate('/login', { 
                    state: { 
                        message: 'Registration complete! Please check your email to verify your account before logging in.',
                        email: data.email
                    } 
                });
                return;
            }

            let finalMessage = 'An unexpected error occurred. Please try again.';
            
            const isEmailConflict = 
                error.code === 'auth/email-already-in-use' || 
                error.status === 409 || 
                error.code === 'DUPLICATE_RESOURCE';

            if (isEmailConflict) {
                finalMessage = 'This email is already registered. Please login instead.';
                setError('email', { type: 'manual', message: finalMessage });
            } else {
                finalMessage = error.message || finalMessage;
            }

            setErrorMessage(finalMessage);
            showErrorToast(finalMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">Sign up for UML Tutor</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                        >
                            Sign in here
                        </Link>
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        {errorMessage && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl flex flex-col gap-2 animate-shake">
                                <div className="flex items-center gap-2 font-bold select-none">
                                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    {errorMessage}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 tracking-wide font-semibold">First name</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        {...register('firstName')}
                                        className={`mt-1.5 block w-full px-4 py-2.5 border ${errors.firstName ? 'border-red-300' : 'border-gray-200'
                                            } rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50`}
                                        placeholder="First"
                                    />
                                    {errors.firstName && (
                                        <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 tracking-wide font-semibold">Last name</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        {...register('lastName')}
                                        className={`mt-1.5 block w-full px-4 py-2.5 border ${errors.lastName ? 'border-red-300' : 'border-gray-200'
                                            } rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50`}
                                        placeholder="Last"
                                    />
                                    {errors.lastName && (
                                        <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 tracking-wide font-semibold">Email address</label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    {...register('email')}
                                    className={`mt-1.5 block w-full px-4 py-2.5 border ${errors.email ? 'border-red-300' : 'border-gray-200'
                                        } rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50`}
                                    placeholder="you@example.com"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700 tracking-wide font-semibold">I am a</label>
                                <select
                                    id="role"
                                    {...register('role')}
                                    className={`mt-1.5 block w-full px-4 py-2.5 border ${errors.role ? 'border-red-300' : 'border-gray-200'
                                        } rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50`}
                                >
                                    <option value="">Select your role</option>
                                    <option value={UserRole.STUDENT}>Student</option>
                                    <option value={UserRole.TEACHER}>Teacher</option>
                                </select>
                                {errors.role && (
                                    <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                                )}
                            </div>

<div className={authState.needsProfileCompletion ? "hidden" : ""}>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 tracking-wide font-semibold">Password</label>
                                <div className="relative mt-1.5">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        {...register('password')}
                                        className={`block w-full px-4 py-2.5 border ${errors.password ? 'border-red-300' : 'border-gray-200'
                                            } rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 pr-12`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-gray-100"
                                        tabIndex="-1"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                                )}
                            </div>

                            <div className={authState.needsProfileCompletion ? "hidden" : ""}>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 tracking-wide font-semibold">Confirm password</label>
                                <div className="relative mt-1.5">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        {...register('confirmPassword')}
                                        className={`block w-full px-4 py-2.5 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                                            } rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 pr-12`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-gray-100"
                                        tabIndex="-1"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white ${isLoading
                                        ? 'bg-indigo-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                    } transition-all duration-200 transform active:scale-95`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <svg
                                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        {authState.needsProfileCompletion ? 'Completing profile...' : 'Creating account...'}
                                    </span>
                                ) : (
                                    authState.needsProfileCompletion ? 'Complete Registration' : 'Create account'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
