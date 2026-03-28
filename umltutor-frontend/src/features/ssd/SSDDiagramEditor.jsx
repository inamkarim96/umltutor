import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import ReactFlow, {
    Background,
    Controls,

    useNodesState,
    useEdgesState,
    ReactFlowProvider,

    useOnViewportChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import SSDLifelineNode from './nodes/SSDLifelineNode';
import SSDMessageEdge from './edges/SSDMessageEdge';
import SSDToolbar from './SSDToolbar';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
    updateSSD,
    selectTutorialModel,
    selectDevelopmentModel,
} from '../../features/diagram';
import { selectCurrentMode, selectIsTutorialMode } from '../../features/modes';
import { X, Search, Play } from 'lucide-react';
import CheckingModePanel from '../checking/CheckingModePanel';
import { runSubmissionCheckLogic } from '../submissions/submissionLogic';


// ─────────────────────────────────────────────────────────────────────────────
// Types / Constants
// ─────────────────────────────────────────────────────────────────────────────
const MESSAGE_BASE_Y = 160;
const MESSAGE_SPACING = 40;
const DEFAULT_ACT_H = 60;

// Memoize node types and edge types to prevent recreation
const nodeTypes = {
    lifeline: SSDLifelineNode,
    actor: SSDLifelineNode,
    system: SSDLifelineNode,
    object: SSDLifelineNode,
};

const edgeTypes = {
    ssdMessage: SSDMessageEdge,
};

const uid = () => crypto.randomUUID();

// ─────────────────────────────────────────────────────────────────────────────
// Activation Bar Overlay
// ─────────────────────────────────────────────────────────────────────────────

