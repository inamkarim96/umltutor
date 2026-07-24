import React, { Suspense, useEffect, useRef } from 'react';

import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from './Sidebar';

import PageLoader from '../ui/PageLoader';




const Layout = ({ role, navConfig, outletContext }) => {

    const location = useLocation();

    const mainRef = useRef(null);




    useEffect(() => {

        mainRef.current?.scrollTo(0, 0);

    }, [location.pathname]);




    return (

        <div className="sdb-layout">

            <Sidebar role={role} navConfig={navConfig} />

            <div className="sdb-main" ref={mainRef}>

                <div className="sdb-outlet">

                    <Suspense fallback={<PageLoader />}>

                        <Outlet context={outletContext} />

                    </Suspense>

                </div>

            </div>

        </div>

    );

};




export default Layout;


import React, { useState } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

import { useAppSelector } from '../../app/hooks';

import { selectUser } from '../../features/auth';

import SettingsPanel from '../shared/SettingsPanel';




const Sidebar = ({ role, navConfig }) => {

    const user = useAppSelector(selectUser);

    const { logout } = useAuth();

    const location = useLocation();




    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [isMobileOpen, setIsMobileOpen] = useState(false);




    const userName = user?.firstName && user?.lastName

        ? `${user.firstName} ${user.lastName}`

        : user?.firstName || user?.name || (role === 'TEACHER' ? 'Teacher' : 'Student');




    const userInitials = (

        (user?.firstName?.[0] || user?.name?.[0] || (role === 'TEACHER' ? 'T' : 'S')).toUpperCase() +

        (user?.lastName?.[0] || '').toUpperCase()

    );




    const isActive = (path, exact) => {

        if (!path) return false;

        const cleanPath = path.split('?')[0];

        if (exact) return location.pathname === cleanPath;

        return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + '/');

    };




    const isSubmenuActive = (submenu) =>

        submenu?.some(child => child.path && isActive(child.path, child.exact));




    const isDiagramSubmenuActive = (item) =>

        item.selectedDiagram && item.submenu?.some(child => child.diagramType === item.selectedDiagram);




    const closeMobile = () => setIsMobileOpen(false);




    const renderNavItem = (item, key) => {

        /* ── Submenu item – hover-driven via CSS ── */

        if (item.submenu) {

            const anyChildActive = isSubmenuActive(item.submenu) || isDiagramSubmenuActive(item) || (item.path && isActive(item.path, item.exact));

            return (

                <div key={key} className="sdb-submenu-wrapper">

                    <Link

                        to={item.path || item.submenu[0]?.path || '#'}

                        className={`sdb-sidebar-item sdb-submenu-trigger ${anyChildActive ? 'active' : ''}`}

                        aria-haspopup="true"

                        onClick={closeMobile}

                    >

                        {item.icon}

                        <span>{item.title}</span>

                        <svg className="sdb-chevron" viewBox="0 0 24 24">

                            <polyline points="6 9 12 15 18 9" />

                        </svg>

                    </Link>

                    <div className="sdb-submenu">

                        {item.submenu.map((child, cIdx) => {

                            if (child.path) {

                                return (

                                    <Link

                                        key={cIdx}

                                        to={child.path}

                                        className={`sdb-submenu-item ${isActive(child.path, child.exact) ? 'active' : ''}`}

                                        onClick={closeMobile}

                                    >

                                        {child.title}

                                    </Link>

                                );

                            }

                            return (

                                <button

                                    key={cIdx}

                                    type="button"

                                    className={`sdb-submenu-item ${item.selectedDiagram === child.diagramType ? 'active' : ''}`}

                                    onClick={() => {

                                        item.onSubmenuSelect?.(child.diagramType);

                                        closeMobile();

                                    }}

                                >

                                    {child.title}

                                </button>

                            );

                        })}

                    </div>

                </div>

            );

        }




        /* ── Action button ── */

        if (item.type === 'button') {

            return (

                <button

                    key={key}

                    type="button"

                    className="sdb-sidebar-item"

                    onClick={() => {

                        if (item.action === 'settings') setIsSettingsOpen(true);

                        else if (item.action === 'logout') logout();

                        else item.onClick?.();

                        closeMobile();

                    }}

                >

                    {item.icon}

                    <span>{item.title}</span>

                </button>

            );

        }




        /* ── Regular link ── */

        return (

            <Link

                key={key}

                to={item.path}

                className={`sdb-sidebar-item ${isActive(item.path, item.exact) ? 'active' : ''}`}

                onClick={closeMobile}

            >

                {item.icon}

                <span>{item.title}</span>

            </Link>

        );

    };




    const sidebarContent = (

        <>

            {/* ── Logo ── */}

            <Link

                to={role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard'}

                className="sdb-sidebar-logo"

                onClick={closeMobile}

            >

                <div className="sdb-sidebar-logo-icon">

                    <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h12M3 18h8" /><circle cx="19" cy="18" r="3" /></svg>

                </div>

                UMLTutor

            </Link>




            {/* ── Navigation ── */}

            <nav className="sdb-sidebar-nav">

                {navConfig.map((section, sIdx) => (

                    <React.Fragment key={sIdx}>

                        {section.label && (

                            <div className="sdb-sidebar-section-label">{section.label}</div>

                        )}

                        {section.items.map((item, iIdx) => renderNavItem(item, `${sIdx}-${iIdx}`))}

                    </React.Fragment>

                ))}

            </nav>




            {/* ── Bottom: User Profile & Utility Actions ── */}

            <div className="sdb-sidebar-bottom">

                <div className="sdb-sidebar-divider" />




                {/* User Profile */}

                <div className="sdb-sidebar-user">

                    <div className="sdb-sidebar-avatar">{userInitials}</div>

                    <div className="sdb-sidebar-user-info">

                        <div className="sdb-sidebar-user-name">{userName}</div>

                        <div className="sdb-sidebar-user-role">{role === 'TEACHER' ? 'Teacher' : 'Student'}</div>

                    </div>

                </div>




                {/* Settings */}

                <Link

                    to={role === 'TEACHER' ? '/teacher/settings' : '/student/settings'}

                    className={`sdb-sidebar-item sdb-util-btn ${isActive(role === 'TEACHER' ? '/teacher/settings' : '/student/settings') ? 'active' : ''}`}

                    onClick={closeMobile}

                >

                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>

                    <span>Settings</span>

                </Link>




                {/* Logout */}

                <button

                    type="button"

                    className="sdb-sidebar-item sdb-util-btn sdb-logout-btn"

                    onClick={() => { logout(); closeMobile(); }}

                >

                    <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>

                    <span>Log out</span>

                </button>

            </div>

        </>

    );




    return (

        <>

            {/* Mobile hamburger */}

            <button

                type="button"

                className="sdb-hamburger"

                onClick={() => setIsMobileOpen(true)}

                aria-label="Open navigation"

            >

                <svg viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18" /></svg>

            </button>




            {isMobileOpen && (

                <div className="sdb-sidebar-overlay" onClick={closeMobile} />

            )}




            <aside className={`sdb-sidebar ${isMobileOpen ? 'sdb-sidebar-open' : ''}`}>

                <button

                    type="button"

                    className="sdb-sidebar-close"

                    onClick={closeMobile}

                    aria-label="Close navigation"

                >

                    <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>

                </button>

                {sidebarContent}

            </aside>




            <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        </>

    );

};




