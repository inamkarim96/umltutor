import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Protected route component that redirects to login if user is not authenticated.
 * Passes the current location as `state.from` so LoginPage can redirect back after login.
 */
const ProtectedRoute = ({ children, requiredRole }) => {
    const { authState, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                    <p className="mt-4 text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    if (!authState.isAuthenticated) {
        // Send logged-out users to the public landing page.
        // Using `replace` prevents polluting browser history (Back button issues).
        return <Navigate to="/" replace />;
    }

    // Role-based access control
    if (requiredRole && authState?.user?.role !== requiredRole) {
        // Show unauthorized page instead of redirecting
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="text-center">
                    <h1 className="text-2xl font-bold font-body text-status-red mb-4">Unauthorized</h1>
                    <p className="text-muted mb-4">You don't have permission to access this page.</p>
                    <p className="text-sm text-muted">
                        Current role: {authState?.user?.role} | Required: {requiredRole}
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
