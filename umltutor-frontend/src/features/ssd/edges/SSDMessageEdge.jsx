import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useReactFlow } from 'reactflow';

// ── Activation-bar boundary helper ───────────────────────────────────────────
// Returns true if a bar on `lifelineId` contains canvas-Y `msgY`
const findBarAtY = (lifelineId, msgY) => {
    const bars = window.__ssdActivationBars;
    if (!bars || !lifelineId) return null;
    return bars.find(b => {
        if (b.lifelineId !== lifelineId) return false;
        const top = b.startY;
        const bottom = b.endY != null ? b.endY : top + (b.height || 60);
        return msgY >= top - 8 && msgY <= bottom + 8;  // 8px canvas-unit tolerance
    }) || null;
};

const BAR_HALF_CANVAS = 7; // half of 14px activation bar width in canvas units

const SSDMessageEdge = ({
    id,
    sourceX,
    targetX,
    sourceY,     // fallback only
    data,
    label,
    selected,
}) => {
    const rfInstance = useReactFlow();
    const { setEdges } = rfInstance;
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(data?.text || data?.name || label || '');
    const inputRef = useRef(null);

    const messageType = data?.messageType || 'call';
    const isReturn = messageType === 'return';
    const isAsync = messageType === 'async';
    const isSelf = messageType === 'self';
    const isDelete = messageType === 'delete';

    // UML compliant styling
    const strokeDasharray = data?.style?.strokeDasharray || (isReturn ? '6,4' : isAsync ? '3,2' : isDelete ? '2,2' : undefined);

    // Use smoothly updated exact Y for geometry, fall back to handle if undefined
    const y = typeof data?.y === 'number' ? data.y : sourceY;

    // ── Activation-bar boundary adjustment ───────────────────────────────────
    // Determine whether source or target lifeline has a bar at this message Y
    // and shift the arrow endpoint to the bar's left / right edge.
    const zoom = rfInstance?.getZoom() || 1;
    const halfBarScreen = BAR_HALF_CANVAS * zoom; // 7 canvas units → screen pixels

    const targetBar = !isSelf ? findBarAtY(data?.toLifelineId, y) : null;
    const sourceBar = findBarAtY(data?.fromLifelineId, y);

    // Call (→ System): terminate at LEFT edge of target bar
    const adjTargetX = (targetBar && !isSelf)
        ? targetX - halfBarScreen * Math.sign(targetX - sourceX)
        : targetX;

    // Return (System →): start at LEFT edge of source bar
    const adjSourceX = (sourceBar && isReturn)
        ? sourceX - halfBarScreen * Math.sign(sourceX - targetX)
        : sourceX;

    // Self-loop: start from RIGHT edge of bar (loop extends further right)
    const selfLoopBaseX = (sourceBar && isSelf)
        ? sourceX + halfBarScreen
        : sourceX;

    const leftToRight = adjTargetX >= adjSourceX;
    const sign = leftToRight ? 1 : -1;
    const ARROW_SIZE = 10;

    const strokeColor = data?.style?.color || (selected ? '#3B82F6' : isReturn ? '#374151' : '#111827');
    const strokeWidth = data?.style?.strokeWidth || (isDelete ? 1 : 2);


    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setEditValue(data?.text || data?.name || label || '');
    }, [label, data?.text, data?.name]);

    const saveLabel = useCallback((val) => {
        const trimmed = val.trim();
        setIsEditing(false);
        setEditValue(trimmed);
        setEdges(eds => eds.map(e => e.id === id ? {
            ...e,
            label: trimmed,
            data: { ...e.data, text: trimmed }
        } : e));
    }, [id, setEdges]);

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsEditing(true);
    };

    const handleBlur = () => saveLabel(editValue);
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveLabel(editValue); }
        if (e.key === 'Escape') { e.preventDefault(); setIsEditing(false); setEditValue(label || ''); }
    };

    const handleDragStart = (e) => {
        const startMouseY = e.clientY;
        const initialY = typeof data?.y === 'number' ? data.y : sourceY;
        const zoom = rfInstance?.getZoom() || 1;

        const onMouseMove = (moveEvent) => {
            const currentMouseY = moveEvent.clientY;
            const deltaY = (currentMouseY - startMouseY) / zoom;
            const newAbsoluteY = initialY + deltaY;
            if (window.updateMessageY) window.updateMessageY(id, newAbsoluteY, true);
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (window.snapMessageY) window.snapMessageY(id);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const labelText = editValue || '';

    // ─────────────────────────────────────────────────────────────────────────
    // SELF-LOOP RENDERING
    // Isolated render path for messageType === 'self'
    // (System internal operations: calculate, process, validate, etc.)
    //
    // Shape: lifeline → right → down → back to lifeline, with a left arrowhead.
    // Label is placed to the right of the loop.
    // ─────────────────────────────────────────────────────────────────────────
    if (isSelf) {
        const LOOP_W = 60;   // how far right the loop extends
        const LOOP_H = 36;   // vertical height of the loop
        const R = 8;         // corner radius for smooth curves
        const lx = sourceX;  // lifeline center X

        // SVG path with rounded corners: top-left → top-right → bottom-right → bottom-left
        const loopPath = [
            `M ${lx} ${y}`,
            `L ${lx + LOOP_W - R} ${y}`,
            `Q ${lx + LOOP_W} ${y} ${lx + LOOP_W} ${y + R}`,
            `L ${lx + LOOP_W} ${y + LOOP_H - R}`,
            `Q ${lx + LOOP_W} ${y + LOOP_H} ${lx + LOOP_W - R} ${y + LOOP_H}`,
            `L ${lx} ${y + LOOP_H}`,
        ].join(' ');

        // Arrowhead pointing LEFT at bottom return point
        const arrowTip = lx;
        const arrowBase = lx + ARROW_SIZE;
        const arrowPoints = `${arrowTip},${y + LOOP_H} ${arrowBase},${y + LOOP_H - 5} ${arrowBase},${y + LOOP_H + 5}`;

        // Label: to the right of the loop
        const LABEL_X = lx + LOOP_W + 6;
        const LABEL_Y = y + LOOP_H / 2 - 8;
        const selfLabelWidth = Math.max(70, labelText.length * 7 + 16);

        return (
            <g style={{ pointerEvents: 'all' }}>
                {/* Invisible hit area covering the loop bounding box for drag */}
                <rect
                    x={lx - 4}
                    y={y - 4}
                    width={LOOP_W + 8}
                    height={LOOP_H + 8}
                    fill="transparent"
                    stroke="none"
                    style={{ cursor: 'ns-resize' }}
                    onMouseDown={handleDragStart}
                />

                {/* The loop path */}
                <path
                    d={loopPath}
                    fill="none"
                    stroke={selected ? '#3B82F6' : strokeColor}
                    strokeWidth={strokeWidth}
                />

                {/* Filled arrowhead pointing left (back to lifeline) */}
                <polygon
                    points={arrowPoints}
                    fill={selected ? '#3B82F6' : strokeColor}
                    stroke={selected ? '#3B82F6' : strokeColor}
                    strokeWidth={1}
                />

                {/* Sequence order number near top-left of loop */}
                {typeof data?.order === 'number' && (
                    <text
                        x={lx + 4}
                        y={y - 5}
                        fontSize={9}
                        fill={selected ? '#3B82F6' : '#9CA3AF'}
                        fontFamily="monospace"
                    >
                        {data.order + 1}
                    </text>
                )}

                {/* Label to the right of the loop */}
                {!isEditing && (
                    <foreignObject
                        x={LABEL_X}
                        y={LABEL_Y}
                        width={selfLabelWidth}
                        height={22}
                        onDoubleClick={handleDoubleClick}
                        style={{ cursor: 'pointer', overflow: 'visible' }}
                    >
                        <div className="flex items-center h-full">
                            <div className={`
                                text-[11px] px-1.5 py-0.5 rounded leading-tight select-none
                                font-semibold text-gray-900 dark:text-white bg-white/90 dark:bg-gray-900/90
                                ${selected ? 'ring-1 ring-blue-400' : ''}
                            `}>
                                {labelText}
                            </div>
                        </div>
                    </foreignObject>
                )}

                {/* Editing input for self-loop label */}
                {isEditing && (
                    <foreignObject
                        x={LABEL_X} y={LABEL_Y - 4}
                        width={180} height={40}
                        style={{ overflow: 'visible' }}
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%', height: 26, fontSize: 12,
                                textAlign: 'left',
                                border: '2px solid #3B82F6',
                                borderRadius: 6, outline: 'none',
                                background: 'white', color: '#111827',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                padding: '0 6px',
                            }}
                        />
                    </foreignObject>
                )}
            </g>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NORMAL MESSAGE RENDERING
    // Actor → System, System → Actor, return, async — completely unchanged.
    // ─────────────────────────────────────────────────────────────────────────

    const midX = (sourceX + targetX) / 2;
    const tipX = targetX;
    const labelWidth = Math.max(80, labelText.length * 8 + 16);
    const labelY = y - 22;

    const renderArrowHead = () => {
        if (isReturn) {
            return (
                <polyline
                    points={`
                        ${tipX},${y}
                        ${tipX - sign * ARROW_SIZE},${y - 6}
                        ${tipX},${y}
                        ${tipX - sign * ARROW_SIZE},${y + 6}
                    `}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            );
        } else if (isAsync) {
            return (
                <polyline
                    points={`
                        ${tipX},${y}
                        ${tipX - sign * ARROW_SIZE},${y - 4}
                        ${tipX - sign * ARROW_SIZE},${y + 4}
                    `}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1}
                />
            );
        }
        // Filled triangle (UML synchronous call)
        return (
            <polygon
                points={`
                    ${tipX},${y}
                    ${tipX - sign * ARROW_SIZE},${y - 5}
                    ${tipX - sign * ARROW_SIZE},${y + 5}
                `}
                fill={strokeColor}
                stroke={strokeColor}
                strokeWidth={1}
            />
        );
    };

    return (
        <g style={{ pointerEvents: 'all' }}>
            {/* Wide invisible hit area for vertical dragging */}
            <line
                x1={sourceX} y1={y}
                x2={targetX} y2={y}
                stroke="transparent"
                strokeWidth={20}
                style={{ cursor: 'ns-resize' }}
                onMouseDown={handleDragStart}
            />

            {/* Visible horizontal line */}
            <line
                x1={sourceX} y1={y}
                x2={targetX - sign * (isReturn ? 0 : 2)} y2={y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                style={{ cursor: 'pointer' }}
            />

            {/* Arrowhead */}
            {renderArrowHead()}

            {/* Sequence number */}
            {typeof data?.order === 'number' && (
                <text
                    x={sourceX + sign * 14}
                    y={y - 6}
                    fontSize={9}
                    fill={selected ? '#3B82F6' : '#9CA3AF'}
                    textAnchor="middle"
                    fontFamily="monospace"
                >
                    {data.order + 1}
                </text>
            )}

            {/* Label above the arrow */}
            {!isEditing && (
                <foreignObject
                    x={midX - labelWidth / 2}
                    y={labelY}
                    width={labelWidth}
                    height={24}
                    onDoubleClick={handleDoubleClick}
                    style={{ cursor: 'pointer', overflow: 'visible' }}
                >
                    <div className="flex items-center justify-center h-full">
                        <div className={`
                            text-center text-[11px] px-1.5 py-0.5 rounded leading-tight select-none
                            ${isReturn
                                ? 'font-normal text-gray-600 dark:text-gray-400 italic bg-white/70 dark:bg-gray-900/70'
                                : 'font-semibold text-gray-900 dark:text-white bg-white/80 dark:bg-gray-900/80'
                            }
                            ${selected ? 'ring-1 ring-blue-400' : ''}
                        `}>
                            {labelText}
                        </div>
                    </div>
                </foreignObject>
            )}

            {/* Editing input */}
            {isEditing && (
                <foreignObject
                    x={midX - 110} y={labelY - 4}
                    width={220} height={40}
                    style={{ overflow: 'visible' }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%', height: 26, fontSize: 13,
                            textAlign: 'center',
                            border: '2px solid #3B82F6',
                            borderRadius: 6, outline: 'none',
                            background: 'white', color: '#111827',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        }}
                    />
                </foreignObject>
            )}
        </g>
    );
};

export default SSDMessageEdge;