import React from 'react';
import { Square, Layers, Trash2, RotateCcw, ArrowRight, ArrowUpRight, Share2, Diamond } from 'lucide-react';

const ClassDiagramToolbar = ({
    onAddClass,
    onAddInterface,
    onDelete,
    onClear,
    activeRelationship,
    onRelationshipChange
}) => {
    const relationships = [
        { id: 'association', label: 'Association', icon: ArrowRight },
        { id: 'directed-association', label: 'Directed Assoc', icon: ArrowRight },
        { id: 'inheritance', label: 'Inheritance', icon: ArrowUpRight },
        { id: 'implementation', label: 'Realization', icon: ArrowUpRight },
        { id: 'composition', label: 'Composition', icon: Diamond },
        { id: 'aggregation', label: 'Aggregation', icon: Diamond },
        { id: 'dependency', label: 'Dependency', icon: Share2 },
    ];

    return (
        <div className="absolute top-4 right-4 flex flex-col gap-3 p-3 bg-white rounded-xl shadow-xl z-10 border border-gray-200 w-48">
            <div>
                <div className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest px-1">Elements</div>
                <div className="flex flex-col gap-1">
                    <button
                        onClick={onAddClass}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-all"
                    >
                        <Square size={16} /> Class
                    </button>
                    <button
                        onClick={onAddInterface}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all"
                    >
                        <Layers size={16} /> Interface
                    </button>
                </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div>
                <div className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest px-1">Relationship Type</div>
                <div className="grid grid-cols-1 gap-1">
                    {relationships.map((rel) => (
                        <button
                            key={rel.id}
                            onClick={() => onRelationshipChange(rel.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                activeRelationship === rel.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                            }`}
                        >
                            <rel.icon size={14} className={rel.id === 'implementation' || rel.id === 'dependency' ? 'stroke-dasharray-2' : ''} />
                            {rel.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="flex flex-col gap-1">
                <button
                    onClick={onDelete}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all"
                >
                    <Trash2 size={16} /> Delete
                </button>
                <button
                    onClick={onClear}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                >
                    <RotateCcw size={16} /> Clear All
                </button>
            </div>
        </div>
    );
};

export default ClassDiagramToolbar;
