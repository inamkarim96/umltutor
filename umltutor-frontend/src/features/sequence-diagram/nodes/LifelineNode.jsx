import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

const EditableLabelInput = ({ nodeId, data }) => {
    const [value, setValue] = useState(data.editValue ?? data.label ?? '');

    const commit = () => {
        if (data.onCommit) data.onCommit(nodeId, value.trim() || data.label);
        if (data.onDone) data.onDone();
    };
    const cancel = () => { if (data.onDone) data.onDone(); };

    return (
        <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') cancel();
            }}
            onBlur={commit}
            className="w-full h-full bg-transparent text-center text-[11px] font-extrabold font-heading tracking-tight text-ink px-2 uppercase outline-none"
        />
    );
};

const LifelineNode = ({ id, data, selected }) => {
    const isEditing = data && data.editing;
    const isReadOnly = data && data.isReadOnly;

    return (
        <div className="relative flex flex-col items-center group" data-testid="lifeline-node">
            {/* Lifeline Head */}
            <div
                className={`
                    w-32 h-12 flex items-center justify-center
                    bg-white border-2 rounded-sm shadow-card transition-all
                    ${selected ? 'border-accent ring-2 ring-indigo-100' : 'border-gray-800'}
                    ${isEditing ? 'ring-2 ring-accent/40' : ''}
                `}
            >
                {isEditing ? (
                    <EditableLabelInput nodeId={id} data={data} />
                ) : (
                    <div className="text-[11px] font-extrabold font-heading tracking-tight text-ink px-2 text-center uppercase truncate">
                        {data.label || 'Instance:Class'}
                    </div>
                )}
            </div>

            {/* Lifeline Stem (Dashed Line) */}
            <div
                className="w-[2px] h-[500px] bg-repeat-y bg-[length:2px_12px]"
                style={{ backgroundImage: 'linear-gradient(to bottom, #1f2937 50%, transparent 50%)' }}
            />
            {/* Invisible connection handles spread along the stem (every 60 px).
                 Opacity-0 so no blue dots appear; still clickable for drag-to-connect. */}
            {[48, 108, 168, 228, 288, 348, 408, 468].map((yOff) => (
                <React.Fragment key={yOff}>
                    <Handle
                        type="source"
                        id={`src-${yOff}`}
                        position={Position.Right}
                        className="!opacity-0 !pointer-events-auto"
                        style={{
                            width: 24, height: 24,
                            left: '50%', top: yOff,
                            transform: 'translate(-50%, -50%)',
                            borderRadius: 0,
                            background: 'transparent',
                            border: 'none',
                            zIndex: 10,
                        }}
                    />
                    <Handle
                        type="target"
                        id={`tgt-${yOff}`}
                        position={Position.Left}
                        className="!opacity-0 !pointer-events-auto"
                        style={{
                            width: 24, height: 24,
                            left: '50%', top: yOff,
                            transform: 'translate(-50%, -50%)',
                            borderRadius: 0,
                            background: 'transparent',
                            border: 'none',
                            zIndex: 10,
                        }}
                    />
                </React.Fragment>
            ))}

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