export default Sidebar;import React, { useMemo } from 'react';

import Layout from './Layout';





const StudentLayout = () => {

    const navConfig = useMemo(() => [

        {

            items: [

                {

                    title: 'Dashboard',

                    path: '/student/dashboard',

                    exact: true,

                    icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>

                },

                {

                    title: 'My Classes',

                    path: '/student/classes',

                    exact: false,

                    icon: <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>

                },

                {

                    title: 'Assignments',

                    path: '/student/assignments',

                    exact: false,

                    icon: <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 12h6M9 16h4" /></svg>

                },

                {

                    title: 'Upcoming',

                    path: '/student/upcoming',

                    exact: false,

                    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>

                },

                {

                    title: 'Practice',

                    path: '/student/practice',

                    icon: <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,

                    submenu: [

                        { title: 'Use Case Diagram', path: '/student/practice?type=usecase' },

                        { title: 'Use Case Description', path: '/student/practice?type=description' },

                        { title: 'System Sequence Diagram', path: '/student/practice?type=ssd' },

                        { title: 'Class Diagram', path: '/student/practice?type=class-diagram' },

                        { title: 'Sequence Diagram', path: '/student/practice?type=sequence-diagram' },

                    ],

                },

                {

                    title: 'Submitted',

                    path: '/student/assignments/submitted',

                    exact: false,

                    icon: <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>

                },

                {

                    title: 'Reviewed',

                    path: '/student/assignments/reviewed',

                    exact: false,

                    icon: <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>

                },

            ]

        }

    ], []);




    return <Layout role="STUDENT" navConfig={navConfig} />;

};




export default StudentLayout;

import React, { useMemo, useEffect } from 'react';

import { useAppSelector, useAppDispatch } from '../../app/hooks';

import { useLocation, useNavigate } from 'react-router-dom';

import { selectUser } from '../../features/auth';

import { selectClasses, fetchClasses } from '../../features/classroom';

import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';

import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';