const ActivationOverlay = ({
    bars,
    viewportRef,
    nodePositions,        // plain object (React state), triggers re-renders on lifeline move
    selectedBarId,
    onSelect,
    onDrag,
    onResize,
    isReadOnly = false
}) => {
    const [dragState, setDragState] = useState(null);

    const startDrag = useCallback((e, barId, type) => {
        if (isReadOnly) return;
        const bar = bars.find(b => b.id === barId);
        if (!bar) return;
        setDragState({
            barId,
            type,
            startX: bar.startX || 0,
            startY: bar.startY,
            startHeight: bar.height || DEFAULT_ACT_H,
            mouseX: e.clientX,
            mouseY: e.clientY
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
            setDragState(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
        } else if (dragState.type === 'resize') {
            onResize(dragState.barId, deltaY);
            setDragState(prev => prev ? { ...prev, mouseY: e.clientY, startHeight: prev.startHeight + deltaY } : null);
        }
    }, [dragState, onDrag, onResize, viewportRef]);

    const handleMouseUp = useCallback(() => {
        setDragState(null);
    }, []);

    useEffect(() => {
        if (dragState) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragState, handleMouseMove, handleMouseUp]);

    // Guard: need viewport and at least an empty positions map
    if (!viewportRef.current) return null;

    const vp = viewportRef.current;
    // nodePositions is plain state — no .current needed

    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 25 }}>
            {bars.map(bar => {
                const zoom = vp.zoom;
                let screenX, screenY;

                if (bar.startX !== undefined && bar.lifelineId === 'free-floating') {
                    // Free-floating activation bar - use startX directly
                    screenX = (bar.startX * zoom + vp.x) - (7 * zoom); // Center the 14px width bar
                    screenY = (bar.startY * zoom + vp.y);
                } else {
                    // Lifeline-bound activation bar
                    const pos = nodePositions[bar.lifelineId];
                    if (!pos) return null;

                    // Center activation bar on lifeline (lifeline width is 110px, so center is 55px)
                    const lifelineCenterX = pos.x + 55;
                    // All bars sit at the same X — no horizontal depth offset
                    screenX = (lifelineCenterX * zoom + vp.x) - (7 * zoom);
                    screenY = (pos.y * zoom + vp.y) + bar.startY * zoom;
                }

                const activationWidth = 14; // Fixed width for activation bars
                // Compute display height: endY takes priority over height field
                const barHeight = bar.endY
                    ? (bar.endY - bar.startY) * zoom
                    : Math.max(20 * zoom, (bar.height || DEFAULT_ACT_H) * zoom);
                const actualHeight = Math.max(20 * zoom, barHeight);

                // Add visual indicator for selected activation
                const isSelected = selectedBarId === bar.id;
                const HANDLE_H = 12; // px — large enough to grab comfortably

                return (
                    <g key={bar.id}>
                        {/* Activation bar body — transparent fill so arrows show through */}
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

                        {/* Resize handle — large hit area at bottom with visible grip */}
                        {!isReadOnly && (
                            <g
                                style={{ pointerEvents: 'all', cursor: 'ns-resize' }}
                                onMouseDown={(e) => { e.stopPropagation(); startDrag(e, bar.id, 'resize'); }}
                            >
                                {/* Invisible large hit zone */}
                                <rect
                                    x={screenX - 4 * zoom}
                                    y={screenY + actualHeight - HANDLE_H * zoom / 2}
                                    width={(activationWidth + 8) * zoom}
                                    height={HANDLE_H * zoom}
                                    fill="transparent"
                                />
                                {/* Visible grip bar */}
                                <rect
                                    x={screenX}
                                    y={screenY + actualHeight - 5 * zoom}
                                    width={activationWidth * zoom}
                                    height={5 * zoom}
                                    fill={isSelected ? '#3B82F6' : '#6B7280'}
                                    rx={2 * zoom}
                                />
                                {/* Grip tick lines */}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const SSDDiagramEditorInner = ({
    model,
    isReadOnly = false,
    availableUseCases,
    activeUseCaseId,
    onUseCaseChange,
    highlights = []
}) => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector(selectCurrentMode);

    // Core state
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [activationBars, setActivationBars] = useState([]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [activeTool, setActiveTool] = useState(null);
    const [selectedBarId, setSelectedBarId] = useState(null);
    const [dragState, setDragState] = useState(null);
    // State-based node positions so ActivationOverlay re-renders when lifeline moves
    const [nodePositionsState, setNodePositionsState] = useState({});

    const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });
    const nodePositionsRef = useRef({});
    const flowInstanceRef = useRef(null);
    const lastLoadedRef = useRef('');

    // Apply highlight styling (read-only review)
    useEffect(() => {
        if (!isReadOnly) return;
        if (!highlights || highlights.length === 0) return;

        const severityColor = (t) => {
            if (t === 'error') return '#ef4444';
            if (t === 'warning') return '#f59e0b';
            return '#3b82f6';
        };
        const map = new Map(highlights.map(h => [h.elementId, h.type]));

        setNodes((nds) => nds.map((n) => {
            const t = map.get(n.id);
            if (!t) return n;
            const color = severityColor(t);
            return {
                ...n,
                style: {
                    ...(n.style || {}),
                    outline: `3px solid ${color}`,
                    outlineOffset: '2px'
                }
            };
        }));

        setEdges((eds) => eds.map((e) => {
            const t = map.get(e.id);
            if (!t) return e;
            const color = severityColor(t);
            return {
                ...e,
                style: {
                    ...(e.style || {}),
                    stroke: color,
                    strokeWidth: 3
                }
            };
        }));
    }, [highlights, isReadOnly, setNodes, setEdges]);

    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Functions for UML SSD Compliance
    // ─────────────────────────────────────────────────────────────────────────────
    const getDefaultLabel = (messageType) => {
        switch (messageType) {
            case 'call': return '';
            case 'return': return '';
            case 'async': return 'async()';
            case 'self': return 'self()';
            case 'create': return '«create»';
            case 'delete': return '«destroy»';
            default: return '';
        }
    };

    // NEW: Get actor and system lifelines for SSD mode
    const getActorAndSystemLifelines = () => {
        const actor = nodes.find(n => n.data.lifelineType === 'actor');
        const system = nodes.find(n => n.data.lifelineType === 'system');
        return { actor, system };
    };

    // NEW: Enforce SSD mode restrictions
    const enforceSSDRules = (fromId, toId, messageType) => {
        const { actor, system } = getActorAndSystemLifelines();

        // In SSD mode, only allow Actor <-> System communication
        if (messageType === 'call') {
            return fromId === actor?.id && toId === system?.id;
        }
        if (messageType === 'return') {
            return fromId === system?.id && toId === actor?.id;
        }

        return false;
    };

    const getNextYPosition = () => {
        const lastMessage = edges.length > 0 ? edges.reduce((last, current) => {
            const lastY = last.data?.y || MESSAGE_BASE_Y;
            const currentY = current.data?.y || MESSAGE_BASE_Y;
            return currentY > lastY ? current : last;
        }) : null;
        return lastMessage ? (lastMessage.data?.y || MESSAGE_BASE_Y) + MESSAGE_SPACING : MESSAGE_BASE_Y;
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Actions
    // ─────────────────────────────────────────────────────────────────────────────
    const createCallMessage = () => {
        console.log('Creating Call Message...');
        const { actor, system } = getActorAndSystemLifelines();

        if (!actor || !system) {
            console.warn('Call messages require both Actor and System lifelines');
            return;
        }

        // Enforce SSD rules
        if (!enforceSSDRules(actor.id, system.id, 'call')) {
            console.warn('Call messages must go from Actor to System in SSD mode');
            return;
        }

        const nextY = getNextYPosition();

        const newEdge = {
            id: uid(),
            source: actor.id,
            target: system.id,
            sourceHandle: `h-${nextY}`,
            targetHandle: `h-${nextY}`,
            type: 'ssdMessage',
            label: getDefaultLabel('call'),
            data: {
                messageType: 'call',
                y: nextY,
                text: getDefaultLabel('call'),
                order: edges.length,
                isReturn: false,
                fromLifelineId: actor.id,
                toLifelineId: system.id,
                style: { strokeDasharray: undefined, strokeWidth: 2 }
            },
            zIndex: 100,
        };

        setEdges(eds => [...eds, newEdge]);
    };

    const createReturnMessage = () => {
        console.log('Creating Return Message...');
        const { actor, system } = getActorAndSystemLifelines();

        if (!actor || !system) {
            console.warn('Return messages require both Actor and System lifelines');
            return;
        }

        // Enforce SSD rules - Return must go from System to Actor
        if (!enforceSSDRules(system.id, actor.id, 'return')) {
            console.warn('Return messages must go from System to Actor in SSD mode');
            return;
        }

        const nextY = getNextYPosition();

        // Find the latest activation on system to attach return message
        const latestActivation = activationBars
            .filter(bar => bar.lifelineId === system.id && !bar.endY)
            .sort((a, b) => b.startY - a.startY)[0];

        // Find the latest call message to the system to reference it
        const latestCall = edges
            .filter(e => e.data?.messageType === 'call' && e.target === system.id)
            .sort((a, b) => (b.data?.y || 0) - (a.data?.y || 0))[0];

        const newEdge = {
            id: uid(),
            source: system.id,
            target: actor.id,
            sourceHandle: `h-${nextY}`,
            targetHandle: `h-${nextY}`,
            type: 'ssdMessage',
            label: getDefaultLabel('return'),
            data: {
                messageType: 'return',
                y: nextY,
                text: getDefaultLabel('return'),
                attachedActivationId: latestActivation?.id,
                order: edges.length,
                isReturn: true,
                fromLifelineId: system.id,
                toLifelineId: actor.id,
                style: { strokeDasharray: '6,4', strokeWidth: 2 }
            },
            zIndex: 100,
        };

        setEdges(eds => [...eds, newEdge]);

        // Auto-close activation
        if (latestActivation) {
            setActivationBars(prev => prev.map(bar =>
                bar.id === latestActivation.id
                    ? { ...bar, endY: nextY }
                    : bar
            ));
        }
    };

    const createSelfMessage = () => {
        console.log('Creating Self Message...');

        // Prefer System lifeline. If none, use the first available lifeline.
        const { system } = getActorAndSystemLifelines();
        const targetNode = system || nodes[0];

        if (!targetNode) {
            console.warn('Self message requires at least one lifeline in the diagram.');
            return;
        }

        const nextY = getNextYPosition();

        // Optional: attach to a selected or existing activation bar on this lifeline
        const attachedActivation = selectedBarId
            ? activationBars.find(bar => bar.id === selectedBarId && bar.lifelineId === targetNode.id)
            : activationBars.find(bar => bar.lifelineId === targetNode.id);

        const newEdge = {
            id: uid(),
            source: targetNode.id,
            target: targetNode.id,   // self-loop: source === target
            sourceHandle: `h-${nextY}`,
            targetHandle: `h-${nextY}`,
            type: 'ssdMessage',
            label: getDefaultLabel('self'),
            data: {
                messageType: 'self',
                y: nextY,
                text: getDefaultLabel('self'),
                attachedActivationId: attachedActivation?.id,
                order: edges.length,
                isReturn: false,
                fromLifelineId: targetNode.id,
                toLifelineId: targetNode.id,
                style: { strokeDasharray: undefined, strokeWidth: 2 }
            },
            zIndex: 100,
        };

        setEdges(eds => [...eds, newEdge]);
        setSelectedElement({ id: newEdge.id, type: 'message' });
    };


    const createActivationBar = () => {
        // Always anchor to the System lifeline, fall back to any available lifeline
        const { system } = getActorAndSystemLifelines();
        const targetNode = system || nodes[0];

        if (!targetNode) {
            console.warn('Activation bar requires at least one lifeline in the diagram.');
            return;
        }

        // Count existing bars on this lifeline to stack them visually (depth)
        const nextY = getNextYPosition();
        const newActivation = {
            id: uid(),
            lifelineId: targetNode.id,
            startY: nextY,
            height: DEFAULT_ACT_H,
            depth: 0  // Always anchored at same X; bars stack vertically only
        };
        setActivationBars(prev => [...prev, newActivation]);

        setSelectedBarId(newActivation.id);
        setSelectedElement({ id: newActivation.id, type: 'activation' });
    };

    const deleteSelectedElement = () => {
        if (!selectedElement) {
            console.warn('No element selected for deletion');
            return;
        }

        if (selectedElement.type === 'lifeline') {
            setNodes(prev => prev.filter(n => n.id !== selectedElement.id));
            setEdges(prev => prev.filter(e =>
                e.data?.fromLifelineId !== selectedElement.id &&
                e.data?.toLifelineId !== selectedElement.id
            ));
            setActivationBars(prev => prev.filter(bar => bar.lifelineId !== selectedElement.id));
        } else if (selectedElement.type === 'message') {
            setEdges(prev => prev.filter(e => e.id !== selectedElement.id));
        } else if (selectedElement.type === 'activation') {
            setActivationBars(prev => prev.filter(bar => bar.id !== selectedElement.id));
        }

        setSelectedElement(null);
    };

    const clearAll = () => {
        setNodes([]);
        setEdges([]);
        setActivationBars([]);
        setSelectedElement(null);
        setActiveTool(null);
        setSelectedBarId(null);
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // Event Handlers
    // ─────────────────────────────────────────────────────────────────────────────
    const handleNodeClick = useCallback((event, node) => {
        if (isReadOnly) return;

        setSelectedElement({ id: node.id, type: 'lifeline' });

        if (activeTool === 'activation') {
            // Activation tool: create a bar on the clicked node's lifeline
            createActivationBar();
            setActiveTool(null);
        } else if (activeTool === 'create' && dragState) {
            if (dragState.sourceId && dragState.sourceId !== node.id) {
                const nextY = getNextYPosition();
                const newNodeX = node.position.x;
                const newNodeId = uid();

                const newNode = {
                    id: newNodeId,
                    type: 'lifeline',
                    position: { x: newNodeX, y: 50 },
                    data: { label: 'Object', lifelineType: 'object' },
                    zIndex: 10
                };
                setNodes(nds => [...nds, newNode]);

                const newEdge = {
                    id: uid(),
                    source: dragState.sourceId,
                    target: newNodeId,
                    type: 'ssdMessage',
                    label: getDefaultLabel('create'),
                    data: {
                        messageType: 'create',
                        y: nextY,
                        text: getDefaultLabel('create'),
                        order: edges.length,
                        isReturn: false,
                        fromLifelineId: dragState.sourceId,
                        toLifelineId: newNodeId,
                        style: { strokeDasharray: undefined, strokeWidth: 2 }
                    },
                    zIndex: 100,
                };
                setEdges(eds => [...eds, newEdge]);
                setDragState(null);
                setActiveTool(null);
            }
        } else if (activeTool === 'create' && !dragState) {
            setDragState({ sourceId: node.id, targetId: null, mouseX: event.clientX, mouseY: event.clientY });
        }
    }, [activeTool, dragState, edges, isReadOnly, setNodes, setEdges]);

    const handleCanvasClick = useCallback((event) => {
        if (isReadOnly) return;

        setSelectedElement(null);

        // Canvas click: just clear selection (activation bars are now created via toolbar button)
        if (activeTool === 'activation') {
            setActiveTool(null);
            return;
        }

        if (activeTool === 'create' && dragState) {
            const nextY = getNextYPosition();
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const newNodeId = uid();

            const newNode = {
                id: newNodeId,
                type: 'lifeline',
                position: { x: x, y: 50 },
                data: { label: `Object ${nodes.filter(n => n.data.lifelineType === 'object').length + 1}`, lifelineType: 'object' },
                zIndex: 10
            };
            setNodes(nds => [...nds, newNode]);

            const newEdge = {
                id: uid(),
                source: dragState.sourceId,
                target: newNodeId,
                type: 'ssdMessage',
                label: getDefaultLabel('create'),
                data: {
                    messageType: 'create',
                    y: nextY,
                    text: getDefaultLabel('create'),
                    order: edges.length,
                    isReturn: false,
                    fromLifelineId: dragState.sourceId,
                    toLifelineId: newNodeId,
                    style: { strokeDasharray: undefined, strokeWidth: 2 }
                },
                zIndex: 100,
            };
            setEdges(eds => [...eds, newEdge]);
            setDragState(null);
            setActiveTool(null);
            return;
        }

        if (dragState) {
            setDragState(null);
            setActiveTool(null);
        }
    }, [activeTool, dragState, edges, isReadOnly, nodes, setNodes, setEdges]);

    const handleActivationSelect = useCallback((barId) => {
        setSelectedElement({ id: barId, type: 'activation' });
        setSelectedBarId(barId);
    }, []);

    const handleActivationDrag = useCallback((barId, deltaX, deltaY) => {
        setActivationBars(prev => prev.map(bar =>
            bar.id === barId
                ? {
                    ...bar,
                    ...(bar.startX !== undefined && bar.lifelineId === 'free-floating'
                        ? { startX: (bar.startX || 0) + deltaX }
                        : {}
                    ),
                    startY: bar.startY + deltaY,
                    endY: bar.endY ? bar.endY + deltaY : undefined
                }
                : bar
        ));
    }, []);

    const handleActivationResize = useCallback((barId, deltaH) => {
        setActivationBars(prev => prev.map(bar => {
            if (bar.id !== barId) return bar;
            if (bar.endY !== undefined && bar.endY !== null) {
                // Bar has endY set (auto-closed by a return message):
                // Update endY so the rendered height (endY - startY) changes
                return { ...bar, endY: Math.max(bar.startY + 20, bar.endY + deltaH) };
            }
            // Bar uses free height field
            return { ...bar, height: Math.max(20, (bar.height || DEFAULT_ACT_H) + deltaH) };
        }));
    }, []);

    // ─────────────────────────────────────────────────────────────────────────────
    // Effects
    // ─────────────────────────────────────────────────────────────────────────────
    useOnViewportChange({
        onChange: (viewport) => {
            viewportRef.current = viewport;
        }
    });

    useEffect(() => {
        const ssdData = model?.ssds?.[activeUseCaseId];
        if (!ssdData) return;

        const dataString = JSON.stringify(ssdData);
        if (dataString === lastLoadedRef.current) return;

        const newNodes = ssdData.lifelines?.map((lifeline, index) => ({
            id: lifeline.id || uid(),
            type: 'lifeline',
            position: (lifeline.x !== undefined && lifeline.y !== undefined)
                ? { x: lifeline.x, y: lifeline.y }
                : { x: 100 + index * 220, y: 50 },
            data: {
                label: lifeline.label || lifeline.name || `Lifeline ${index + 1}`,
                lifelineType: lifeline.type,
                height: lifeline.height || 150,
                iconSize: lifeline.iconSize || 48,
                isReadOnly: isReadOnly // Pass read-only state to node
            },
            zIndex: 10
        })) || [];

        const newEdges = ssdData.messages?.map((msg) => {
            const y = msg.y || msg.yPosition || msg.positionY || MESSAGE_BASE_Y;
            return {
                id: msg.id || uid(),
                source: msg.fromLifelineId,
                target: msg.toLifelineId,
                sourceHandle: `h-${y}`,
                targetHandle: `h-${y}`,
                type: 'ssdMessage',
                label: msg.text || msg.label || msg.name,
                data: {
                    messageType: msg.type,
                    y: y,
                    text: msg.text || msg.label || msg.name,
                    attachedActivationId: msg.attachedActivationId,
                    order: msg.order,
                    isReturn: msg.type === 'return',
                    fromLifelineId: msg.fromLifelineId,
                    toLifelineId: msg.toLifelineId,
                    style: msg.style
                },
                zIndex: 100
            };
        }) || [];

        setNodes(newNodes);
        setEdges(newEdges);
        setActivationBars(ssdData.activations || []);

        lastLoadedRef.current = dataString;

        // Ensure visibility and correct scaling after layout settles
        if (isReadOnly && flowInstanceRef.current) {
            setTimeout(() => {
                flowInstanceRef.current.fitView({ padding: 0.1 });
            }, 50);
        }
    }, [model?.ssds, activeUseCaseId, setNodes, setEdges, isReadOnly]);

    const isSSDDataEqual = (newSSD, oldSSD) => {
        if (!newSSD && !oldSSD) return true;
        if (!newSSD || !oldSSD) return false;

        if (newSSD.lifelines?.length !== oldSSD.lifelines?.length) return false;
        for (let i = 0; i < (newSSD.lifelines?.length || 0); i++) {
            const nl = newSSD.lifelines[i];
            const ol = oldSSD.lifelines[i];
            if (!ol || nl.id !== ol.id || nl.label !== ol.label || nl.type !== ol.type || nl.height !== ol.height || nl.iconSize !== ol.iconSize || nl.x !== ol.x || nl.y !== ol.y) return false;
        }

        if (newSSD.messages?.length !== oldSSD.messages?.length) return false;
        if (JSON.stringify(newSSD.messages) !== JSON.stringify(oldSSD.messages)) return false;

        if (newSSD.activations?.length !== oldSSD.activations?.length) return false;
        if (JSON.stringify(newSSD.activations) !== JSON.stringify(oldSSD.activations)) return false;

        return true;
    };

    const syncTimeoutRef = useRef(null);

    useEffect(() => {
        if (isReadOnly) return;
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(() => {
            const ssdData = {
                lifelines: nodes.map(n => ({
                    id: n.id,
                    label: n.data.label,
                    type: n.data.lifelineType,
                    height: n.data.height,
                    iconSize: n.data.iconSize,
                    x: n.position.x,
                    y: n.position.y
                })),
                messages: edges.map(e => {
                    const messageType = e.data?.messageType;
                    let ssdMessageType;

                    switch (messageType) {
                        case 'call': ssdMessageType = 'synchronous'; break;
                        case 'return': ssdMessageType = 'return'; break;
                        case 'self': ssdMessageType = 'self'; break;
                        case 'create': ssdMessageType = 'create'; break;
                        case 'delete': ssdMessageType = 'delete'; break;
                        case 'async': ssdMessageType = 'asynchronous'; break;
                        default: ssdMessageType = 'synchronous'; break;
                    }

                    const labelValue = (typeof e.label === 'string' ? e.label : String(e.label || '')) || e.data?.text || '';
                    return {
                        id: e.id,
                        type: ssdMessageType,
                        fromLifelineId: e.data?.fromLifelineId,
                        toLifelineId: e.data?.toLifelineId,
                        name: labelValue,
                        text: labelValue,
                        label: labelValue,
                        order: e.data?.order || 0,
                        positionY: e.data?.y,
                        isReturn: messageType === 'return'
                    };
                }),
                activations: activationBars.map(bar => ({
                    participantId: bar.lifelineId,
                    startMessageId: bar.id,
                    depthLevel: bar.depth || 0,
                    startY: bar.startY,
                    endY: bar.endY,
                    height: bar.height
                }))
            };

            const currentSSDData = model?.ssds?.[activeUseCaseId];
            if (!isSSDDataEqual(ssdData, currentSSDData)) {
                if (activeUseCaseId) {
                    dispatch(updateSSD({ mode, id: activeUseCaseId, ssd: ssdData }));
                }
                lastLoadedRef.current = JSON.stringify(ssdData);
            }
        }, 500);

        return () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [nodes, edges, activationBars, model, dispatch, mode, activeUseCaseId, isReadOnly]);

    useEffect(() => {
        const positions = {};
        nodes.forEach(node => {
            positions[node.id] = {
                x: node.position.x,
                y: node.position.y,
                height: node.data?.height || 150,
            };
        });
        nodePositionsRef.current = positions;
        // Also update React state so ActivationOverlay re-renders on lifeline drag/resize
        setNodePositionsState(positions);
    }, [nodes]);

    // Expose activation bars to window so SSDMessageEdge can snap arrows to bar boundaries
    useEffect(() => {
        window.__ssdActivationBars = activationBars;
    }, [activationBars]);

    const updateMessageY = useCallback((messageId, value, isAbsolute = false) => {
        setEdges(prevEdges => {
            const updatedEdges = prevEdges.map(edge => {
                if (edge.id === messageId) {
                    const newY = isAbsolute ? value : (edge.data?.y || 0) + value;
                    const deltaY = newY - (edge.data?.y || 0);
                    const updatedEdge = {
                        ...edge,
                        data: {
                            ...edge.data,
                            y: newY
                        }
                    };

                    if (edge.data?.messageType === 'call' && edge.data?.attachedActivationId) {
                        const attachedId = edge.data?.attachedActivationId;
                        setActivationBars(prevBars =>
                            prevBars.map(bar =>
                                bar.id === attachedId
                                    ? { ...bar, startY: newY, endY: bar.endY ? bar.endY + deltaY : undefined }
                                    : bar
                            )
                        );
                    }

                    return updatedEdge;
                }
                return edge;
            });

            // Re-sort all edges based on Y position and update their order and handles
            return updatedEdges
                .sort((a, b) => (a.data?.y || 0) - (b.data?.y || 0))
                .map((edge, index) => {
                    const exactY = edge.data?.y || 0;
                    const snappedY = Math.round(exactY / 10) * 10;
                    return {
                        ...edge,
                        sourceHandle: `h-${snappedY}`,
                        targetHandle: `h-${snappedY}`,
                        data: {
                            ...edge.data,
                            y: exactY, // Preserve exact Y for smooth rendering!
                            order: index
                        }
                    };
                });
        });
    }, [setEdges]);

    const snapMessageY = useCallback((messageId) => {
        setEdges(prevEdges => prevEdges.map(edge => {
            if (edge.id === messageId) {
                const snappedY = Math.round((edge.data?.y || 0) / 10) * 10;
                const deltaY = snappedY - (edge.data?.y || 0);

                if (edge.data?.messageType === 'call' && edge.data?.attachedActivationId && deltaY !== 0) {
                    const attachedId = edge.data?.attachedActivationId;
                    setActivationBars(prevBars =>
                        prevBars.map(bar =>
                            bar.id === attachedId
                                ? { ...bar, startY: snappedY, endY: bar.endY ? bar.endY + deltaY : undefined }
                                : bar
                        )
                    );
                }

                return {
                    ...edge,
                    data: {
                        ...edge.data,
                        y: snappedY
                    }
                };
            }
            return edge;
        }));
    }, [setEdges]);

    useEffect(() => {
        window.activeTool = activeTool;
        window.handleLifelineClick = handleNodeClick;
        window.handleActivationPlacementClick = createActivationBar;
        window.updateMessageY = updateMessageY;
        window.snapMessageY = snapMessageY;
    }, [activeTool, handleNodeClick, updateMessageY, snapMessageY]);

    useEffect(() => {
        const handleLifelineSelected = (event) => {
            const { lifelineId, type } = event.detail;
            setSelectedElement({ id: lifelineId, type });
        };

        // NOTE: We do NOT listen to lifelineResize here.
        // Activation bars use absolute canvas Y coordinates (bar.startY).
        // When a lifeline grows taller, bars stay exactly where they are
        // on the canvas — which is the correct UML behaviour.
        window.addEventListener('lifelineSelected', handleLifelineSelected);

        return () => {
            window.removeEventListener('lifelineSelected', handleLifelineSelected);
        };
    }, []);

    return (
        <div className="flex-1 flex flex-col relative h-[600px] bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            {!isReadOnly && (
                <div className="px-6 py-4 bg-slate-50 dark:bg-gray-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-30">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-black text-slate-500 uppercase tracking-wider">Select Use Case</label>
                        <select
                            value={activeUseCaseId || ''}
                            onChange={(e) => onUseCaseChange(e.target.value)}
                            className="bg-white dark:bg-gray-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="" disabled>Choose a Use Case</option>
                            {availableUseCases.map((uc) => (
                                <option key={uc.id} value={uc.id}>{uc.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-xs font-bold text-slate-400 italic">Diagram logic is now isolated to this Use Case.</div>
                </div>
            )}

            <div className="flex-1 relative flex flex-col h-full">
                {!isReadOnly && (
                    <SSDToolbar
                        isReadOnly={isReadOnly}
                        onAddActor={() => {
                            const totalCount = nodes.filter(n => n.type === 'lifeline').length;
                            const newNode = {
                                id: uid(),
                                type: 'lifeline',
                                position: { x: 100 + totalCount * 220, y: 50 },
                                data: {
                                    label: 'Actor',
                                    lifelineType: 'actor',
                                    height: 150
                                },
                                zIndex: 10
                            };
                            setNodes(nds => [...nds, newNode]);
                        }}
                        onAddSystem={() => {
                            const totalCount = nodes.filter(n => n.type === 'lifeline').length;
                            const newNode = {
                                id: uid(),
                                type: 'lifeline',
                                position: { x: 100 + totalCount * 220, y: 50 },
                                data: {
                                    label: 'System',
                                    lifelineType: 'system',
                                    height: 150
                                },
                                zIndex: 10
                            };
                            setNodes(nds => [...nds, newNode]);
                        }}
                        onAddObject={() => {
                            const totalCount = nodes.filter(n => n.type === 'lifeline').length;
                            const newNode = {
                                id: uid(),
                                type: 'lifeline',
                                position: { x: 100 + totalCount * 220, y: 50 },
                                data: {
                                    label: 'Object',
                                    lifelineType: 'object',
                                    height: 150
                                },
                                zIndex: 10
                            };
                            setNodes(nds => [...nds, newNode]);
                        }}
                        onDelete={deleteSelectedElement}
                        onClear={clearAll}
                        onAddActivation={createActivationBar}
                        hasSelection={!!selectedElement}
                        hasEdgeSelection={selectedElement?.type === 'message'}
                        hasActivationSelection={selectedElement?.type === 'activation'}
                        onClearAll={clearAll}
                        activeTool={activeTool}
                        onSelectTool={setActiveTool}
                        onCreateCall={createCallMessage}
                        onCreateReturn={createReturnMessage}
                        onCreateSelf={createSelfMessage}
                    />
                )}
                <div data-testid="ssd-canvas" data-usecase-id={activeUseCaseId} className="flex-1 h-full min-h-0 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={isReadOnly ? undefined : onNodesChange}
                        onEdgesChange={isReadOnly ? undefined : onEdgesChange}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={(event, edge) => {
                            if (isReadOnly) return;
                            setSelectedElement({ id: edge.id, type: 'message' });
                        }}
                        onPaneClick={handleCanvasClick}
                        onInit={(instance) => flowInstanceRef.current = instance}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        fitView={isReadOnly}
                        fitViewOptions={{ padding: 0.1 }}
                        attributionPosition="bottom-left"
                        minZoom={0.1}
                        maxZoom={2}
                        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                        style={{ width: '100%', height: '100%' }}
                        nodesDraggable={!isReadOnly}
                        elementsSelectable={!isReadOnly}
                    >
                        {!isReadOnly && <Background />}
                        {!isReadOnly && <Controls />}
                    </ReactFlow>
                    <ActivationOverlay
                        bars={activationBars}
                        viewportRef={viewportRef}
                        nodePositions={nodePositionsState}
                        selectedBarId={selectedBarId}
                        onSelect={handleActivationSelect}
                        onDrag={handleActivationDrag}
                        onResize={handleActivationResize}
                        isReadOnly={isReadOnly}
                    />
                </div>
            </div>
        </div>
    );
};

export const SSDDiagramEditor = ({
    assignmentId,
    isReadOnly = false,
    modelOverride = null,
    highlights = [],
    isCheckingActive = false,
    reportOverride = null,
    onRunChecker = null,
    onLocalReport = null
}) => {
    const mode = useAppSelector(selectCurrentMode);
    const isTutorialMode = useAppSelector(selectIsTutorialMode);
    const tutorialModel = useAppSelector(selectTutorialModel);
    const developmentModel = useAppSelector(selectDevelopmentModel);
    const [isChecking, setIsChecking] = useState(false);
    const model = modelOverride || (mode === 'tutorial' ? tutorialModel : developmentModel);

    const ssds = model?.ssds || {};

    const useCaseNodes = useMemo(() =>
        model?.diagram?.nodes?.filter(node => node.type === 'usecase' || node.type === 'useCase') || [],
        [model?.diagram?.nodes]);

    const [activeBlocks, setActiveBlocks] = useState([]);

    // Sort IDs by visual position in the diagram (Top-to-Bottom, Left-to-Right)
    const getSortedIds = useCallback((ids) => {
        if (!ids || ids.length === 0) return [];
        return [...ids].sort((a, b) => {
            const nodeA = useCaseNodes.find(n => n.id === a);
            const nodeB = useCaseNodes.find(n => n.id === b);
            if (!nodeA || !nodeB) return 0;
            const posA = nodeA.position || { x: 0, y: 0 };
            const posB = nodeB.position || { x: 0, y: 0 };
            return (posA.y - posB.y) || (posA.x - posB.x);
        });
    }, [useCaseNodes]);

    useEffect(() => {
        const existingIds = Object.keys(ssds);
        if (existingIds.length > 0) {
            setActiveBlocks(getSortedIds(existingIds));
        } else if (useCaseNodes.length > 0) {
            const sortedNodes = [...useCaseNodes].sort((a, b) => {
                const posA = a.position || { x: 0, y: 0 };
                const posB = b.position || { x: 0, y: 0 };
                return (posA.y - posB.y) || (posA.x - posB.x);
            });
            setActiveBlocks([sortedNodes[0].id]);
        }
    }, [useCaseNodes.length, ssds, getSortedIds]);

    const handleAddBlock = () => {
        const nextNode = useCaseNodes.find(n => !activeBlocks.includes(n.id));
        if (nextNode) {
            const newBlocks = getSortedIds([...activeBlocks, nextNode.id]);
            setActiveBlocks(newBlocks);
        } else if (useCaseNodes.length > 0) {
            // Allow duplicates if all use cases are already mapped, but keep it sorted
            const newBlocks = getSortedIds([...activeBlocks, useCaseNodes[0].id]);
            setActiveBlocks(newBlocks);
        }
    };

    const handleBlockUseCaseChange = (index, newId) => {
        const newBlocks = [...activeBlocks];
        newBlocks[index] = newId;
        setActiveBlocks(newBlocks);
    };

    const handleRemoveBlock = (index) => {
        const newBlocks = [...activeBlocks];
        newBlocks.splice(index, 1);
        setActiveBlocks(newBlocks);
    };

    // Local check is now handled internally by CheckingModePanel's dynamic validation

    if (useCaseNodes.length === 0 && isTutorialMode) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-3xl mb-4">💡</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Use Cases Detected</h3>
                <p className="text-gray-500 max-w-md">Please add at least one Use Case in the Diagram step before creating System Sequence Diagrams.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-visible">
            <header className="mb-6 px-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Step 3: System Sequence Diagrams</h2>
                    <p className="text-sm text-gray-500 font-medium">Create sequence diagrams to model interactions for each use case.</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-16">
                {activeBlocks.map((id, index) => {
                    const useCaseNode = useCaseNodes.find(n => n.id === id);
                    const useCaseName = useCaseNode?.data?.label || 'Unnamed Use Case';
                    const displayLabel = `3.${index + 1}: ${useCaseName}`;

                    return (
                        <div
                            key={`${id}-${index}`}
                            data-testid="ssd-card"
                            data-usecase-id={id}
                            className="relative bg-white dark:bg-gray-900 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 p-8 mb-16 shadow-sm transition-all hover:border-indigo-100 dark:hover:border-indigo-900/30"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-black shadow-md flex items-center justify-center min-w-[3rem]">
                                        {displayLabel}
                                    </span>
                                    <div className="h-px w-24 bg-slate-100 dark:bg-slate-800"></div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                        System Sequence Diagram Section
                                    </span>
                                </div>

                                {!isReadOnly && (
                                    <button
                                        onClick={() => handleRemoveBlock(index)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                                        title="Remove Section"
                                    >
                                        <X size={14} /> Remove
                                    </button>
                                )}
                            </div>

                            <div className={`flex flex-col lg:flex-row gap-10 ${isCheckingActive ? 'items-start' : ''}`}>
                                <div className={`flex-1 min-w-0 h-[650px] transition-all duration-500 ${isCheckingActive ? 'lg:w-[58%]' : 'w-full'}`}>
                                    <ReactFlowProvider>
                                        <SSDDiagramEditorInner
                                            model={model}
                                            isReadOnly={isReadOnly}
                                            availableUseCases={useCaseNodes.map(node => ({
                                                id: node.id,
                                                label: node.data?.label || 'Unnamed Use Case'
                                            }))}
                                            activeUseCaseId={id}
                                            onUseCaseChange={(newId) => handleBlockUseCaseChange(index, newId)}
                                            highlights={highlights}
                                        />
                                    </ReactFlowProvider>
                                </div>

                                {isCheckingActive && (
                                    <div className="w-full lg:w-[42%] shrink-0 animate-in slide-in-from-right-4 duration-500">
                                        <div className="sticky top-6">
                                            <div className="mb-4 flex items-center gap-2">
                                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                    <Play size={12} fill="currentColor" /> Independent Runner
                                                </span>
                                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                                            </div>
                                            <div className="max-h-[750px] overflow-auto rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
                                                <CheckingModePanel
                                                    activeSection="ssd"
                                                    label={displayLabel}
                                                    useCaseId={id}
                                                    modelOverride={model}
                                                    reportOverride={reportOverride}
                                                    onNavigate={() => { }}
                                                    onRunChecker={onRunChecker}
                                                    onLocalReport={(report, tid) => {
                                                        if (onLocalReport) onLocalReport(report, tid || id);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isReadOnly && (
                                <button
                                    onClick={() => handleRemoveBlock(index)}
                                    className="absolute top-4 right-4 z-40 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-1 text-xs font-bold bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm"
                                    title="Remove Section"
                                >
                                    <X size={14} />
                                    Remove
                                </button>
                            )}
                        </div>
                    );
                })}

                {!isReadOnly && (
                    <button
                        onClick={handleAddBlock}
                        className="w-full py-8 border-2 border-dashed border-blue-200 dark:border-blue-900/50 rounded-3xl text-blue-600 font-black hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                        <span className="text-2xl">+</span>
                        Add System Sequence Diagram
                    </button>
                )}
            </div>
        </div>
    );
};

export default SSDDiagramEditor;

