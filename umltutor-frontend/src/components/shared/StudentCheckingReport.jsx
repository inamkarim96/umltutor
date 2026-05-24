import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const parseReport = (report) => {
  if (!report) return null;
  if (typeof report === 'string') {
    try {
      return JSON.parse(report);
    } catch {
      return null;
    }
  }
  return report;
};

const flattenIssues = (report) => {
  const parsed = parseReport(report);
  if (!parsed) return [];
  if (Array.isArray(parsed.issues)) return parsed.issues;
  const issues = [];
  Object.values(parsed).forEach((section) => {
    if (section && Array.isArray(section.issues)) {
      issues.push(...section.issues);
    }
  });
  return issues;
};

/**
 * Read-only checking report summary for students (after grading).
 */
const StudentCheckingReport = ({ report, className = '' }) => {
  const issues = useMemo(() => flattenIssues(report), [report]);
  const parsed = useMemo(() => parseReport(report), [report]);

  if (!parsed && issues.length === 0) {
    return (
      <div className={`p-6 rounded-xl border border-black/5 bg-surface-3/50 text-sm text-muted font-medium ${className}`}>
        No checking report is available yet. Your teacher may still be reviewing your work.
      </div>
    );
  }

  const errors = issues.filter((i) => i.severity === 'error' || i.type === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning' || i.type === 'warning');
  const info = issues.filter(
    (i) => i.severity === 'info' || i.severity === 'suggestion' || i.type === 'info'
  );

  const score =
    typeof parsed?.score === 'number'
      ? parsed.score
      : issues.length === 0
        ? 100
        : Math.max(0, 100 - errors.length * 10 - warnings.length * 5);

  return (
    <div className={`rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-extrabold font-heading text-indigo-700 uppercase tracking-[0.2em]">
            Checking Report
          </h4>
          <p className="text-[11px] text-indigo-600/80 font-medium mt-0.5">
            Automated UML consistency review from your teacher
          </p>
        </div>
        <div className="text-center px-4 py-2 bg-white rounded-lg border border-indigo-100 shadow-sm">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Model score</p>
          <p className="text-2xl font-black text-indigo-700">{Math.round(score)}%</p>
        </div>
      </div>

      <div className="px-6 py-3 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-wider">
        <span className="flex items-center gap-1 text-red-700">
          <AlertTriangle size={14} /> {errors.length} errors
        </span>
        <span className="flex items-center gap-1 text-amber-700">
          <AlertTriangle size={14} /> {warnings.length} warnings
        </span>
        <span className="flex items-center gap-1 text-indigo-600">
          <Info size={14} /> {info.length} suggestions
        </span>
        {issues.length === 0 && (
          <span className="flex items-center gap-1 text-emerald-700">
            <CheckCircle2 size={14} /> No issues found
          </span>
        )}
      </div>

      {issues.length > 0 && (
        <ul className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-indigo-100/80">
          {issues.slice(0, 25).map((issue, idx) => (
            <li key={issue.id || idx} className="px-6 py-3 text-sm bg-white/60">
              <span
                className={`inline-block text-[9px] font-extrabold uppercase tracking-widest mb-1 ${
                  issue.severity === 'error'
                    ? 'text-red-600'
                    : issue.severity === 'warning'
                      ? 'text-amber-600'
                      : 'text-indigo-500'
                }`}
              >
                {issue.severity || issue.type || 'note'}
              </span>
              <p className="text-ink font-medium leading-snug">{issue.message}</p>
            </li>
          ))}
          {issues.length > 25 && (
            <li className="px-6 py-2 text-xs text-muted italic">
              + {issues.length - 25} more items — open the workspace and use Checking Mode for the full report.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default StudentCheckingReport;
