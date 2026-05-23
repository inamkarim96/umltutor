import React from 'react';

const Section = ({ label, items, colorClass }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className={`text-[10px] font-extrabold font-heading uppercase tracking-[0.2em] ${colorClass}`}>{label}</div>
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={`${label}-${idx}`} className="p-4 rounded-lg border border-black/5 bg-white">
            <div className="text-sm font-bold font-body text-ink">{it.message}</div>
            {it.relatedId && <div className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mt-1">Ref: {it.relatedId}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const CheckReport = ({ title, data }) => {
  if (!data) return null;
  return (
    <div className="bg-white rounded-lg border border-black/5 shadow-card overflow-hidden">
      <div className="p-8 border-b border-gray-50 bg-surface-3/30 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em]">Checking Report</p>
          <h3 className="text-xl font-extrabold font-heading text-ink">{title}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest">Score</p>
          <p className="text-2xl font-extrabold font-heading text-accent">{data.score ?? 0}</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <Section label="Errors" items={data.errors} colorClass="text-status-red" />
        <Section label="Warnings" items={data.warnings} colorClass="text-amber-600" />
        <Section label="Suggestions" items={data.suggestions} colorClass="text-blue-600" />

        {(!data.errors || data.errors.length === 0) &&
          (!data.warnings || data.warnings.length === 0) &&
          (!data.suggestions || data.suggestions.length === 0) && (
            <div className="p-10 text-center text-gray-400 font-bold font-body italic">
              No issues found in this section.
            </div>
          )}
      </div>
    </div>
  );
};

export default CheckReport;

