import React from 'react';
import { useSearchParams } from 'react-router-dom';
import PracticeWorkbench from '../../components/practice/PracticeWorkbench';

const StudentPractice = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeSection = searchParams.get('type') || 'usecase';

    const handleSectionChange = (newSection) => {
        setSearchParams({ type: newSection });
    };

    return (
        <div className="min-h-screen bg-transparent p-6 md:p-10">
            <PracticeWorkbench
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
            />
        </div>
    );
};

export default StudentPractice;
