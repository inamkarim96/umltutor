import React from 'react';

const RequirementTabs = ({
    tabs,
    activeTab,
    onTabChange
}) => {
    return (
        <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
              py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
            `}
                    >
                        {/* Completion Status Indicator */}
                        <div className={`
              w-5 h-5 rounded-full border flex items-center justify-center text-[10px]
              ${tab.isCompleted
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'bg-white border-gray-300 text-gray-500'
                            }
            `}>
                            {tab.isCompleted ? '✓' : '●'}
                        </div>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default RequirementTabs;
