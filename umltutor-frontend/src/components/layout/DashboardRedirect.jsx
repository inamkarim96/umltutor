import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const DashboardRedirect = () => {
  const { authState } = useAuth();

  if (!authState.isAuthenticated || !authState.user) {
    return <Navigate to="/" replace />;
  }

  // Redirect based on user role
  if (authState.user.role === 'TEACHER') {
    return <Navigate to="/teacher/dashboard" replace />;
  } else if (authState.user.role === 'STUDENT') {
    return <Navigate to="/student/dashboard" replace />;
  } else {
    // Fallback to assignments if role is unknown
    return <Navigate to="/teacher/assignments" replace />;
  }
};

export default DashboardRedirect;
