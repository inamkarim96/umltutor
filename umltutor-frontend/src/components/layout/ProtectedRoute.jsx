import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { authState, isLoading } = useAuth();

    if (isLoading && !authState.user) {
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
        return <Navigate to="/" replace />;
    }

    if (requiredRole && authState?.user?.role !== requiredRole) {
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
