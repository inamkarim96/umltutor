import React from 'react';
import { CheckCircle2, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react';

const TutorialValidationPanel = ({
  stepMeta,
  validation,
  isValidating,
  onValidate,
}) => {
  const passed = validation?.isValid === true;
  const failed = validation && validation.isValid === false;

  return (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5 flex flex-wrap items-center justify-between gap-3 bg-surface-3/30">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-accent" />
          <div>
            <h4 className="text-sm font-extrabold font-heading text-ink">Step Validation</h4>
            <p className="text-[10px] text-muted font-medium">{stepMeta?.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onValidate}
          disabled={isValidating}
          className="px-4 py-2 text-[10px] font-extrabold font-heading uppercase tracking-widest rounded-lg border border-accent/20 text-accent bg-accent/5 hover:bg-accent/10 disabled:opacity-50 transition-colors"
        >
          {isValidating ? 'Checking…' : 'Run Check'}
        </button>
      </div>

      <div className="p-5">
        {!validation && !isValidating && (
          <div className="flex items-start gap-3 text-muted">
            <Sparkles size={20} className="text-accent shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">
              Complete the diagram, then run <strong className="text-ink">Run Check</strong>. When validation passes,
              the <strong className="text-ink">Process</strong> button unlocks to move to the next step.
            </p>
          </div>
        )}

        {isValidating && (
          <p className="text-sm font-medium text-muted animate-pulse">Validating your work…</p>
        )}

        {passed && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-100 animate-in fade-in duration-300">
            <CheckCircle2 size={22} className="text-status-green shrink-0" />
            <div>
              <p className="text-sm font-extrabold font-heading text-green-900">Validation passed</p>
              <p className="text-xs text-green-800 mt-1 font-medium">{validation.message}</p>
            </div>
          </div>
        )}

        {failed && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 animate-in fade-in duration-300">
            <AlertTriangle size={22} className="text-status-red shrink-0" />
            <div>
              <p className="text-sm font-extrabold font-heading text-red-900">Fix issues to continue</p>
              <p className="text-xs text-red-800 mt-1 font-medium leading-relaxed">{validation.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorialValidationPanel;
