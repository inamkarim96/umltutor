import React from 'react';
import { 
    Plus, 
    Trash2, 
    RotateCcw, 
    ArrowRight, 
    ArrowLeft, 
    PlusCircle, 
    XCircle,
    User
} from 'lucide-react';

const SequenceDiagramToolbar = ({ 
    onAddLifeline, 
    onAddActor,
    onDelete, 
    onClear,
    activeMessageType,
    onMessageTypeChange 
}) => {
    const messageTypes = [
        { id: 'sync', label: 'Sync', icon: ArrowRight, desc: 'Solid + Filled Arrow' },
        { id: 'async', label: 'Async', icon: ArrowRight, desc: 'Solid + Open Arrow' },
        { id: 'reply', label: 'Reply', icon: ArrowLeft, desc: 'Dashed + Open Arrow' },
        { id: 'create', label: 'Create', icon: PlusCircle, desc: 'Dashed + <<create>>' },
        { id: 'delete', label: 'Delete', icon: XCircle, desc: 'Arrow + X' },
    ];

    return (
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-3">
            {/* Primary Actions */}
            <div className="flex flex-col bg-white rounded-lg shadow-xl border border-black/5 p-2 gap-2">
                <button
                    onClick={onAddLifeline}
                    className="p-3 bg-accent hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md group relative"
                    title="Add Lifeline"
                >
                    <Plus size={20} />
                    <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                        Add Lifeline
                    </span>
                </button>
                <button
                    onClick={onAddActor}
                    className="p-3 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl transition-all group relative"
                    title="Add Actor"
                >
                    <User size={20} />
                    <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                        Add Actor
                    </span>
                </button>
                <div className="h-px bg-surface-3 mx-1" />
                <button
                    onClick={onDelete}
                    className="p-3 bg-white hover:bg-status-red/10 text-gray-400 hover:text-status-red rounded-xl transition-all group relative"
                    title="Delete Selected"
                >
                    <Trash2 size={20} />
                </button>
                <button
                    onClick={onClear}
                    className="p-3 bg-white hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-xl transition-all group relative"
                    title="Clear Canvas"
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* Message Types Selector */}
            <div className="flex flex-col bg-white rounded-lg shadow-xl border border-black/5 p-2 gap-2">
                <p className="text-[9px] font-extrabold font-heading text-gray-400 uppercase tracking-widest text-center mb-1">Messages</p>
                {messageTypes.map((type) => {
                    const Icon = type.icon;
                    const isActive = activeMessageType === type.id;
                    return (
                        <button
                            key={type.id}
                            onClick={() => onMessageTypeChange(type.id)}
                            className={`
                                p-3 rounded-xl transition-all group relative
                                ${isActive 
                                    ? 'bg-accent/10 text-accent ring-2 ring-indigo-500/20' 
                                    : 'text-gray-400 hover:bg-surface-3 hover:text-muted'}
                            `}
                            title={type.desc}
                        >
                            <Icon size={20} className={type.id === 'reply' ? 'rotate-180' : ''} />
                            <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-[100]">
                                {type.label}: {type.desc}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SequenceDiagramToolbar;
