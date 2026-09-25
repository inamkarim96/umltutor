import React from 'react';
import PracticeWorkbench from '../../components/practice/PracticeWorkbench';
import PageShell from '../../components/dashboard/PageShell';
import { Layers } from 'lucide-react';

const StudentPractice = ({ type }) => {
    const activeSection = type || 'usecase';

    return (
        <PageShell
            title="UML Practice Workbench"
            subtitle="Interactive sandbox to model, experiment, and refine diagrams across all 5 UML phases"
            icon={<Layers size={24} />}
            backPath="/student/dashboard"
            breadcrumbs={[{ label: 'Practice Workbench' }]}
        >
            <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
                <PracticeWorkbench activeSection={activeSection} />
            </div>
        </PageShell>
    );
};

export default StudentPractice;
