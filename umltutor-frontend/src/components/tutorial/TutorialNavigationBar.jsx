import React from 'react';
import { ArrowLeft, ArrowRight, Save, LogOut, PartyPopper } from 'lucide-react';

const TutorialNavigationBar = ({
  canProceed,
  isLastStep,
  isSaving,
  proceedTooltip,
  processLabel = 'Process',
  onPrevious,
  onProceed,
  onSave,
  onExit,
  showPrevious,
}) => (
  <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/5 px-4 md:px-6 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
    <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {showPrevious ? (
          <button
            type="button"
            onClick={onPrevious}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-black/10 text-xs font-extrabold font-heading text-ink hover:bg-surface-3 transition-colors"
          >
            <ArrowLeft size={14} /> Previous
          </button>
        ) : (
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-black/10 text-xs font-extrabold font-heading text-muted hover:text-ink hover:bg-surface-3 transition-colors"
          >
            <LogOut size={14} /> Exit Tutorial
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-accent/20 bg-accent/5 text-accent text-xs font-extrabold font-heading hover:bg-accent/10 disabled:opacity-50 transition-colors"
        >
          <Save size={14} />
          {isSaving ? 'Saving…' : 'Save Progress'}
        </button>
      </div>

      <div className="flex items-center gap-2 relative group">
        <button
          type="button"
          onClick={onProceed}
          disabled={!canProceed}
          title={!canProceed ? proceedTooltip : undefined}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-extrabold font-heading uppercase tracking-wider shadow-md transition-all ${
            canProceed
              ? 'bg-accent text-white hover:bg-indigo-700 hover:-translate-y-0.5'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLastStep ? (
            <>
              <PartyPopper size={16} /> {processLabel}
            </>
          ) : (
            <>
              {processLabel} <ArrowRight size={16} />
            </>
          )}
        </button>
        {!canProceed && (
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-64 p-2 text-[10px] font-medium text-white bg-ink rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50 hidden sm:block">
            {proceedTooltip}
          </span>
        )}
      </div>
    </div>
  </div>
);

export default TutorialNavigationBar;
