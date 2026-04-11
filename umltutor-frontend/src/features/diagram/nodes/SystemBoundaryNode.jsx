import React, { memo, useState, useRef, useEffect } from 'react';
import { useReactFlow, useViewport } from 'reactflow';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { lockSystemName, selectIsCheckingActive, selectConstraintsEnabled } from '../../../features/modes';

import { useCheckingErrors } from '../../../hooks/useCheckingErrors';

// Resizable constants System Boundary
const DEFAULT_BOUNDARY_WIDTH = 500;
const DEFAULT_BOUNDARY_HEIGHT = 600;
const MIN_BOUNDARY_WIDTH = 100;
const MIN_BOUNDARY_HEIGHT = 100;

const SystemBoundaryNode = ({ id, data, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(data.label);
    const inputRef = useRef(null);
    const nodeRef = useRef(null);
    const { setNodes, getNode } = useReactFlow();
    const { zoom } = useViewport();

    const dispatch = useAppDispatch();
    const checkingModeActive = useAppSelector(selectIsCheckingActive);
    const constraintsEnabled = useAppSelector(selectConstraintsEnabled);
    const isReadOnly = data.isReadOnly || false;

    const checkErrors = useCheckingErrors('diagram', id);
    const hasErrors = checkingModeActive && checkErrors.length > 0;

    const currentWidth = data.width || DEFAULT_BOUNDARY_WIDTH;
    const currentHeight = data.height || DEFAULT_BOUNDARY_HEIGHT;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setLabel(data.label);
    }, [data.label]);

    // High-performance Resize Logic
    const handleResizeStart = (e) => {
        if (isReadOnly) return;
        e.preventDefault();
        e.stopPropagation();

        const node = getNode(id);
        if (!node) return;

        let startX = e.clientX;
        let startY = e.clientY;
        let w = data.width || DEFAULT_BOUNDARY_WIDTH;
        let h = data.height || DEFAULT_BOUNDARY_HEIGHT;

        const handleMouseMove = (moveEvent) => {
            const deltaX = (moveEvent.clientX - startX) / zoom;
            const deltaY = (moveEvent.clientY - startY) / zoom;

            w = Math.max(MIN_BOUNDARY_WIDTH, (data.width || DEFAULT_BOUNDARY_WIDTH) + deltaX);
            h = Math.max(MIN_BOUNDARY_HEIGHT, (data.height || DEFAULT_BOUNDARY_HEIGHT) + deltaY);

            if (nodeRef.current) {
                nodeRef.current.style.width = `${w}px`;
                nodeRef.current.style.height = `${h}px`;
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            setNodes(nds => nds.map(n => {
                if (n.id === id) {
                    return {
                        ...n,
                        style: { ...n.style, width: w, height: h },
                        data: { ...n.data, width: w, height: h }
                    };
                }
                return n;
            }));
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleDoubleClick = (e) => {
        if (isReadOnly) return;
        e.preventDefault();
        e.stopPropagation();
        setIsEditing(true);
    };

    const updateLabel = (newLabel) => {
        // Sync to registry but do not lock
        if (constraintsEnabled && newLabel !== data.label) {
            dispatch(lockSystemName({ name: newLabel }));
        }

        if (newLabel !== data.label) {
            setNodes(nds => nds.map(n =>
                n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n
            ));
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
        updateLabel(label);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleBlur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsEditing(false);
            setLabel(data.label);
        }
    };

    return (
        <div
            ref={nodeRef}
            className={`border-2 rounded-sm relative group cursor-pointer animate-none ${hasErrors ? 'border-dashed border-red-500 bg-red-50/10' : 'border-gray-800 bg-gray-50/5'}`}
            style={{
                zIndex: 0,
                width: `${currentWidth}px`,
                height: `${currentHeight}px`
            }}
        >
            {/* Error Badge for Checking Mode */}
            {hasErrors && (
                <div
                    title={checkErrors.map(e => e.message).join('\n')}
                    className="absolute -top-6 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center cursor-help z-[110] shadow-lg animate-bounce pointer-events-auto"
                >
                    ❌
                </div>
            )}

            {/* Title bar - Interactive for editing */}
            <div
                className={`system-title absolute top-[-18px] left-1/2 transform -translate-x-1/2 px-4 py-1 rounded shadow-sm border transition-colors flex items-center gap-2 bg-white border-gray-300 text-gray-900 ${!isReadOnly ? 'cursor-text' : 'cursor-default'}`}
                onDoubleClick={handleDoubleClick}
                style={{
                    zIndex: 5,
                    cursor: 'text'
                }}
            >
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={label}
                        placeholder="Enter name"
                        onChange={(e) => setLabel(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="text-center font-bold border-none outline-none bg-transparent w-full min-w-[100px]"
                        autoFocus
                    />
                ) : (
                    <span className="font-bold text-lg whitespace-nowrap select-none">
                        {label || 'Double click to name system'}
                    </span>
                )}
            </div>

            {/* Resize handle */}
            {!isReadOnly && (
                <div
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center pointer-events-auto opacity-0 group-hover:opacity-100 resize-handle nodrag"
                    style={{ verticalAlign: 'middle', zIndex: 10 }}
                    onMouseDown={handleResizeStart}
                >
                    <div className="w-3 h-3 bg-gray-400 rounded-sm pointer-events-none" />
                </div>
            )}
        </div>
    );
};

export default memo(SystemBoundaryNode);

