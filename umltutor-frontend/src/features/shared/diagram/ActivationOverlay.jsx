import React, { useCallback, useEffect, useState } from 'react';

export const DEFAULT_ACT_H = 60;

const ActivationOverlay = ({
    bars,
    viewportRef,
    nodePositions,
    selectedBarId,
    onSelect,
    onDrag,
    onResize,
    isReadOnly = false,
}) => {
    const [dragState, setDragState] = useState(null);

    const startDrag = useCallback((e, barId, type) => {
        if (isReadOnly) return;
        const bar = bars.find((b) => b.id === barId);
        if (!bar) return;
        setDragState({
            barId,
            type,
            startX: bar.startX || 0,
            startY: bar.startY,
            startHeight: bar.height || DEFAULT_ACT_H,
            mouseX: e.clientX,
            mouseY: e.clientY,
        });
        e.preventDefault();
    }, [bars, isReadOnly]);

    const handleMouseMove = useCallback((e) => {
        if (!dragState) return;
        const zoom = viewportRef.current?.zoom || 1;
        const deltaX = (e.clientX - dragState.mouseX) / zoom;
        const deltaY = (e.clientY - dragState.mouseY) / zoom;
        if (dragState.type === 'move') {
            onDrag(dragState.barId, deltaX, deltaY);
            setDragState((prev) => (prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null));
        } else if (dragState.type === 'resize') {
            onResize(dragState.barId, deltaY);
            setDragState((prev) => (prev ? { ...prev, mouseY: e.clientY, startHeight: prev.startHeight + deltaY } : null));
        }
    }, [dragState, onDrag, onResize, viewportRef]);

    const handleMouseUp = useCallback(() => {
        setDragState(null);
    }, []);

    useEffect(() => {
        if (!dragState) return undefined;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, handleMouseMove, handleMouseUp]);

    if (!viewportRef.current) return null;

    const vp = viewportRef.current;

    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 25 }}>
            {bars.map((bar) => {
                const zoom = vp.zoom;
                let screenX;
                let screenY;

                if (bar.startX !== undefined && bar.lifelineId === 'free-floating') {
                    screenX = (bar.startX * zoom + vp.x) - (7 * zoom);
                    screenY = (bar.startY * zoom + vp.y);
                } else {
                    const pos = nodePositions[bar.lifelineId];
                    if (!pos) return null;
                    const lifelineCenterX = pos.x + 55;
                    screenX = (lifelineCenterX * zoom + vp.x) - (7 * zoom);
                    screenY = (pos.y * zoom + vp.y) + bar.startY * zoom;
                }

                const activationWidth = 14;
                const barHeight = bar.endY
                    ? (bar.endY - bar.startY) * zoom
                    : Math.max(20 * zoom, (bar.height || DEFAULT_ACT_H) * zoom);
                const actualHeight = Math.max(20 * zoom, barHeight);
                const isSelected = selectedBarId === bar.id;
                const HANDLE_H = 12;

                return (
                    <g key={bar.id}>
                        <rect
                            x={screenX}
                            y={screenY}
                            width={activationWidth * zoom}
                            height={actualHeight}
                            fill="none"
                            stroke={isSelected ? '#3B82F6' : '#111827'}
                            strokeWidth={isSelected ? 2.5 : 1.5}
                            style={{
                                pointerEvents: isReadOnly ? 'none' : 'all',
                                cursor: isReadOnly ? 'default' : 'move',
                            }}
                            onMouseDown={(e) => startDrag(e, bar.id, 'move')}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(bar.id);
                            }}
                        />
                        {!isReadOnly && (
                            <g
                                style={{ pointerEvents: 'all', cursor: 'ns-resize' }}
                                onMouseDown={(e) => { e.stopPropagation(); startDrag(e, bar.id, 'resize'); }}
                            >
                                <rect
                                    x={screenX - 4 * zoom}
                                    y={screenY + actualHeight - HANDLE_H * zoom / 2}
                                    width={(activationWidth + 8) * zoom}
                                    height={HANDLE_H * zoom}
                                    fill="transparent"
                                />
                                <rect
                                    x={screenX}
                                    y={screenY + actualHeight - 5 * zoom}
                                    width={activationWidth * zoom}
                                    height={5 * zoom}
                                    fill={isSelected ? '#3B82F6' : '#6B7280'}
                                    rx={2 * zoom}
                                />
                                {[0.3, 0.5, 0.7].map((t, i) => (
                                    <line
                                        key={i}
                                        x1={screenX + activationWidth * zoom * t}
                                        y1={screenY + actualHeight - 4 * zoom}
                                        x2={screenX + activationWidth * zoom * t}
                                        y2={screenY + actualHeight - 1 * zoom}
                                        stroke="white"
                                        strokeWidth={1}
                                    />
                                ))}
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default ActivationOverlay;
