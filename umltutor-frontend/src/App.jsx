import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AnimatedPageBackground from './components/shared/AnimatedPageBackground';


import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import GlobalEventHandler from './components/shared/GlobalEventHandler';
import ProtectedRoute from './components/layout/ProtectedRoute';
import StudentLayout from './components/layout/StudentLayout';
import TeacherLayout from './components/layout/TeacherLayout';
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
const StudentPractice = lazy(() => import('./pages/student/StudentPractice'));
const StudentSettings = lazy(() => import('./pages/student/StudentSettings'));
const TeacherAssignmentsDashboard = lazy(() => import('./pages/teacher/AssignmentsDashboard'));
const AssignmentSubmissions = lazy(() => import('./pages/teacher/AssignmentSubmissions'));
const AssignmentReview = lazy(() => import('./pages/teacher/AssignmentReview'));
const TutorialRequestsPage = lazy(() => import('./pages/teacher/TutorialRequestsPage'));
const AssignmentDetails = lazy(() => import('./pages/AssignmentDetails'));
const SubmissionDetail = lazy(() => import('./features/submissions/SubmissionDetail'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-transparent">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
      <p className="mt-4 text-muted">Loading...</p>
    </div>
  </div>
);

function AppRoutes() {
  const location = useLocation();
  const bgVariant = location.pathname.includes('/work') ? 'workspace' : 'default';

  return (
    <div className="app-root">
      <AnimatedPageBackground variant={bgVariant} />
      <div className="app-root-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/signup" element={<RegisterPage />} />

                {/* Redirect old dashboard path to role-based dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardRedirect />
                    </ProtectedRoute>
                  }
                />

                {/* Teacher Routes */}
                <Route element={<ProtectedRoute requiredRole="TEACHER" />}>
                  <Route element={<TeacherLayout />}>
                    <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
                    <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                    <Route path="/teacher/tutorial-requests" element={<TutorialRequestsPage />} />
                    <Route path="/teacher/assignments" element={<TeacherAssignmentsDashboard />} />
                    <Route path="/teacher/assignments/pending" element={<TeacherAssignmentsDashboard />} />
                    <Route path="/teacher/assignments/:titleSlug" element={<AssignmentDetails />} />
                    <Route path="/teacher/assignments/:titleSlug/submissions" element={<AssignmentSubmissions />} />
                    <Route path="/teacher/assignments/:titleSlug/review" element={<AssignmentReview />} />
                    <Route path="/teacher/classes" element={<ClassesManagement />} />
                    <Route path="/teacher/classes/:className" element={<ClassDetail />} />
                    <Route path="/teacher/submissions" element={<AllSubmissions />} />
                    <Route path="/teacher/submissions/:submissionId" element={<SubmissionDetail />} />
                    <Route path="/teacher/submissions/:assignmentName/:userName/:submissionId" element={<SubmissionDetail />} />
                    <Route path="/teacher/messages/:studentId" element={<TeacherAssignmentsDashboard />} />
                  </Route>
                </Route>

                {/* Student Routes */}
                <Route element={<ProtectedRoute requiredRole="STUDENT" />}>
                  <Route element={<StudentLayout />}>
                    <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
                    <Route path="/student/dashboard" element={<StudentDashboard />} />
                    <Route path="/student/classes" element={<StudentClasses />} />
                    <Route path="/student/classes/:name" element={<StudentClassDetail />} />
                    <Route path="/student/assignments" element={<StudentAssignmentsList />} />
                    <Route path="/student/upcoming" element={<PendingAssignments />} />
                    <Route path="/student/assignments/pending" element={<PendingAssignments />} />
                    <Route path="/student/practice" element={<StudentPractice />} />
                    <Route path="/student/submitted" element={<SubmittedAssignments />} />
                    <Route path="/student/assignments/submitted" element={<SubmittedAssignments />} />
                    <Route path="/student/reviewed" element={<SubmittedAssignments />} />
                    <Route path="/student/assignments/reviewed" element={<SubmittedAssignments />} />
                    <Route path="/student/settings" element={<StudentSettings />} />
                    <Route path="/student/assignments/:titleSlug" element={<AssignmentDetails />} />
                    <Route path="/student/submissions/:submissionId/report" element={<SubmissionDetail />} />
                  </Route>
                </Route>

                <Route
                  path="/student/assignments/:titleSlug/work"
                  element={
                    <ProtectedRoute requiredRole="STUDENT">
                      <WorkspacePage mode="development" />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Fallback */}
                <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <GlobalEventHandler />
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
