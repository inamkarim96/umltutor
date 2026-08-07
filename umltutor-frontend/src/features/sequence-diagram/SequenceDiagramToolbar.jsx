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

const ActivationIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
        <rect x="2" y="4" width="4" height="12" fill="currentColor" />
    </svg>
);

const SequenceDiagramToolbar = ({
    onAddActor,
    onAddSystem,
    onAddObject,
    onAddLifeline,
    onDelete,
    onClear,
    hasSelection = false,
    activeMessageType = null,
    onMessageTypeChange,
    onAddActivation,
    lifelineCount = 0,
    isReadOnly = false
}) => {
    if (isReadOnly) return null;

    const handleAddObject = onAddObject || onAddLifeline;

    return (
        <div className="absolute top-20 right-4 flex flex-col gap-3 p-3 bg-white rounded-lg shadow-hover z-20 border border-black/10 w-56 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div>
                <div className="flex items-center justify-between mb-2 text-muted">
                    <div className="text-xs font-bold font-body uppercase tracking-wider">Lifelines</div>
                </div>
                <div className="flex flex-col gap-1">
                    <button
                        onClick={onAddActor}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-3 hover:bg-blue-50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        👤 Actor
                    </button>
                    {onAddSystem && (
                        <button
                            onClick={onAddSystem}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-3 hover:bg-status-green/10 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            🖥️ System
                        </button>
                    )}
                    <button
                        onClick={handleAddObject}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-3 hover:bg-purple-50 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        📦 Object
                    </button>
                </div>
            </div>

            <div className="h-px bg-gray-200" />

            <div>
                <div className="text-xs font-bold font-body text-muted mb-2 uppercase tracking-wider">Messages</div>
                 <div className="grid grid-cols-2 gap-1 mb-2">
                    <button
                        onClick={() => onMessageTypeChange('call')}
                        disabled={lifelineCount < 2}
                        title={lifelineCount < 2 ? 'Add at least two objects first' : 'Insert a call between the two most recently added objects'}
                        className={`p-2 text-xs rounded flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${activeMessageType === 'call' ? 'bg-blue-100 text-blue-700 font-bold ring-2 ring-blue-400' : 'bg-surface-3 hover:bg-surface-3'} ${lifelineCount < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <CallMessageIcon /> Call
                    </button>
                    <button
                        onClick={() => onMessageTypeChange('return')}
                        disabled={lifelineCount < 2}
                        className={`p-2 text-xs rounded flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-500 ${activeMessageType === 'return' ? 'bg-red-100 text-red-700 font-bold ring-2 ring-red-400' : 'bg-surface-3 hover:bg-surface-3'} ${lifelineCount < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <ReturnMessageIcon /> Return
                    </button>
                    <button
                        onClick={() => onMessageTypeChange('self')}
                        disabled={lifelineCount < 1}
                        className={`p-2 text-xs rounded flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-purple-500 ${activeMessageType === 'self' ? 'bg-purple-100 text-purple-700 font-bold ring-2 ring-purple-400' : 'bg-surface-3 hover:bg-surface-3'} ${lifelineCount < 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <SelfMessageIcon /> Self
                    </button>
                </div>
                {onAddActivation && (
                    <button
                        onClick={onAddActivation}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-orange-500 ${activeMessageType === 'activation' ? 'bg-orange-100 text-orange-700 font-bold' : 'bg-surface-3 hover:bg-orange-50'}`}
                    >
                        <ActivationIcon /> Activation Bar
                    </button>
                )}
            </div>

            {/* Delete Option */}
            <div className="h-px bg-gray-200" />
            <div>
                <button
                    onClick={onDelete}
                    disabled={!hasSelection}
                    className={`w-full py-2 text-sm rounded focus:outline-none focus:ring-2 transition-colors ${hasSelection
                        ? 'bg-status-red/10 text-red-700 hover:bg-red-100 focus:ring-red-500 cursor-pointer font-bold'
                        : 'bg-surface-3 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    ⌫ Delete
                </button>
            </div>

            {/* Clear All Option */}
            <div className="h-px bg-gray-200" />
            <div>
                <button
                    onClick={onClear}
                    className="w-full py-2 text-sm bg-orange-50 text-orange-700 rounded hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                >
                    🗑️ Clear All
                </button>
            </div>
        </div>
    );
};

export default SequenceDiagramToolbar;
