import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const LifelineNode = ({ data, selected }) => {
    return (
        <div className="flex flex-col items-center group">
            {/* Lifeline Head */}
            <div 
                className={`
                    w-32 h-12 flex items-center justify-center 
                    bg-white border-2 rounded-sm shadow-card transition-all
                    ${selected ? 'border-accent ring-2 ring-indigo-100' : 'border-gray-800'}
                `}
            >
                <div className="text-[11px] font-extrabold font-heading tracking-tight text-ink px-2 text-center uppercase truncate">
                    {data.label || 'Instance:Class'}
                </div>
            </div>

            {/* Lifeline Stem (Dashed Line) */}
            <div className="w-[2px] h-[500px] bg-repeat-y bg-[length:2px_12px]"
                 style={{ backgroundImage: 'linear-gradient(to bottom, #1f2937 50%, transparent 50%)' }}
            >
                {/* Connection Handles - Distributed along the stem */}
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-2 !h-full !bg-transparent !border-none !rounded-none !static"
                    style={{ top: 0, left: '-4px' }}
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-2 !h-full !bg-transparent !border-none !rounded-none !static"
                    style={{ top: 0, right: '-4px' }}
                />
            </div>
            
            {/* Delete Handle if active */}
            {selected && !data.isReadOnly && (
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-status-red/100 text-white rounded-full flex items-center justify-center text-[10px] shadow-hover animate-in zoom-in">
                    ✕
                </div>
            )}
        </div>
    );
};

export default memo(LifelineNode);
