import React, { memo, useState } from 'react';
import { EdgeText, useReactFlow } from 'reactflow';

// ── Constants ──────────────────────────────────────────────────────────────────
// LifelineNode renders its head as a Tailwind w-32 box (128 px wide).
// The lifeline stem is centred horizontally, so the centre X of the stem is:
//   node.position.x  +  LIFELINE_HALF_WIDTH
const LIFELINE_HALF_WIDTH = 64; // half of w-32 (128 px)

// The head box is h-12 (48 px). We anchor messages below the head.
const LIFELINE_HEAD_HEIGHT = 48;

// Extra padding below the head before the first message.
const MSG_TOP_OFFSET = 20;

// ── Editable label input ────────────────────────────────────────────────────
const EditableMessageLabel = ({ edgeId, data }) => {
    const [value, setValue] = useState(data.editValue ?? data.label ?? '');

    const commit = () => {
        if (data.onCommit) data.onCommit(edgeId, value.trim() || data.label);
        if (data.onDone) data.onDone();
    };
    const cancel = () => { if (data.onDone) data.onDone(); };

    return (
        <foreignObject
            x={data.editX - 80}
            y={data.editY - 12}
            width={160}
            height={26}
            style={{ overflow: 'visible' }}
        >
            <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') cancel();
                }}
                onBlur={commit}
                style={{
                    width: '100%',
                    height: '100%',
                    border: '2px solid #6366f1',
                    borderRadius: 4,
                    background: '#ffffff',
                    fontSize: 10,
                    fontWeight: 700,
                    textAlign: 'center',
                    color: '#1f2937',
                    outline: 'none',
                    padding: '0 4px',
                }}
            />
        </foreignObject>
    );
};

const MessageEdge = ({
    id,
    source,
    target,
    sourceX,   // from ReactFlow handle – used only as fallback
    sourceY,   // from ReactFlow handle – used only as fallback
    targetX,   // from ReactFlow handle – used only as fallback
    targetY,   // from ReactFlow handle – used only as fallback
    style = {},
    data,
}) => {
    const { getNodes, setEdges } = useReactFlow();
    const nodes = getNodes();

    const srcNode = nodes.find((n) => n.id === source);
    const tgtNode = nodes.find((n) => n.id === target);

    const isSelf = source === target;

    // ── Compute lifeline centre X ─────────────────────────────────────────────
    const srcCenterX = srcNode
        ? srcNode.position.x + LIFELINE_HALF_WIDTH
        : sourceX;
    const tgtCenterX = tgtNode
        ? tgtNode.position.x + LIFELINE_HALF_WIDTH
        : targetX;

    // ── Compute message Y ─────────────────────────────────────────────────────
    const baseNodeY = srcNode
        ? srcNode.position.y + LIFELINE_HEAD_HEIGHT + MSG_TOP_OFFSET
        : sourceY;
    const msgY = data?.y != null ? baseNodeY + data.y : sourceY;

    // ── Vertical Dragging Handler ─────────────────────────────────────────────
    const handleDragStart = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const startMouseY = e.clientY;
        const initialY = data?.y != null ? data.y : (sourceY - baseNodeY);

        const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startMouseY;
            const newY = Math.max(0, initialY + deltaY);
            setEdges((eds) =>
                eds.map((edge) =>
                    edge.id === id ? { ...edge, data: { ...edge.data, y: newY } } : edge
                )
            );
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // ── Build SVG paths ───────────────────────────────────────────────────────
    let edgePath = '';
    let labelX, labelY;

    if (isSelf) {
        // Rounded-corner self-message loop, drawn to the RIGHT of the lifeline.
        const loopW = 52;
        const loopH = 32;
        const r = 6;          // corner radius
        const x = srcCenterX;
        const y = msgY;

        edgePath = [
            `M ${x} ${y}`,
            `L ${x + loopW - r} ${y}`,
            `Q ${x + loopW} ${y} ${x + loopW} ${y + r}`,
            `L ${x + loopW} ${y + loopH - r}`,
            `Q ${x + loopW} ${y + loopH} ${x + loopW - r} ${y + loopH}`,
            `L ${x + 8} ${y + loopH}`,   // stops at base of arrowhead (x+8)
        ].join(' ');

        // Label sits inside the loop, vertically centred
        labelX = x + loopW / 2;
        labelY = y + loopH / 2;
    } else {
        // Straight horizontal line — the canonical UML sequence diagram message.
        edgePath = `M ${srcCenterX} ${msgY} L ${tgtCenterX} ${msgY}`;
        labelX = (srcCenterX + tgtCenterX) / 2;
        labelY = msgY;
    }

    // ── Styling ───────────────────────────────────────────────────────────────
    const type = data?.type || 'call';
    const isDashed = type === 'return';
    const marker =
        isSelf            ? undefined :
        type === 'call'   ? 'url(#sequence-sync-arrow)' :
        type === 'delete' ? 'url(#sequence-delete-x)'   :
                            'url(#sequence-open-arrow)';

    const finalStyle = {
        ...style,
        strokeWidth: 2,
        stroke: type === 'delete' ? '#ef4444' : '#1f2937',
        strokeDasharray: isDashed ? '5,5' : 'none',
        fill: 'none',
    };

    const selfArrowPoints = isSelf
        ? `${srcCenterX},${msgY + 32} ${srcCenterX + 8},${msgY + 28} ${srcCenterX + 8},${msgY + 36}`
        : null;

    // ── Render ────────────────────────────────────────────────────────────────
    if (data && data.editing) {
        return (
            <g>
                <path
                    id={id}
                    style={finalStyle}
                    className="react-flow__edge-path"
                    d={edgePath}
                    markerEnd={marker}
                />
                {isSelf && (
                    <polygon
                        points={selfArrowPoints}
                        fill="#1f2937"
                        stroke="#1f2937"
                        strokeWidth={1}
                    />
                )}
                <EditableMessageLabel
                    edgeId={id}
                    data={{ ...data, editX: labelX, editY: labelY }}
                />
            </g>
        );
    }

    return (
        <g>
            {/* Invisible thick hit area for dragging message vertically */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                style={{ cursor: 'ns-resize', pointerEvents: 'all' }}
                onMouseDown={handleDragStart}
            />
            <path
                id={id}
                style={finalStyle}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={marker}
            />
            {isSelf && (
                <polygon
                    points={selfArrowPoints}
                    fill="#1f2937"
                    stroke="#1f2937"
                    strokeWidth={1}
                />
            )}
            <EdgeText
                x={labelX}
                y={labelY - 8}
                label={
                    type === 'create'
                        ? `<<create>> ${data?.label || ''}`
                        : data?.label || 'message()'
                }
                labelStyle={{ fill: '#1f2937', fontWeight: 700, fontSize: 10, cursor: 'ns-resize' }}
                labelShowBg
                labelBgStyle={{ fill: '#ffffff', fillOpacity: 0.85 }}
                labelBgPadding={[4, 2]}
                labelBgBorderRadius={4}
            />
        </g>
    );
};

export default memo(MessageEdge);