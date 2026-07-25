import React from 'react';
import PracticeWorkbench from '../../components/practice/PracticeWorkbench';

const StudentPractice = ({ type }) => {
    const activeSection = type || 'usecase';

    return (
        <div className="min-h-screen bg-transparent p-6 md:p-10">
            <PracticeWorkbench
                activeSection={activeSection}
            />
        </div>
    );
};

export default StudentPractice;
