import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow, useViewport } from 'reactflow';
import { Lock } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { selectCurrentMode, selectIsCheckingActive } from '../../../features/modes';

import { useCheckingErrors } from '../../../hooks/useCheckingErrors';
import { renameNode } from '../../../features/diagram';

// Resizable constants for Use Case
const DEFAULT_USECASE_WIDTH = 200;
const DEFAULT_USECASE_HEIGHT = 90;
const MIN_USECASE_WIDTH = 80;
const MIN_USECASE_HEIGHT = 40;

const UseCaseNode = ({ id, data, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(data.label);
    const inputRef = useRef(null);
    const nodeRef = useRef(null);
    const { setNodes, getNode } = useReactFlow();
    const { zoom } = useViewport();

    const currentMode = useAppSelector(selectCurrentMode);
    const checkingModeActive = useAppSelector(selectIsCheckingActive);
    const isReadOnly = data.isReadOnly || false;
    const constraintsEnabled = currentMode === 'tutorial';
    const dispatch = useAppDispatch();
    const tutorialModel = useAppSelector(s => s.uml.tutorialModel);
    const developmentModel = useAppSelector(s => s.uml.developmentModel);
    const model = currentMode === 'tutorial' ? tutorialModel : developmentModel;

    const checkErrors = useCheckingErrors('diagram', id);
    const hasErrors = checkingModeActive && checkErrors.length > 0;

    const currentWidth = data.width || DEFAULT_USECASE_WIDTH;
    const currentHeight = data.height || DEFAULT_USECASE_HEIGHT;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setLabel(data.label);
    }, [data.label]);

    // High-performance Resize Logic using direct DOM manipulation
    const handleResizeStart = (e) => {
        if (isReadOnly) return;
        e.preventDefault();
        e.stopPropagation();

        const node = getNode(id);
        if (!node) return;

        let startX = e.clientX;
        let startY = e.clientY;
        let w = data.width || DEFAULT_USECASE_WIDTH;
        let h = data.height || DEFAULT_USECASE_HEIGHT;

        const handleMouseMove = (moveEvent) => {
            const deltaX = (moveEvent.clientX - startX) / zoom;
            const deltaY = (moveEvent.clientY - startY) / zoom;

            w = Math.max(MIN_USECASE_WIDTH, (data.width || DEFAULT_USECASE_WIDTH) + deltaX);
            h = Math.max(MIN_USECASE_HEIGHT, (data.height || DEFAULT_USECASE_HEIGHT) + deltaY);

            if (nodeRef.current) {
                nodeRef.current.style.width = `${w}px`;
                nodeRef.current.style.height = `${h}px`;
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            // Sync to React state once at the end
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
        if (newLabel !== data.label) {
            dispatch(renameNode({ mode: currentMode, nodeId: id, newName: newLabel, nodeType: 'usecase' }));
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

    const isLocked = constraintsEnabled && (model?.descriptions?.[id] || model?.ssds?.[id]);

    return (
        <div
            ref={nodeRef}
            className={`relative bg-white border-2 rounded-full shadow-card flex items-center justify-center cursor-pointer group ${hasErrors ? 'border-dashed border-red-500 bg-status-red/10/50' : 'border-gray-800'}`}
            style={{
                zIndex: 50,
                width: `${currentWidth}px`,
                height: `${currentHeight}px`
            }}
            onDoubleClick={handleDoubleClick}
        >
            <Handle type="target" position={Position.Left} className={`w-2 h-2 !bg-gray-400 ${isReadOnly ? 'opacity-0' : ''}`} />
            <Handle type="source" position={Position.Right} className={`w-2 h-2 !bg-gray-400 ${isReadOnly ? 'opacity-0' : ''}`} />
            <Handle type="target" position={Position.Top} className={`w-2 h-2 !bg-gray-400 ${isReadOnly ? 'opacity-0' : ''}`} />
            <Handle type="source" position={Position.Bottom} className={`w-2 h-2 !bg-gray-400 ${isReadOnly ? 'opacity-0' : ''}`} />

            <div className="text-center w-full px-3">
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
                        className="w-full text-center text-sm bg-transparent border-none outline-none font-bold font-body text-ink"
                        autoFocus
                    />
                ) : (
                    <div className="flex items-center justify-center">
                        <span className="text-sm font-bold font-body text-ink break-words max-w-[140px] block mx-auto select-none pointer-events-none">
                            {label}
                        </span>
                        {isLocked && <Lock size={12} className="text-indigo-500 ml-1" />}
                    </div>
                )}
            </div>

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

export default memo(UseCaseNode);

