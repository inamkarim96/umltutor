import React, { useState } from 'react';
import { Menu, X, BookOpen } from 'lucide-react';
import TutorialProgressSidebar from './TutorialProgressSidebar';
import TutorialValidationPanel from './TutorialValidationPanel';
import TutorialNavigationBar from './TutorialNavigationBar';
import { getStepById } from '../../features/tutorial/tutorialWorkflow';

/**
 * Layout shell for guided tutorial mode: progress sidebar, validation panel, editor, navigation.
 */
const TutorialWorkspaceShell = ({
  activeSection,
  completedSteps,
  validationByStep,
  currentValidation,
  isValidating,
  canProceed,
  isLastStep,
  isSaving,
  proceedTooltip,
  onStepSelect,
  onValidate,
  onPrevious,
  onProceed,
  onSave,
  onExit,
  showPrevious,
  children,
  headerExtras,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const stepMeta = getStepById(activeSection);

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      <div className="px-4 md:px-6 py-4 border-b border-black/5 bg-gradient-to-r from-white via-accent/[0.03] to-white">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg border border-black/10 text-ink"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open progress"
            >
              <Menu size={20} />
            </button>
            <div className="w-11 h-11 rounded-xl bg-status-green/10 text-status-green flex items-center justify-center">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-status-green">
                Tutorial Mode
              </p>
              <h2 className="text-lg md:text-xl font-black font-heading text-ink tracking-tight">
                Step {stepMeta.order}: {stepMeta.label}
              </h2>
            </div>
          </div>
          {headerExtras}
        </div>
      </div>

      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 md:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="hidden lg:block">
          <TutorialProgressSidebar
            activeSection={activeSection}
            completedSteps={completedSteps}
            validationByStep={validationByStep}
            onStepSelect={onStepSelect}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <TutorialValidationPanel
            stepMeta={stepMeta}
            validation={currentValidation}
            isValidating={isValidating}
            onValidate={onValidate}
          />

          <div className="flex-1 min-h-[520px] md:min-h-[640px] bg-white rounded-2xl shadow-card border border-black/5 overflow-hidden flex flex-col">
            {children}
          </div>
        </div>
      </div>

      <TutorialNavigationBar
        canProceed={canProceed}
        isLastStep={isLastStep}
        isSaving={isSaving}
        proceedTooltip={proceedTooltip}
        onPrevious={onPrevious}
        onProceed={onProceed}
        onSave={onSave}
        onExit={onExit}
        showPrevious={showPrevious}
      />

      {sidebarOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close overlay"
          />
          <div className="absolute left-0 top-0 bottom-0 w-[min(100%,320px)] p-4 bg-surface animate-in slide-in-from-left">
            <div className="flex justify-end mb-2">
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-white">
                <X size={20} />
              </button>
            </div>
            <TutorialProgressSidebar
              activeSection={activeSection}
              completedSteps={completedSteps}
              validationByStep={validationByStep}
              onStepSelect={(id) => {
                onStepSelect(id);
                setSidebarOpen(false);
              }}
              isMobile
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorialWorkspaceShell;
