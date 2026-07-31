import React from 'react';

const CallMessageIcon = () => (
    <svg width="28" height="14" viewBox="0 0 28 14" className="shrink-0">
        <line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth={2} />
        <polygon points="28,7 18,2 18,12" fill="currentColor" />
    </svg>
);

const ReturnMessageIcon = () => (
    <svg width="28" height="14" viewBox="0 0 28 14" className="shrink-0">
        <line x1="10" y1="7" x2="28" y2="7" stroke="currentColor" strokeWidth={2} strokeDasharray="4 3" />
        <polyline points="10,2 0,7 10,12" fill="none" stroke="currentColor" strokeWidth={2} />
    </svg>
);

const SelfMessageIcon = () => (
    <svg width="28" height="20" viewBox="0 0 28 20" className="shrink-0">
        <path d="M 14 2 Q 24 2, 24 8 L 24 12 Q 24 18, 14 18" fill="none" stroke="currentColor" strokeWidth={2} />
        <polygon points="14,18 18,15 18,21" fill="currentColor" />
    </svg>
);

const CreateMessageIcon = () => (
    <svg width="28" height="14" viewBox="0 0 28 14" className="shrink-0">
        <line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth={2} />
        <polygon points="28,7 18,2 18,12" fill="currentColor" />
    </svg>
);

const ActivationIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
        <rect x="2" y="4" width="4" height="12" fill="currentColor" />
    </svg>
);

const SSDToolbar = ({
    onAddActor,
    onAddSystem,
    onAddObject,
    onDelete,
    onAddActivation,
    hasSelection,
    onClearAll,
    activeTool,
    onCreateCall,
    onCreateReturn,
    onCreateSelf,
    ucdSteps = [],
    onAddFromStep,
    isReadOnly = false
}) => {
    if (isReadOnly) return null;

    console.log('Toolbar hasSelection:', hasSelection);
    console.log('Toolbar selectedElement exists:', !!hasSelection);
    return (
        <div className="absolute top-20 right-4 flex flex-col gap-3 p-3 bg-white rounded-lg shadow-hover z-20 border border-black/10 w-56 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div>
                <div className="flex items-center justify-between mb-2 text-muted">
                    <div className="text-xs font-bold font-body uppercase tracking-wider">Lifelines</div>
                </div>
                <div className="flex flex-col gap-1">
                    <button
                        onClick={onAddActor}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onAddActor();
                            }
                        }}
                        tabIndex={0}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-3 hover:bg-blue-50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        👤 Actor
                    </button>
                    <button
                        onClick={onAddSystem}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onAddSystem();
                            }
                        }}
                        tabIndex={0}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-3 hover:bg-status-green/10 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        🖥️ System
                    </button>
                    <button
                        onClick={() => {
                            alert("Objects are not allowed in System Sequence Diagrams (Step 3). System Sequence Diagrams model interactions between Actors and the System ONLY. Internal Object entities belong in Step 5 (Sequence Diagram).");
                        }}
                        tabIndex={0}
                        title="Objects belong in Step 5 (Sequence Diagram)"
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-3 opacity-60 cursor-not-allowed rounded"
                    >
                        📦 Object (Step 5 only)
                    </button>
                </div>
            </div>

            <div className="h-px bg-gray-200" />

            <div>
                <div className="text-xs font-bold font-body text-muted mb-2 uppercase tracking-wider">Messages</div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                    <button
                        onClick={onCreateCall}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onCreateCall();
                            }
                        }}
                        tabIndex={0}
                        className={`p-2 text-xs rounded flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${activeTool === 'call' ? 'bg-blue-100 text-blue-700' : 'bg-surface-3 hover:bg-surface-3'}`}
                    >
                        <CallMessageIcon /> Call
                    </button>
                    <button
                        onClick={onCreateReturn}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onCreateReturn();
                            }
                        }}
                        tabIndex={0}
                        className={`p-2 text-xs rounded flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-500 ${activeTool === 'return' ? 'bg-red-100 text-red-700' : 'bg-surface-3 hover:bg-surface-3'}`}
                    >
                        <ReturnMessageIcon /> Return
                    </button>
                    <button
                        onClick={onCreateSelf}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onCreateSelf();
                            }
                        }}
                        tabIndex={0}
                        className={`p-2 text-xs rounded flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-purple-500 ${activeTool === 'self' ? 'bg-purple-100 text-purple-700' : 'bg-surface-3 hover:bg-surface-3'}`}
                    >
                        <SelfMessageIcon /> Self
                    </button>
                </div>
                <button
                    onClick={onAddActivation}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onAddActivation();
                        }
                    }}
                    tabIndex={0}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-orange-500 ${activeTool === 'activation' ? 'bg-orange-100 text-orange-700' : 'bg-surface-3 hover:bg-orange-50'}`}
                >
                    <ActivationIcon /> Activation Bar
                </button>
            </div>

            {/* Always show Delete Selected option */}
            <div className="h-px bg-gray-200" />
            <div>
                <button
                    onClick={onDelete}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (hasSelection) onDelete();
                        }
                    }}
                    tabIndex={0}
                    disabled={!hasSelection}
                    className={`w-full py-2 text-sm rounded focus:outline-none focus:ring-2 transition-colors ${hasSelection
                        ? 'bg-status-red/10 text-red-700 hover:bg-red-100 focus:ring-red-500 cursor-pointer'
                        : 'bg-surface-3 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    ⌫ Delete
                </button>
            </div>

            {/* Always show Clear All option */}
            <div className="h-px bg-gray-200" />
            <div>
                <button
                    onClick={onClearAll}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onClearAll();
                        }
                    }}
                    tabIndex={0}
                    className="w-full py-2 text-sm bg-orange-50 text-orange-700 rounded hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                    🗑️ Clear All
                </button>
            </div>

            {/* Use Case Steps Section (NEW FEATURE as requested) */}
            {ucdSteps && ucdSteps.length > 0 && (
                <>
                    <div className="h-px bg-gray-200 my-2" />
                    <div>
                        <div className="flex items-center justify-between mb-2 text-muted">
                            <div className="text-[10px] font-bold font-body uppercase tracking-wider">Use Case Steps</div>
                        </div>
                        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {ucdSteps.map((step, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onAddFromStep?.(step)}
                                    className="text-left text-[11px] p-2 bg-blue-50/50 hover:bg-blue-100/70 border border-blue-100 rounded transition-all text-blue-800 line-clamp-2 hover:line-clamp-none group relative"
                                    title="Click to add message to SSD"
                                >
                                    <span className="font-bold font-body mr-1">{idx + 1}.</span> {step.action || step.text}
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-[10px]">➕</div>
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-gray-400 mt-2 italic text-center italic">
                            Tip: click steps to insert arrows based on UCD
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default SSDToolbar;
