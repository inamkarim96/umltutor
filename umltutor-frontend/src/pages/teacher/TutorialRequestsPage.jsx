import React from 'react';
import TutorialRequestsPanel from '../../features/teacher/components/TutorialRequestsPanel';

const TutorialRequestsPage = () => {
  return (
    <div className="min-h-screen bg-transparent p-8 md:p-12 font-body">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
          Tutorial Requests
          <span className="block text-base font-medium text-muted mt-2 italic">
            Review and manage pending tutorial requests from students.
          </span>
        </h1>
      </div>
      <TutorialRequestsPanel compact={false} showHeader />
    </div>
  );
};

export default TutorialRequestsPage;
