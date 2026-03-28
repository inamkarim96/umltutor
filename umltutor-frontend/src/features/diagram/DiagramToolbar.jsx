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
        <div className="absolute top-4 right-4 flex flex-col gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 px-1">Elements</div>

            <button
                onClick={handleAddActorClick}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActorDisabled
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                    : 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300'
                    }`}
                title={isActorDisabled ? "Please enter system name first" : "Add Actor"}
            >
                <span className="text-lg">👤</span> Actor
            </button>

            <button
                onClick={handleAddUseCaseClick}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isUseCaseDisabled
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                    : 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300'
                    }`}
                title={isUseCaseDisabled ? "Please enter system name first" : "Add Use Case"}
            >
                <span className="text-lg">⚪</span> Use Case
            </button>

            <button
                onClick={onAddSystemBoundary}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-md transition-colors"
                title="Add System Boundary"
            >
                <span className="text-lg">⬜</span> System
            </button>

            <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 px-1">Actions</div>

            <button
                onClick={onDelete}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                title="Delete Selected"
            >
                <span>⌫</span> Delete Selection
            </button>

            <button
                onClick={onClear}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
                title="Clear Diagram"
            >
                <span>🗑️</span> Clear
            </button>
        </div>
    );
};

export default DiagramToolbar;
