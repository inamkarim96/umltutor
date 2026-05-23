import React, { memo } from 'react';
import { getBezierPath, EdgeText, getSmoothStepPath } from 'reactflow';

const MessageEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    markerEnd,
}) => {
    const isSelf = data?.type === 'self' || id.includes('self');
    
    let edgePath = '';
    let labelX, labelY;

    if (isSelf) {
        // U-shaped path for self-messages
        const radiusX = 40;
        const radiusY = 20;
        edgePath = `M ${sourceX} ${sourceY} C ${sourceX + radiusX} ${sourceY} ${sourceX + radiusX} ${sourceY + radiusY} ${sourceX} ${sourceY + radiusY}`;
        labelX = sourceX + radiusX;
        labelY = sourceY + (radiusY / 2);
    } else {
        // Straight line for standard messages (Sequence diagrams usually use straight horizontal lines)
        [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            borderRadius: 0,
        });
    }

    const type = data?.type || 'sync';
    const isDashed = type === 'reply' || type === 'create';
    const marker = type === 'sync' ? 'url(#sequence-sync-arrow)' : 
                   type === 'delete' ? 'url(#sequence-delete-x)' : 
                   'url(#sequence-open-arrow)';

    const finalStyle = {
        ...style,
        strokeWidth: 2,
        stroke: type === 'delete' ? '#ef4444' : '#1f2937',
        strokeDasharray: isDashed ? '5,5' : 'none',
    };

    return (
        <>
            <path
                id={id}
                style={finalStyle}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={marker}
            />
            <EdgeText
                x={labelX}
                y={labelY - 10}
                label={type === 'create' ? `<<create>> ${data.label || ''}` : data.label || 'message()'}
                labelStyle={{ fill: '#1f2937', fontWeight: 700, fontSize: 10 }}
                labelShowBg
                labelBgStyle={{ fill: '#ffffff', fillOpacity: 0.8 }}
                labelBgPadding={[4, 2]}
                labelBgBorderRadius={4}
            />
        </>
    );
};

export default memo(MessageEdge);
