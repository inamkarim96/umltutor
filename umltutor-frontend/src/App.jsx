import React from 'react';
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

import PageLoader from './components/ui/PageLoader';



// Eager load auth pages

import LoginPage from './features/auth/pages/LoginPage';

import RegisterPage from './features/auth/pages/RegisterPage';



import LandingPage from './pages/LandingPage';



// Student portal — eager loaded so layout navigation always swaps pages immediately

import StudentDashboard from './pages/student/StudentDashboard';

import StudentClasses from './pages/student/StudentClasses';

import StudentClassDetail from './pages/student/StudentClassDetail';

import StudentAssignmentsList from './pages/student/AssignmentsList';

import PendingAssignments from './pages/student/PendingAssignments';

import SubmittedAssignments from './pages/student/SubmittedAssignments';

import StudentPractice from './pages/student/StudentPractice';

import StudentSettings from './pages/student/StudentSettings';



// teacher portal - eager loaded so layout navigation always swaps pages immediately

import WorkspacePage from './pages/WorkspacePage';

import TeacherDashboard from './pages/teacher/TeacherDashboard';

import ClassesManagement from './pages/teacher/ClassesManagement';

import ClassDetail from './pages/teacher/ClassDetail';

import AllSubmissions from './pages/teacher/AllSubmissions';

import TeacherAssignmentsDashboard from './pages/teacher/AssignmentsDashboard';

import AssignmentSubmissions from './pages/teacher/AssignmentSubmissions';

import AssignmentReview from './pages/teacher/AssignmentReview';

import TutorialRequestsPage from './pages/teacher/TutorialRequestsPage';

import AssignmentDetails from './pages/AssignmentDetails';

import SubmissionDetail from './features/submissions/SubmissionDetail';





function AppRoutes() {

  const location = useLocation();

  const bgVariant = location.pathname.includes('/work') ? 'workspace' : 'default';



  return (

    <div className="app-root">

      <AnimatedPageBackground variant={bgVariant} />

      <div className="app-root-content">

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



          {/* Teacher Routes — auth guard → layout → page */}

          <Route

            path="/teacher"

            element={

              <ProtectedRoute requiredRole="TEACHER">

                <TeacherLayout />

              </ProtectedRoute>

            }

          >

            <Route index element={<Navigate to="dashboard" replace />} />

            <Route path="dashboard" element={<TeacherDashboard />} />

            <Route path="tutorial-requests" element={<TutorialRequestsPage />} />

            <Route path="assignments" element={<TeacherAssignmentsDashboard />} />

            <Route path="assignments/pending" element={<TeacherAssignmentsDashboard />} />

            <Route path="assignments/:titleSlug" element={<AssignmentDetails />} />

            <Route path="assignments/:titleSlug/submissions" element={<AssignmentSubmissions />} />

            <Route path="assignments/:titleSlug/review" element={<AssignmentReview />} />

            <Route path="classes" element={<ClassesManagement />} />

            <Route path="classes/:className" element={<ClassDetail />} />

            <Route path="submissions" element={<AllSubmissions />} />

            <Route path="submissions/:submissionId" element={<SubmissionDetail />} />

            <Route path="submissions/:assignmentName/:userName/:submissionId" element={<SubmissionDetail />} />

            <Route path="messages/:studentId" element={<TeacherAssignmentsDashboard />} />

            <Route path="settings" element={<StudentSettings />} />

          </Route>



          {/* Student Routes — auth guard → layout → page */}

          <Route

            path="/student"

            element={

              <ProtectedRoute requiredRole="STUDENT">

                <StudentLayout />

              </ProtectedRoute>

            }

          >

            <Route index element={<Navigate to="dashboard" replace />} />

            <Route path="dashboard" element={<StudentDashboard />} />

            <Route path="classes" element={<StudentClasses />} />

            <Route path="classes/:name" element={<StudentClassDetail />} />

            <Route path="assignments" element={<StudentAssignmentsList />} />

            <Route path="upcoming" element={<PendingAssignments />} />

            <Route path="assignments/pending" element={<PendingAssignments />} />

            <Route path="practice" element={<StudentPractice />} />

            <Route path="submitted" element={<SubmittedAssignments />} />

            <Route path="assignments/submitted" element={<SubmittedAssignments />} />

            <Route path="reviewed" element={<SubmittedAssignments />} />

            <Route path="assignments/reviewed" element={<SubmittedAssignments />} />

            <Route path="settings" element={<StudentSettings />} />

            <Route path="assignments/:titleSlug" element={<AssignmentDetails />} />

            <Route path="submissions/:submissionId/report" element={<SubmissionDetail />} />

          </Route>



          <Route

            path="/student/assignments/:titleSlug/work"

            element={

              <ProtectedRoute requiredRole="STUDENT">

                <Suspense fallback={<PageLoader />}>

                  <WorkspacePage mode="development" />

                </Suspense>

              </ProtectedRoute>

            }

          />



          {/* 404 Fallback */}

          <Route path="*" element={<NotFound />} />

        </Routes>

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

