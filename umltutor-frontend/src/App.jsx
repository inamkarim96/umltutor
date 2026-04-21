import { BrowserRouter, Routes, Route, } from 'react-router-dom';
import { lazy, Suspense } from 'react';


import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import GlobalEventHandler from './components/shared/GlobalEventHandler';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardRedirect from './components/layout/DashboardRedirect';
import ErrorBoundary from './components/ui/ErrorBoundary';
import NotFound from './components/ui/NotFound';

// Eager load auth pages
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';

import LandingPage from './pages/LandingPage';

// Lazy load workspace and dashboard pages
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const ClassesManagement = lazy(() => import('./pages/teacher/ClassesManagement'));
const ClassDetail = lazy(() => import('./pages/teacher/ClassDetail'));

const AllSubmissions = lazy(() => import('./pages/teacher/AllSubmissions'));
const StudentAssignmentsList = lazy(() => import('./pages/student/AssignmentsList'));
const StudentClassDetail = lazy(() => import('./pages/student/StudentClassDetail'));
const StudentClasses = lazy(() => import('./pages/student/StudentClasses'));
const PendingAssignments = lazy(() => import('./pages/student/PendingAssignments'));
const SubmittedAssignments = lazy(() => import('./pages/student/SubmittedAssignments'));
const TeacherAssignmentsDashboard = lazy(() => import('./pages/teacher/AssignmentsDashboard'));
const AssignmentSubmissions = lazy(() => import('./pages/teacher/AssignmentSubmissions'));
const AssignmentReview = lazy(() => import('./pages/teacher/AssignmentReview'));
const AssignmentDetails = lazy(() => import('./pages/AssignmentDetails'));
const SubmissionDetail = lazy(() => import('./features/submissions/SubmissionDetail'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <GlobalEventHandler />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/signup" element={<RegisterPage />} />


                {/* Protected Routes - Require Authentication */}
                <Route
                  path="/student/dashboard"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/dashboard"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Redirect old dashboard path to role-based dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardRedirect />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/assignments"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <TeacherAssignmentsDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/assignments/:titleSlug"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <AssignmentDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/assignments/:titleSlug/submissions"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <AssignmentSubmissions />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/assignments/:titleSlug/review"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <AssignmentReview />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/assignments/pending"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <TeacherAssignmentsDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/classes"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <ClassesManagement />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/classes/:className"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <ClassDetail />
                    </ProtectedRoute>
                  }
                />



                <Route
                  path="/teacher/submissions"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <AllSubmissions />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/submissions/:submissionId"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <SubmissionDetail />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/submissions/:assignmentName/:userName/:submissionId"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <SubmissionDetail />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher/messages/:studentId"
                  element={
                    <ProtectedRoute requiredRole="TEACHER">
                      <TeacherAssignmentsDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/assignments"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <StudentAssignmentsList />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/classes"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <StudentClasses />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/assignments/pending"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <PendingAssignments />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/assignments/submitted"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <SubmittedAssignments />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/assignments/reviewed"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <SubmittedAssignments />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/classes/:name"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <StudentClassDetail />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/assignments/:titleSlug/work"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <WorkspacePage mode="development" />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/submissions/:submissionId/report"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <SubmissionDetail />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/assignments/:titleSlug"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <AssignmentDetails />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
