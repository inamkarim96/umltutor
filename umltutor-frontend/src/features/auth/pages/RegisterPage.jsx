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
        <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
            <div className="max-w-xl w-full bg-white p-12 rounded-lg border border-black/5 shadow-card hover:shadow-hover transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <h2 className="text-center text-4xl font-heading font-extrabold text-ink tracking-tight mb-3">Join UML Tutor</h2>
                    <p className="text-center text-sm text-muted font-medium mb-10">
                        Already have an account?{' '}
                        <Link to="/login" className="text-accent font-bold font-body hover:text-accent/80 transition-all underline-offset-4 decoration-2 hover:underline">
                            Sign in instead
                        </Link>
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        {errorMessage && (
                            <div className="bg-status-red/10 border border-status-red/20 text-status-red px-4 py-4 rounded-sm flex flex-col gap-2 animate-shake">
                                <div className="flex items-center gap-2 font-bold font-body select-none">
                                    <svg className="w-5 h-5 text-status-red" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    {errorMessage}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-bold font-body text-ink">First name</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        {...register('firstName')}
                                        className={`mt-1.5 block w-full px-4 py-2.5 border-2 ${errors.firstName ? 'border-status-red' : 'border-transparent'
                                            } rounded-md bg-surface-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
                                        placeholder="First"
                                    />
                                    {errors.firstName && (
                                        <p className="mt-1 text-xs font-bold font-body text-status-red">{errors.firstName.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-bold font-body text-ink">Last name</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        {...register('lastName')}
                                        className={`mt-1.5 block w-full px-4 py-2.5 border-2 ${errors.lastName ? 'border-status-red' : 'border-transparent'
                                            } rounded-md bg-surface-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
                                        placeholder="Last"
                                    />
                                    {errors.lastName && (
                                        <p className="mt-1 text-xs font-bold font-body text-status-red">{errors.lastName.message}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-bold font-body text-ink">Email address</label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    {...register('email')}
                                    className={`mt-1.5 block w-full px-4 py-2.5 border-2 ${errors.email ? 'border-status-red' : 'border-transparent'
                                        } rounded-md bg-surface-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
                                    placeholder="you@example.com"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-xs font-bold font-body text-status-red">{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="role" className="block text-sm font-bold font-body text-ink">I am a</label>
                                <select
                                    id="role"
                                    {...register('role')}
                                    className={`mt-1.5 block w-full px-4 py-2.5 border-2 ${errors.role ? 'border-status-red' : 'border-transparent'
                                        } rounded-md bg-surface-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
                                >
                                    <option value="">Select your role</option>
                                    <option value={UserRole.STUDENT}>Student</option>
                                    <option value={UserRole.TEACHER}>Teacher</option>
                                </select>
                                {errors.role && (
                                    <p className="mt-1 text-xs font-bold font-body text-status-red">{errors.role.message}</p>
                                )}
                            </div>

                            <div className={authState.needsProfileCompletion ? "hidden" : ""}>
                                <label htmlFor="password" className="block text-sm font-bold font-body text-ink">Password</label>
                                <div className="relative mt-1.5">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        {...register('password')}
                                        className={`block w-full px-4 py-2.5 border-2 ${errors.password ? 'border-status-red' : 'border-transparent'
                                            } rounded-md bg-surface-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all pr-12`}
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
                                {errors.password && (
                                    <p className="mt-1 text-xs font-bold font-body text-status-red">{errors.password.message}</p>
                                )}
                            </div>

                            <div className={authState.needsProfileCompletion ? "hidden" : ""}>
                                <label htmlFor="confirmPassword" className="block text-sm font-bold font-body text-ink">Confirm password</label>
                                <div className="relative mt-1.5">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        {...register('confirmPassword')}
                                        className={`block w-full px-4 py-2.5 border-2 ${errors.confirmPassword ? 'border-status-red' : 'border-transparent'
                                            } rounded-md bg-surface-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all pr-12`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-accent transition-colors rounded-sm hover:bg-surface-3"
                                        tabIndex="-1"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="mt-1 text-xs font-bold font-body text-status-red">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-md shadow-card hover:shadow-hover hover:-translate-y-[2px] text-sm font-bold font-body text-white transition-all transform active:scale-98 ${
                                    isLoading ? 'bg-accent/50 cursor-not-allowed' : 'bg-accent'
                                }`}
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
