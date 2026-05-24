import React from 'react';
import { CheckCircle2, Circle, Lock, Loader2, AlertCircle } from 'lucide-react';
import { TUTORIAL_STEPS, computeTutorialProgress, isStepUnlocked, normalizeTutorialStepId } from '../../features/tutorial/tutorialWorkflow';

const StepIcon = ({ status }) => {
  if (status === 'completed') {
    return <CheckCircle2 size={18} className="text-status-green shrink-0" aria-hidden />;
  }
  if (status === 'current') {
    return <Loader2 size={18} className="text-accent animate-spin shrink-0" aria-hidden />;
  }
  if (status === 'error') {
    return <AlertCircle size={18} className="text-status-red shrink-0" aria-hidden />;
  }
  if (status === 'locked') {
    return <Lock size={16} className="text-gray-300 shrink-0" aria-hidden />;
  }
  return <Circle size={16} className="text-gray-300 shrink-0" aria-hidden />;
};

const TutorialProgressSidebar = ({
  activeSection,
  completedSteps,
  validationByStep,
  onStepSelect,
  isMobile = false,
  onClose,
}) => {
  const progress = computeTutorialProgress(completedSteps);
  const currentId = normalizeTutorialStepId(activeSection);

  const getStepStatus = (stepId) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentId) {
      const v = validationByStep[stepId];
      if (v && !v.isValid) return 'error';
      return 'current';
    }
    if (!isStepUnlocked(stepId, completedSteps)) return 'locked';
    return 'available';
  };

  return (
    <aside
      className={`flex flex-col bg-white border border-black/5 rounded-2xl shadow-card overflow-hidden ${
        isMobile ? 'w-full' : 'w-full lg:w-72 xl:w-80 shrink-0'
      }`}
      aria-label="Tutorial progress"
    >
      <div className="p-5 border-b border-black/5 bg-gradient-to-br from-accent/5 to-white">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-extrabold font-heading uppercase tracking-[0.2em] text-accent">
            Learning Path
          </h3>
          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-bold text-muted uppercase tracking-widest hover:text-ink"
            >
              Close
            </button>
          )}
        </div>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-black font-heading text-ink">{progress.percent}%</span>
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
            {progress.completed}/{progress.total} steps
          </span>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {TUTORIAL_STEPS.map((step) => {
          const status = getStepStatus(step.id);
          const isActive = step.id === currentId;
          const locked = status === 'locked';
          const validation = validationByStep[step.id];

          return (
            <button
              key={step.id}
              type="button"
              disabled={locked}
              onClick={() => {
                if (locked) return;
                onStepSelect(step.id);
              }}
              title={locked ? 'Complete previous steps first' : undefined}
              className={`w-full text-left p-3 rounded-xl transition-all flex gap-3 items-start border-2 ${
                isActive
                  ? 'border-accent/30 bg-accent/5 shadow-sm'
                  : locked
                    ? 'border-transparent opacity-50 cursor-not-allowed'
                    : 'border-transparent hover:bg-surface-3/80'
              }`}
            >
              <StepIcon status={status === 'available' ? (isActive ? 'current' : 'pending') : status} />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted block">
                  Step {step.order}
                </span>
                <span className="text-sm font-extrabold font-heading text-ink block truncate">
                  {step.shortLabel}
                </span>
                {validation && !validation.isValid && isActive && (
                  <span className="text-[10px] text-status-red font-medium line-clamp-2 mt-0.5">
                    {validation.message}
                  </span>
                )}
                {status === 'completed' && (
                  <span className="text-[10px] text-status-green font-bold mt-0.5">Validated</span>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default TutorialProgressSidebar;