const StudentAssignmentsList = () => {

    const location = useLocation();

    const navigate = useNavigate();

    const user = useAppSelector(selectUser);

    const dispatch = useAppDispatch();




    const queryParams = new URLSearchParams(location.search);

    const filterClassId = queryParams.get('classId');




    const allClasses = useAppSelector(selectClasses);

    const assignments = useAppSelector(selectAllAssignments) || [];

    const submissionsMap = useAppSelector(selectSubmissions) || [];




    useEffect(() => {

        dispatch(fetchClasses('STUDENT'));

        dispatch(fetchAllAssignments('STUDENT'));

        dispatch(fetchMySubmissions());

    }, [dispatch]);




    const myClasses = (allClasses || []).filter(c => c.studentIds?.includes(user?.id) || c.students?.some(s => s.id === user?.id));

    const mySubmissions = submissionsMap;




    const filteredAssignments = useMemo(() => {

        let list = assignments.filter(a =>

            myClasses.some(c => c.id === a.classId)

        );




        if (filterClassId) {

            list = list.filter(a => a.classId === filterClassId);

        }




        return list;

    }, [assignments, myClasses, filterClassId]);




    const activeClass = filterClassId ? myClasses.find(c => c.id === filterClassId) : null;




    return (

        <div className="min-h-screen bg-transparent p-8 md:p-12">

            <div>

                {/* Header Section */}

                <div className="mb-12">

                    <div className="flex items-center gap-2 text-[10px] font-extrabold font-heading uppercase tracking-widest text-gray-400 mb-4">

                        <button onClick={() => navigate('/student/dashboard')} className="hover:text-accent transition-colors">Dashboard</button>

                        <span>/</span>

                        {activeClass ? (

                            <>

                                <button onClick={() => navigate(`/student/classes/${activeClass.id}`)} className="hover:text-accent transition-colors">{activeClass.name}</button>

                                <span>/</span>

                                <span className="text-ink">Assignments</span>

                            </>

                        ) : (

                            <span className="text-ink">All Assignments</span>

                        )}

                    </div>

                    <h1 className="text-4xl font-extrabold font-heading text-ink tracking-tight">

                        {activeClass ? activeClass.name : "Your Assignments"}

                        <span className="block text-lg font-medium text-muted mt-2 italic">

                            {activeClass ? `Manage tasks for ${activeClass.name}` : "Comprehensive list of all your academic tasks"}

                        </span>

                    </h1>

                </div>




                {/* Filter/Tabs */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">

                    {filteredAssignments.length > 0 ? (

                        filteredAssignments.map(asgn => {

                            const submission = mySubmissions.find(s => s.assignmentId === asgn.id);

                            const status = submission?.status?.toLowerCase();

                            const isSubmitted = status === 'submitted' || status === 'graded';

                            const isOverdue = asgn.deadline && new Date(asgn.deadline) < new Date() && !isSubmitted;




                            return (

                                <div

                                    key={asgn.id}

                                    onClick={() => navigate(`/student/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}/work`)}

                                    className="bg-white rounded-lg border border-black/5 shadow-card hover:shadow-hover hover:-translate-y-2 transition-all group flex flex-col h-full overflow-hidden relative"

                                >

                                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10/30 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>




                                    <div className="p-8 flex-1 relative z-10">

                                        <div className="flex justify-between items-start mb-6">

                                            <span className={`px-3 py-1 ${

                                                status === 'graded' ? 'bg-status-green/10 text-status-green border-emerald-100' : 

                                                isSubmitted ? 'bg-accent/10 text-accent border-accent/10' : 

                                                isOverdue ? 'bg-status-red/10 text-status-red border-red-100' : 

                                                'bg-blue-50 text-blue-600 border-blue-100'

                                            } text-[10px] font-extrabold font-heading rounded-lg uppercase tracking-widest border`}>

                                                {status === 'graded' ? 'Reviewed' : isSubmitted ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}

                                            </span>

                                            <span className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest bg-surface-3 px-2 py-1 rounded-lg">

                                                {myClasses.find(c => c.id === asgn.classId)?.code}

                                            </span>

                                        </div>

                                        <h3 className="text-xl font-extrabold font-heading text-ink mb-3 group-hover:text-accent transition-colors">{asgn.title}</h3>

                                        <p className="text-sm text-muted line-clamp-3 font-medium leading-relaxed">{asgn.description}</p>

                                    </div>




                                    <div className="px-8 py-6 bg-surface-3/50 border-t border-gray-50 flex justify-between items-center relative z-10">

                                        <div>

                                            <p className="text-[9px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Deadline</p>

                                            <p className="text-xs font-bold font-body text-gray-700">{asgn.deadline ? new Date(asgn.deadline).toLocaleDateString() : 'No Date'}</p>

                                        </div>

                                        {(submission?.score !== undefined && submission?.score !== null) ? (

                                            <div className="text-right">

                                                <p className="text-[9px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Grade</p>

                                                <p className="text-sm font-extrabold font-heading text-accent bg-accent/10 px-3 py-1 rounded-full">{submission.score}%</p>

                                            </div>

                                        ) : (

                                            <div className="text-right">

                                                <p className="text-[9px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Weight</p>

                                                <p className="text-sm font-extrabold font-heading text-gray-700">100 Pts</p>

                                            </div>

                                        )}

                                    </div>

                                </div>

                            );

                        })

                    ) : (

                        <div className="col-span-full py-20 text-center">

                            <div className="text-5xl mb-6">📄</div>

                            <h3 className="text-2xl font-bold font-body text-ink mb-2">No assignments found</h3>

                            <p className="text-gray-400">Take a break! There are no tasks waiting for you in this section.</p>

                        </div>

                    )}

                </div>

            </div>

        </div>

    );

};




export default StudentAssignmentsList;import React from 'react';

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






