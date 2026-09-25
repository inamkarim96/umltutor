import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SettingsPanel from '../../components/shared/SettingsPanel';
import PageShell from '../../components/dashboard/PageShell';
import { Settings } from 'lucide-react';

const StudentSettings = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isTeacher = location.pathname.startsWith('/teacher');
    const fallbackDashboard = isTeacher ? '/teacher/dashboard' : '/student/dashboard';

    return (
        <PageShell
            title="Account Settings"
            subtitle="Manage your profile information, password, and notification preferences"
            icon={<Settings size={24} />}
            backPath={fallbackDashboard}
            breadcrumbs={[{ label: 'Settings' }]}
        >
            <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                <SettingsPanel isOpen={true} onClose={() => navigate(fallbackDashboard)} />
            </div>
        </PageShell>
    );
};

export default StudentSettings;
