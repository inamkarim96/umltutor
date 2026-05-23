import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow, useViewport } from 'reactflow';
import { Lock } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { selectCurrentMode, selectIsCheckingActive, selectConstraintsEnabled } from '../../../features/modes';

import { useCheckingErrors } from '../../../hooks/useCheckingErrors';
import { renameNode } from '../../../features/diagram';

// Resizable constants Actor
const MIN_ACTOR_WIDTH = 100;
const MIN_ACTOR_HEIGHT = 120;
const DEFAULT_ICON_SIZE = 40;

const ActorNode = ({ id, data, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(data.label);
    const inputRef = useRef(null);
    const nodeRef = useRef(null);
    const { setNodes, getNode } = useReactFlow();
    const { zoom } = useViewport();

    const dispatch = useAppDispatch();
    const currentMode = useAppSelector(selectCurrentMode);
    const checkingModeActive = useAppSelector(selectIsCheckingActive);
    const constraintsEnabled = useAppSelector(selectConstraintsEnabled);
    const isReadOnly = data.isReadOnly || false;
    const tutorialModel = useAppSelector(s => s.uml.tutorialModel);
    const developmentModel = useAppSelector(s => s.uml.developmentModel);
    const model = currentMode === 'tutorial' ? tutorialModel : developmentModel;

    const checkErrors = useCheckingErrors('diagram', id);
    const hasErrors = checkingModeActive && checkErrors.length > 0;

    const currentWidth = data.width || MIN_ACTOR_WIDTH;
    const currentHeight = data.height || MIN_ACTOR_HEIGHT;
    const currentIconSize = data.iconSize || DEFAULT_ICON_SIZE;

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
        let w = data.width || MIN_ACTOR_WIDTH;
        let h = data.height || MIN_ACTOR_HEIGHT;

        const handleMouseMove = (moveEvent) => {
            const deltaX = (moveEvent.clientX - startX) / zoom;
            const deltaY = (moveEvent.clientY - startY) / zoom;

            w = Math.max(80, (data.width || MIN_ACTOR_WIDTH) + deltaX);
            h = Math.max(40, (data.height || MIN_ACTOR_HEIGHT) + deltaY);

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
        if (newLabel.trim() && newLabel !== data.label) {
            dispatch(renameNode({ mode: currentMode, nodeId: id, newName: newLabel, nodeType: 'actor' }));
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

    const handleIconResizeStart = (e) => {
        if (isReadOnly) return;
        e.preventDefault();
        e.stopPropagation();

        let startX = e.clientX;
        let size = data.iconSize || DEFAULT_ICON_SIZE;

        const handleMouseMove = (moveEvent) => {
            const deltaX = (moveEvent.clientX - startX) / zoom;
            size = Math.max(20, Math.min(100, (data.iconSize || DEFAULT_ICON_SIZE) + deltaX));

            const svg = nodeRef.current?.querySelector('svg');
            if (svg) {
                svg.setAttribute('width', size.toString());
                svg.setAttribute('height', (size * 1.5).toString());
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, iconSize: size } } : n));
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const isLocked = constraintsEnabled && model && (model.descriptions?.[id] || model.ssds?.[id]);

    return (
        <div
            ref={nodeRef}
            className={`group relative flex flex-col items-center p-2 ${!isReadOnly ? 'cursor-pointer' : 'cursor-default'} ${hasErrors ? 'border-2 border-dashed border-red-500 bg-status-red/10/50 rounded-xl' : ''}`}
            style={{
                zIndex: 50,
                width: `${currentWidth}px`,
                height: `${currentHeight}px`,
                pointerEvents: 'auto'
            }}
            onDoubleClick={handleDoubleClick}
        >
            {/* Error Badge for Checking Mode */}
            {hasErrors && (
                <div
                    title={checkErrors.map(e => e.message).join('\n')}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-status-red/100 text-white text-xs rounded-full flex items-center justify-center cursor-help z-[110] shadow-hover animate-bounce"
                >
                    ❌
                </div>
            )}

            {/* Stick Figure SVG */}
            <div className="relative group/icon flex-shrink-0">
                <svg
                    width={currentIconSize}
                    height={currentIconSize * 1.5}
                    viewBox="0 0 40 60"
                    className="text-ink fill-current pointer-events-none"
                >
                    <circle cx="20" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                    <line x1="20" y1="18" x2="20" y2="35" stroke="currentColor" strokeWidth="2" />
                    <line x1="5" y1="25" x2="35" y2="25" stroke="currentColor" strokeWidth="2" />
                    <line x1="20" y1="35" x2="10" y2="55" stroke="currentColor" strokeWidth="2" />
                    <line x1="20" y1="35" x2="30" y2="55" stroke="currentColor" strokeWidth="2" />
                </svg>
                {!isReadOnly && (
                    <div
                        className="absolute top-0 right-0 w-2 h-2 bg-accent/100 rounded-full cursor-ew-resize hover:bg-accent opacity-0 group-hover/icon:opacity-100 resize-handle nodrag"
                        style={{ transform: 'translate(50%, -50%)' }}
                        onMouseDown={handleIconResizeStart}
                        title="Drag to resize actor icon"
                    />
                )}
            </div>

            {/* Label */}
            <div className="mt-1 min-w-[80px] text-center flex items-center justify-center">
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
                        className="w-full text-center text-sm border border-indigo-300 rounded px-1 outline-none font-medium bg-white"
                        autoFocus
                    />
                ) : (
                    <div className="flex items-center">
                        <span className="text-sm font-medium text-ink select-none pointer-events-none">{label}</span>
                        {isLocked && <Lock size={12} className="text-indigo-500 ml-1" />}
                    </div>
                )}
            </div>

            {/* Connection Handles */}
            <Handle type="target" position={Position.Left} id="left" className={`w-2 h-2 !bg-gray-400 ${isReadOnly ? 'opacity-0' : ''}`} />
            <Handle type="source" position={Position.Right} id="right" className={`w-2 h-2 !bg-gray-400 ${isReadOnly ? 'opacity-0' : ''}`} />

            {/* Resize handle */}
            {!isReadOnly && (
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-100 resize-handle nodrag"
                    style={{ transform: 'translate(25%, 25%)', zIndex: 60 }}
                    onMouseDown={handleResizeStart}
                >
                    <div className="w-2 h-2 bg-gray-400 rounded-sm pointer-events-none" />
                </div>
            )}
        </div>
    );
};

export default memo(ActorNode);

