import React, { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';

const ClassRelationshipEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const type = data?.type || 'association';

    // Define markers and styles based on relationship type
    let finalMarkerEnd = markerEnd;
    let finalStyle = { ...style, strokeWidth: 2, stroke: '#374151' };

    switch (type) {
        case 'inheritance':
            finalMarkerEnd = 'url(#inheritance-arrow)';
            break;
        case 'implementation':
            finalMarkerEnd = 'url(#inheritance-arrow)';
            finalStyle.strokeDasharray = '5,5';
            break;
        case 'composition':
            finalMarkerEnd = 'url(#composition-diamond)';
            break;
        case 'aggregation':
            finalMarkerEnd = 'url(#aggregation-diamond)';
            break;
        case 'dependency':
            finalMarkerEnd = 'url(#dependency-arrow)';
            finalStyle.strokeDasharray = '5,5';
            break;
        case 'directed-association':
            finalMarkerEnd = 'url(#dependency-arrow)';
            break;
        default: // association
            break;
    }

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={finalMarkerEnd} style={finalStyle} />
            {data?.label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            fontSize: 10,
                            fontWeight: 700,
                            pointerEvents: 'none',
                            backgroundColor: 'white',
                            padding: '2px 4px',
                            borderRadius: 4,
                            border: '1px solid #e5e7eb'
                        }}
                    >
                        {data.label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

export default memo(ClassRelationshipEdge);
