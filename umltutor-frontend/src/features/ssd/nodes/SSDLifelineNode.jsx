import React, { memo, useState, useRef, useEffect, useMemo } from 'react';
import { Handle, Position, useReactFlow, useViewport } from 'reactflow';

// ── Layout constants ──────────────────────────────────────────────────────────
// These must stay in sync with the canvas constants in SSDDiagramEditor.
const HANDLE_INTERVAL = 10;   // Dense grid so arrows land accurately
const HANDLE_START = 50;
const HANDLE_END = 1200;
const LIFELINE_HEIGHT = 150;
const MIN_LIFELINE_HEIGHT = 50; // Very small minimum for flexibility
const MAX_LIFELINE_HEIGHT = 5000; // Large maximum for user requirements

// Icon size constants
const DEFAULT_ICON_SIZE = 24;
const MAX_ICON_SIZE = 48;
const MIN_ICON_SIZE = 16;

const SSDLifelineNode = ({ id, data, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(data.label);
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);
    const { setNodes } = useReactFlow();
    const rfInstance = useReactFlow();
    const { zoom } = useViewport();
    const isReadOnly = data.isReadOnly || false;

    // Get the click handlers from props
    const { onLifelineClick, onLifelineDrag } = data;

    // Get position from the node itself
    const nodePosition = rfInstance.getNode(id)?.position || { x: 0, y: 0 };

    // Get current height or use default
    const currentHeight = data.height || LIFELINE_HEIGHT;

    // Get current icon size or use default
    const currentIconSize = data.iconSize || DEFAULT_ICON_SIZE;

    // Get lifeline type
    const isActor = data.lifelineType === 'actor';
    const isSystem = data.lifelineType === 'system';
    const isObject = data.lifelineType === 'object';

    // Handle resize
    const handleResizeStart = (e) => {
        if (isReadOnly) return;
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);

        const isTouch = e.type === 'touchstart';
        const initialMouseY = isTouch ? e.touches[0].clientY : e.clientY;
        const initialHeight = currentHeight;

        const handleMouseMove = (moveEvent) => {
            const clientY = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = (clientY - initialMouseY) / zoom;
            const newHeight = Math.max(MIN_LIFELINE_HEIGHT, Math.min(MAX_LIFELINE_HEIGHT, initialHeight + deltaY));

            setNodes(nds => nds.map(n =>
                n.id === id ? { ...n, data: { ...n.data, height: newHeight } } : n
            ));

            // Update activation bars proportionally
            const heightRatio = newHeight / initialHeight;
            window.dispatchEvent(new CustomEvent('lifelineResize', {
                detail: { lifelineId: id, heightRatio, newHeight }
            }));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };

        if (isTouch) {
            window.addEventListener('touchmove', handleMouseMove, { passive: false });
            window.addEventListener('touchend', handleMouseUp);
        } else {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
    };

    // Handle lifeline drag
    const handleLifelineDragStart = (e) => {
        if (isReadOnly) return;
        // Don't drag if resize handle is clicked
        if (e.target.closest('.resize-handle')) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);

        const initialMouseX = e.clientX;
        const initialMouseY = e.clientY;
        const initialNodeX = nodePosition.x;
        const initialNodeY = nodePosition.y;

        const handleMouseMove = (moveEvent) => {
            if (isResizing) return;
            const deltaX = (moveEvent.clientX - initialMouseX) / zoom;
            const deltaY = (moveEvent.clientY - initialMouseY) / zoom;

            // Update lifeline position
            setNodes(nds => nds.map(n =>
                n.id === id
                    ? { ...n, position: { x: initialNodeX + deltaX, y: initialNodeY + deltaY } }
                    : n
            ));

            // Call parent drag handler if available
            onLifelineDrag?.(id, deltaX, deltaY);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Handle icon resize
    const handleIconResizeStart = (e) => {
        if (isReadOnly) return;
        e.preventDefault();
        e.stopPropagation();

        const isTouch = e.type === 'touchstart';
        const startX = isTouch ? e.touches[0].clientX : e.clientX;
        const startSize = currentIconSize;

        const handleMouseMove = (moveEvent) => {
            const clientX = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const deltaX = clientX - startX;
            const newSize = Math.max(MIN_ICON_SIZE, Math.min(MAX_ICON_SIZE, startSize + deltaX));

            setNodes(nds => nds.map(n =>
                n.id === id ? { ...n, data: { ...n.data, iconSize: newSize } } : n
            ));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('touchend', handleMouseUp);
        };

        if (isTouch) {
            document.addEventListener('touchmove', handleMouseMove, { passive: false });
            document.addEventListener('touchend', handleMouseUp);
        } else {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

    // Window-scoped mode flags (fallback for compatibility)
    const isInMessageCreationMode = () => window.messageCreationMode || false;
    const isInActivationPlacementMode = () => window.activationPlacementMode || false;

    // Get activation placement handler from window for compatibility
    const getActivationPlacementHandler = () => window.handleActivationPlacementClick;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => { setLabel(data.label); }, [data.label]);

    // ── Click routing ─────────────────────────────────────────────
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isInMessageCreationMode()) {
            onLifelineClick?.(id);
            return;
        }
        if (isInActivationPlacementMode()) {
            getActivationPlacementHandler()?.(id);
            return;
        }

        // Normal selection - also call the lifeline click handler
        setNodes(nds => nds.map(n => ({ ...n, selected: n.id === id })));
        onLifelineClick?.(id);

        // Also emit a custom event for direct selection
        window.dispatchEvent(new CustomEvent('lifelineSelected', {
            detail: { lifelineId: id, type: 'lifeline' }
        }));
    };

    const handleDoubleClick = (e) => {
        if (isReadOnly) return;
        e.preventDefault();
        e.stopPropagation();
        // Double-click opens label editor (only when not in any special mode)
        if (!isInMessageCreationMode() && !isInActivationPlacementMode()) {
            setIsEditing(true);
        }
    };

    const commitLabel = (newLabel) => {
        setNodes(nds => nds.map(n =>
            n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n
        ));
    };

    const handleBlur = () => { setIsEditing(false); commitLabel(label); };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleBlur(); }
        if (e.key === 'Escape') { e.preventDefault(); setIsEditing(false); setLabel(data.label); }
    };

    // ── Handle grid ───────────────────────────────────────────────────────
    // A dense grid of source + target handles along the stem.
    // This ensures every possible Y position has a valid handle,
    // so SSDMessageEdge can always connect regardless of timestamp.
    const gridHandles = useMemo(() => {
        const handles = [];
        // Fixed range up to 5000px ensures all messages can connect
        for (let y = HANDLE_START; y <= MAX_LIFELINE_HEIGHT; y += HANDLE_INTERVAL) {
            handles.push({ y, id: `h-${y}` });
        }
        return handles;
    }, []); // Stable handles, no dependency on currentHeight

    return (
        <div
            className={`group relative flex flex-col items-center select-none ${selected ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
            style={{ zIndex: 50, pointerEvents: 'auto' }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            {/* ── Name Box ──────────────────────────────────────────────── */}
            <div
                className={`
                px-4 py-2 rounded-lg border shadow-card min-w-[110px] text-center
                bg-white border-gray-900 transition-colors
                ${selected ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
                cursor-grab active:cursor-grabbing
            `}
                onMouseDown={handleLifelineDragStart}
            >
                {/* Actor stick figure */}
                {isActor && (
                    <div className="flex justify-center mb-1 relative group">
                        <svg
                            width={currentIconSize}
                            height={currentIconSize * 1.5}
                            viewBox="0 0 30 40"
                            className="text-blue-600"
                        >
                            <circle cx="15" cy="6" r="4" fill="currentColor" />
                            <line x1="15" y1="10" x2="15" y2="22" stroke="currentColor" strokeWidth="2.5" />
                            <line x1="6" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="2.5" />
                            <line x1="15" y1="22" x2="8" y2="34" stroke="currentColor" strokeWidth="2.5" />
                            <line x1="15" y1="22" x2="22" y2="34" stroke="currentColor" strokeWidth="2.5" />
                        </svg>
                        {/* Resize handle */}
                        {!isReadOnly && (
                            <div
                                className="absolute top-0 right-0 w-8 h-8 cursor-ew-resize flex items-center justify-center resize-handle nodrag z-[100] group/iconresize"
                                style={{ transform: 'translate(50%, -50%)' }}
                                onMouseDown={handleIconResizeStart}
                                onTouchStart={handleIconResizeStart}
                                title={`Resize actor icon (Min: ${MIN_ICON_SIZE}px, Max: ${MAX_ICON_SIZE}px)`}
                            >
                                <div className="w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 group-hover/iconresize:bg-blue-600 group-hover/iconresize:scale-150 transition-all" />
                            </div>
                        )}
                    </div>
                )}
                {/* System box icon */}
                {isSystem && (
                    <div className="flex justify-center mb-1 relative group">
                        <svg
                            width={currentIconSize}
                            height={currentIconSize}
                            viewBox="0 0 24 24"
                            className="text-status-green"
                        >
                            <rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                            <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
                            <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        {/* Resize handle */}
                        {!isReadOnly && (
                            <div
                                className="absolute top-0 right-0 w-8 h-8 cursor-ew-resize flex items-center justify-center resize-handle nodrag z-[100] group/iconresize"
                                style={{ transform: 'translate(50%, -50%)' }}
                                onMouseDown={handleIconResizeStart}
                                onTouchStart={handleIconResizeStart}
                                title={`Resize system icon (Min: ${MIN_ICON_SIZE}px, Max: ${MAX_ICON_SIZE}px)`}
                            >
                                <div className="w-2 h-2 bg-status-green/100 rounded-full opacity-0 group-hover:opacity-100 group-hover/iconresize:bg-green-600 group-hover/iconresize:scale-150 transition-all" />
                            </div>
                        )}
                    </div>
                )}
                {/* Object box */}
                {isObject && (
                    <div className="flex justify-center mb-1 relative group">
                        <svg
                            width={currentIconSize}
                            height={currentIconSize}
                            viewBox="0 0 24 24"
                            className="text-purple-600"
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                            <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        {/* Resize handle */}
                        {!isReadOnly && (
                            <div
                                className="absolute top-0 right-0 w-8 h-8 cursor-ew-resize flex items-center justify-center resize-handle nodrag z-[100] group/iconresize"
                                style={{ transform: 'translate(50%, -50%)' }}
                                onMouseDown={handleIconResizeStart}
                                onTouchStart={handleIconResizeStart}
                                title={`Resize object icon (Min: ${MIN_ICON_SIZE}px, Max: ${MAX_ICON_SIZE}px)`}
                            >
                                <div className="w-2 h-2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 group-hover/iconresize:bg-purple-600 group-hover/iconresize:scale-150 transition-all" />
                            </div>
                        )}
                    </div>
                )}

                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        className="w-full text-center text-sm border border-indigo-300 rounded px-1 outline-none font-medium bg-white"
                        autoFocus
                    />
                ) : (
                    <span className="text-sm font-semibold text-ink">{label}</span>
                )}
            </div>

            {/* ── Lifeline stem (dashed vertical line) ──────────────────── */}
            <div className="relative mt-2" style={{ height: `${currentHeight}px` }}>
                {/* Dashed line */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 border-l-2 border-dashed border-gray-400"
                    style={{ height: '100%', top: 0 }}
                />

                {/* Resize handle at bottom - Made larger hit area for better UX */}
                {!isReadOnly && (
                    <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-12 cursor-ns-resize transition-all resize-handle flex items-end justify-center nodrag z-[100] group/resize"
                        style={{ marginBottom: '-16px' }}
                        onMouseDown={handleResizeStart}
                        onTouchStart={handleResizeStart}
                        title="Drag vertically to change lifeline height"
                    >
                        <div className="w-6 h-6 rounded-full opacity-80 shadow-md border-2 border-white bg-surface-30 group-hover/resize:scale-110 group-hover/resize:bg-blue-500 transition-all cursor-ns-resize" />
                    </div>
                )}

                {/* Hover highlight when in special mode */}
                <div
                    className={`absolute inset-0 transition-colors pointer-events-none
                        ${isInMessageCreationMode() || isInActivationPlacementMode()
                            ? 'bg-blue-50/30'
                            : ''}`}
                />
            </div>

            {/* ── Handle grid ───────────────────────────────────────────── */
             /* Dense grid of invisible source+target handles every 10px     */
             /* so every possible message Y has a valid attachment point.    */}
            {gridHandles.map(({ y, id: hid }) => (
                <React.Fragment key={hid}>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={hid}
                        style={{
                            top: `${y}px`,
                            right: '50%',
                            transform: 'translateX(2px)',
                            background: 'transparent',
                            border: 'none',
                            width: 4,
                            height: 4,
                            opacity: 0,
                        }}
                    />
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={hid}
                        style={{
                            top: `${y}px`,
                            left: '50%',
                            transform: 'translateX(-2px)',
                            background: 'transparent',
                            border: 'none',
                            width: 4,
                            height: 4,
                            opacity: 0,
                        }}
                    />
                </React.Fragment>
            ))}

            {/* ── Visible drag handle for connecting lifelines ───────────── */}
            <Handle
                type="source"
                position={Position.Right}
                id="drag-src"
                style={{ top: '160px', right: '-6px', opacity: 0 }}
                className="w-3 h-8 hover:!opacity-30 !bg-blue-400 !border-blue-500 !rounded"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="drag-tgt"
                style={{ top: '160px', left: '-6px', opacity: 0 }}
                className="w-3 h-8 hover:!opacity-30 !bg-blue-400 !border-blue-500 !rounded"
            />
        </div>
    );
};

export default memo(SSDLifelineNode);