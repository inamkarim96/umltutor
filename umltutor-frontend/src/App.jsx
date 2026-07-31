import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter, matchPath } from 'react-router-dom';
import AnimatedPageBackground from './components/shared/AnimatedPageBackground';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import GlobalEventHandler from './components/shared/GlobalEventHandler';
import ErrorBoundary from './components/ui/ErrorBoundary';
import NotFound from './components/ui/NotFound';
import PageLoader from './components/ui/PageLoader';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClasses from './pages/student/StudentClasses';
import StudentClassDetail from './pages/student/StudentClassDetail';
import StudentAssignmentsList from './pages/student/AssignmentsList';
import PendingAssignments from './pages/student/PendingAssignments';
import SubmittedAssignments from './pages/student/SubmittedAssignments';
import StudentPractice from './pages/student/StudentPractice';
import StudentSettings from './pages/student/StudentSettings';
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
import Layout from './components/layout/Layout';

const studentNavConfig = [{
  items: [
    { title: 'Dashboard', path: '/student/dashboard', exact: true, icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
    { title: 'My Classes', path: '/student/classes', exact: false, icon: <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg> },
    { title: 'Assignments', path: '/student/assignments', exact: false, icon: <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 12h6M9 16h4" /></svg> },
    { title: 'Upcoming', path: '/student/upcoming', exact: false, icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { title: 'Practice', path: '/student/practice', icon: <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>, submenu: [
      { title: 'Use Case Diagram', path: '/student/practice?type=usecase' },
      { title: 'Use Case Description', path: '/student/practice?type=description' },
      { title: 'System Sequence Diagram', path: '/student/practice?type=ssd' },
      { title: 'Class Diagram', path: '/student/practice?type=class-diagram' },
      { title: 'Sequence Diagram', path: '/student/practice?type=sequence-diagram' },
    ] },
    { title: 'Submitted', path: '/student/assignments/submitted', exact: false, icon: <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { title: 'Reviewed', path: '/student/assignments/reviewed', exact: false, icon: <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg> },
  ]
}];

const teacherNavConfig = [{
  items: [
    { title: 'Dashboard', path: '/teacher/dashboard', exact: true, icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
    { title: 'My Classes', path: '/teacher/classes', exact: false, icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
    { title: 'Assignments', path: '/teacher/assignments', exact: false, icon: <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 12h6M9 16h4" /></svg> },
    { title: 'Submissions', path: '/teacher/submissions', exact: false, icon: <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { title: 'Tutorial Requests', path: '/teacher/tutorial-requests', exact: false, icon: <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg> },
    { title: 'Management', icon: <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>, submenu: [
      { title: 'Create Class', path: '/teacher/classes' },
      { title: 'Create Assignment', path: '/teacher/assignments' },
    ] },
  ]
}];

const ROUTES = [
  { pattern: '/', page: 'landing' },
  { pattern: '/login', page: 'login' },
  { pattern: '/register', page: 'register' },
  { pattern: '/signup', page: 'register' },
  { pattern: '/dashboard', page: 'dashboard-redirect' },
  { pattern: '/teacher', page: 'teacher-dashboard' },
  { pattern: '/teacher/dashboard', page: 'teacher-dashboard' },
  { pattern: '/teacher/tutorial-requests', page: 'teacher-tutorial-requests' },
  { pattern: '/teacher/assignments', page: 'teacher-assignments' },
  { pattern: '/teacher/assignments/pending', page: 'teacher-assignments' },
  { pattern: '/teacher/assignments/:titleSlug', page: 'teacher-assignment-detail' },
  { pattern: '/teacher/assignments/:titleSlug/submissions', page: 'teacher-assignment-submissions' },
  { pattern: '/teacher/assignments/:titleSlug/review', page: 'teacher-assignment-review' },
  { pattern: '/teacher/classes', page: 'teacher-classes' },
  { pattern: '/teacher/classes/:className', page: 'teacher-class-detail' },
  { pattern: '/teacher/submissions', page: 'teacher-submissions' },
  { pattern: '/teacher/submissions/:submissionId', page: 'teacher-submission-detail' },
  { pattern: '/teacher/submissions/:assignmentName/:userName/:submissionId', page: 'teacher-submission-detail' },
  { pattern: '/teacher/messages/:studentId', page: 'teacher-messages' },
  { pattern: '/teacher/settings', page: 'teacher-settings' },
  { pattern: '/student', page: 'student-dashboard' },
  { pattern: '/student/dashboard', page: 'student-dashboard' },
  { pattern: '/student/classes', page: 'student-classes' },
  { pattern: '/student/classes/:name', page: 'student-class-detail' },
  { pattern: '/student/assignments', page: 'student-assignments' },
  { pattern: '/student/upcoming', page: 'student-upcoming' },
  { pattern: '/student/assignments/pending', page: 'student-upcoming' },
  { pattern: '/student/practice', page: 'student-practice' },
  { pattern: '/student/submitted', page: 'student-submitted' },
  { pattern: '/student/assignments/submitted', page: 'student-submitted' },
  { pattern: '/student/reviewed', page: 'student-reviewed' },
  { pattern: '/student/assignments/reviewed', page: 'student-reviewed' },
  { pattern: '/student/settings', page: 'student-settings' },
  { pattern: '/student/assignments/:titleSlug', page: 'student-assignment-detail' },
  { pattern: '/student/submissions/:submissionId/report', page: 'student-submission-report' },
  { pattern: '/student/assignments/:titleSlug/work', page: 'workspace' },
];

function getSearchParam(key) {
  const m = window.location.search.match(new RegExp('[?&]' + key + '=([^&]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function matchRoute(pathname) {
  for (const route of ROUTES) {
    const m = matchPath(route.pattern, pathname);
    if (m) return { page: route.page, params: m.params, type: getSearchParam('type') };
  }
  return { page: 'not-found', params: {}, type: null };
}

function AppContent() {
  const { authState, isLoading } = useAuth();
  const [pageInfo, setPageInfo] = useState(() => matchRoute(window.location.pathname));
  const { page, type } = pageInfo;

  useEffect(() => {
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    window.history.pushState = function (...args) {
      origPush.apply(this, args);
      setPageInfo(matchRoute(window.location.pathname));
    };
    window.history.replaceState = function (...args) {
      origReplace.apply(this, args);
      setPageInfo(matchRoute(window.location.pathname));
    };
    const onPop = () => setPageInfo(matchRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  const bgVariant = page === 'workspace' ? 'workspace' : 'default';

  const needsLayout = page.startsWith('student-') || page.startsWith('teacher-');
  const isTeacher = page.startsWith('teacher-');
  const navConfig = isTeacher ? teacherNavConfig : studentNavConfig;
  const role = isTeacher ? 'TEACHER' : 'STUDENT';

  function renderPage() {
    switch (page) {
      case 'landing': return <LandingPage />;
      case 'login': return <LoginPage />;
      case 'register': return <RegisterPage />;
      case 'dashboard-redirect': return <div>Redirecting...</div>;
      case 'student-dashboard': return <StudentDashboard />;
      case 'student-classes': return <StudentClasses />;
      case 'student-class-detail': return <StudentClassDetail />;
      case 'student-assignments': return <StudentAssignmentsList />;
      case 'student-upcoming': return <PendingAssignments />;
      case 'student-practice': return <StudentPractice type={type} />;
      case 'student-submitted': return <SubmittedAssignments />;
      case 'student-reviewed': return <SubmittedAssignments />;
      case 'student-settings': return <StudentSettings />;
      case 'student-assignment-detail': return <AssignmentDetails />;
      case 'student-submission-report': return <SubmissionDetail />;
      case 'teacher-dashboard': return <TeacherDashboard />;
      case 'teacher-tutorial-requests': return <TutorialRequestsPage />;
      case 'teacher-assignments': return <TeacherAssignmentsDashboard />;
      case 'teacher-assignment-detail': return <AssignmentDetails />;
      case 'teacher-assignment-submissions': return <AssignmentSubmissions />;
      case 'teacher-assignment-review': return <AssignmentReview />;
      case 'teacher-classes': return <ClassesManagement />;
      case 'teacher-class-detail': return <ClassDetail />;
      case 'teacher-submissions': return <AllSubmissions />;
      case 'teacher-submission-detail': return <SubmissionDetail />;
      case 'teacher-messages': return <TeacherAssignmentsDashboard />;
      case 'teacher-settings': return <StudentSettings />;
      case 'workspace': return <Suspense fallback={<PageLoader />}><WorkspacePage mode="development" /></Suspense>;
      default: return <NotFound />;
    }
  }

  if (isLoading) {
    return (
      <div className="app-root">
        <AnimatedPageBackground variant={bgVariant} />
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="app-root">
      <AnimatedPageBackground variant={bgVariant} />
      <div className="app-root-content" key={page}>
        {needsLayout ? (
          <Layout role={role} navConfig={navConfig}>{renderPage()}</Layout>
        ) : renderPage()}
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <GlobalEventHandler />
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
