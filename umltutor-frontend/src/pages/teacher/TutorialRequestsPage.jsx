import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import TutorialRequestsPanel from '../../features/teacher/components/TutorialRequestsPanel';

const TutorialRequestsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-2 font-body">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-black/5 px-4 md:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/teacher/dashboard')}
            className="p-2.5 hover:bg-surface-3 rounded-lg text-muted hover:text-accent transition-colors border border-transparent hover:border-black/5"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-accent mb-0.5">
              <BookOpen size={16} />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Teacher</span>
            </div>
            <h1 className="text-xl font-extrabold font-heading text-ink">Tutorial Request Management</h1>
          </div>
          <Link
            to="/teacher/dashboard"
            className="ml-auto text-xs font-extrabold text-accent hover:underline uppercase tracking-widest hidden sm:block"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <TutorialRequestsPanel compact={false} showHeader />
      </div>
    </div>
  );
};

export default TutorialRequestsPage;
