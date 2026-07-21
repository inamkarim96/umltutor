import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../../../types/auth';
import { useErrorToast } from '../../../components/ui/Toast';
import { Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';

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
        <div className="sdb-auth-container">
            <div className="sdb-auth-card">
                <div className="sdb-auth-header">
                    <h2 className="sdb-auth-title">Join UML Tutor</h2>
                    <p className="sdb-auth-subtitle">
                        Already have an account?{' '}
                        <Link to="/login" className="sdb-auth-link">
                            Sign in instead
                        </Link>
                    </p>
                </div>

                <div className="sdb-form-container">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        {errorMessage && (
                            <div className="sdb-form-alert sdb-form-alert-error">
                                <AlertCircle size={20} />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="sdb-form-group-container">
                            <div className="sdb-form-grid">
                                <div className="sdb-form-group">
                                    <label htmlFor="firstName" className="sdb-form-label">First name</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        {...register('firstName')}
                                        className={`sdb-form-input ${errors.firstName ? 'sdb-form-input-error' : ''}`}
                                        placeholder="First"
                                    />
                                    {errors.firstName && <p className="sdb-form-error-text">{errors.firstName.message}</p>}
                                </div>

                                <div className="sdb-form-group">
                                    <label htmlFor="lastName" className="sdb-form-label">Last name</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        {...register('lastName')}
                                        className={`sdb-form-input ${errors.lastName ? 'sdb-form-input-error' : ''}`}
                                        placeholder="Last"
                                    />
                                    {errors.lastName && <p className="sdb-form-error-text">{errors.lastName.message}</p>}
                                </div>
                            </div>

                            <div className="sdb-form-group">
                                <label htmlFor="email" className="sdb-form-label">Email address</label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    {...register('email')}
                                    className={`sdb-form-input ${errors.email ? 'sdb-form-input-error' : ''}`}
                                    placeholder="you@example.com"
                                />
                                {errors.email && <p className="sdb-form-error-text">{errors.email.message}</p>}
                            </div>

                            <div className="sdb-form-group">
                                <label htmlFor="role" className="sdb-form-label">I am a</label>
                                <select
                                    id="role"
                                    {...register('role')}
                                    className={`sdb-form-input ${errors.role ? 'sdb-form-input-error' : ''}`}
                                >
                                    <option value="">Select your role</option>
                                    <option value={UserRole.STUDENT}>Student</option>
                                    <option value={UserRole.TEACHER}>Teacher</option>
                                </select>
                                {errors.role && <p className="sdb-form-error-text">{errors.role.message}</p>}
                            </div>

                            <div className={`sdb-form-group ${authState.needsProfileCompletion ? "hidden" : ""}`}>
                                <label htmlFor="password" className="sdb-form-label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
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

                            <div className={`sdb-form-group ${authState.needsProfileCompletion ? "hidden" : ""}`}>
                                <label htmlFor="confirmPassword" className="sdb-form-label">Confirm password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        {...register('confirmPassword')}
                                        className={`sdb-form-input ${errors.confirmPassword ? 'sdb-form-input-error' : ''}`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
                                        tabIndex="-1"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="sdb-form-error-text">{errors.confirmPassword.message}</p>}
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="sdb-form-submit"
                            >
                                {isLoading ? (
                                    <span style={{ display: 'flex', alignItems: 'center' }}>
                                        <RefreshCw size={20} className="animate-spin" style={{ marginRight: '8px' }} />
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
