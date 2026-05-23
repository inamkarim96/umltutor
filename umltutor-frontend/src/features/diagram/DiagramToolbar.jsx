import React from 'react';
const DiagramToolbar = ({
    onAddActor,
    onAddUseCase,
    onAddSystemBoundary,
    onDelete,
    onClear,
    isActorDisabled = false,
    isUseCaseDisabled = false,
    onDisabledActionClick
}) => {
    const handleAddActorClick = (e) => {
        if (isActorDisabled) {
            onDisabledActionClick?.('Please enter system name before adding actors.');
            return;
        }
        onAddActor();
    };

    const handleAddUseCaseClick = (e) => {
        if (isUseCaseDisabled) {
            onDisabledActionClick?.('Please enter system name before adding use cases.');
            return;
        }
        onAddUseCase();
    };

    return (
        <div className="absolute top-4 right-4 flex flex-col gap-2 p-2 bg-white rounded-lg shadow-hover z-10 border border-black/10">
            <div className="text-xs font-semibold text-muted mb-1 px-1">Elements</div>

            <button
                onClick={handleAddActorClick}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActorDisabled
                    ? 'opacity-50 cursor-not-allowed bg-surface-3 text-gray-400'
                    : 'text-gray-700 bg-surface-3 hover:bg-accent/10 hover:text-indigo-700'
                    }`}
                title={isActorDisabled ? "Please enter system name first" : "Add Actor"}
            >
                <span className="text-lg">👤</span> Actor
            </button>

            <button
                onClick={handleAddUseCaseClick}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isUseCaseDisabled
                    ? 'opacity-50 cursor-not-allowed bg-surface-3 text-gray-400'
                    : 'text-gray-700 bg-surface-3 hover:bg-accent/10 hover:text-indigo-700'
                    }`}
                title={isUseCaseDisabled ? "Please enter system name first" : "Add Use Case"}
            >
                <span className="text-lg">⚪</span> Use Case
            </button>

            <button
                onClick={onAddSystemBoundary}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-surface-3 hover:bg-accent/10 hover:text-indigo-700 rounded-md transition-colors"
                title="Add System Boundary"
            >
                <span className="text-lg">⬜</span> System
            </button>

            <div className="h-px bg-gray-200 my-1" />

            <div className="text-xs font-semibold text-muted mb-1 px-1">Actions</div>

            <button
                onClick={onDelete}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-surface-3 hover:bg-surface-3 rounded-md transition-colors"
                title="Delete Selected"
            >
                <span>⌫</span> Delete Selection
            </button>

            <button
                onClick={onClear}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-status-red bg-status-red/10 hover:bg-red-100 rounded-md transition-colors"
                title="Clear Diagram"
            >
                <span>🗑️</span> Clear
            </button>
        </div>
    );
};

export default DiagramToolbar;
