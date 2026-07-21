import React from 'react';
import Layout from './Layout';



const TeacherLayout = () => {
    const navConfig = [
        {
            items: [
                {
                    title: 'Dashboard',
                    path: '/teacher/dashboard',
                    exact: true,
                    icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                },
                {
                    title: 'My Classes',
                    path: '/teacher/classes',
                    exact: false,
                    icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                },
                {
                    title: 'Assignments',
                    path: '/teacher/assignments',
                    exact: false,
                    icon: <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 12h6M9 16h4" /></svg>
                },
                {
                    title: 'Submissions',
                    path: '/teacher/submissions',
                    exact: false,
                    icon: <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                },
                {
                    title: 'Tutorial Requests',
                    path: '/teacher/tutorial-requests',
                    exact: false,
                    icon: <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                },
                {
                    title: 'Management',
                    icon: <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
                    submenu: [
                        { title: 'Create Class', path: '/teacher/classes' },
                        { title: 'Create Assignment', path: '/teacher/assignments' },
                    ],
                },
            ]
        }
    ];

    return <Layout role="TEACHER" navConfig={navConfig} />;
};

export default TeacherLayout;
