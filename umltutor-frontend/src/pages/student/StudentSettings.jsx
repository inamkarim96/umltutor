import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SettingsPanel from '../../components/shared/SettingsPanel';

const StudentSettings = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isTeacher = location.pathname.startsWith('/teacher');
    const fallbackDashboard = isTeacher ? '/teacher/dashboard' : '/student/dashboard';

    return (
        <div className="min-h-screen bg-transparent p-6 md:p-10">
            <div className="mb-6">
                <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">Account Settings</h1>
                <p className="text-muted text-sm mt-1">Manage your account preferences, password, and notifications.</p>
            </div>
            <SettingsPanel isOpen={true} onClose={() => navigate(fallbackDashboard)} />
        </div>
    );
};

export default StudentSettings;
