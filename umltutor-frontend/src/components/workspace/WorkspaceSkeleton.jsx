import React from 'react';

/**
 * Loading skeleton for the assignment workspace — matches app design tokens.
 */
const WorkspaceSkeleton = () => (
  <div className="min-h-screen bg-white/80 backdrop-blur-sm font-body animate-pulse" aria-busy="true" aria-label="Loading workspace">
    {/* Mode banner */}
    <div className="h-9 bg-ink/10" />

    {/* Header */}
    <div className="bg-white border-b border-black/5 px-4 md:px-6 py-4">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-surface-3 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 md:w-64 bg-surface-3 rounded-md" />
            <div className="h-3 w-72 max-w-full bg-surface-3/70 rounded-md" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 bg-surface-3 rounded-lg" />
          ))}
        </div>
      </div>
    </div>

    {/* Tabs */}
    <div className="bg-white border-b border-black/5 px-4 md:px-6 pt-3 flex gap-3 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-10 w-36 bg-surface-3 rounded-t-lg shrink-0" />
      ))}
    </div>

    {/* Content */}
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="bg-white rounded-2xl shadow-card border border-black/5 p-4 h-[min(75vh,750px)]">
        <div className="h-full w-full bg-surface-3/50 rounded-xl" />
      </div>
    </div>
  </div>
);

export default WorkspaceSkeleton;
