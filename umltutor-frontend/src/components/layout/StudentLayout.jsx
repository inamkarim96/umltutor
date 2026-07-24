import React, { useMemo } from 'react';
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
