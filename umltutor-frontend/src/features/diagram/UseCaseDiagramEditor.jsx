import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import ActorNode from './nodes/ActorNode';
import UseCaseNode from './nodes/UseCaseNode';
import SystemBoundaryNode from './nodes/SystemBoundaryNode';
import DiagramToolbar from './DiagramToolbar';
import { updateDiagram } from '../../features/diagram';
import { useAppSelector, useAppDispatch } from '../../app/hooks';

import { selectCurrentMode, selectIsTutorialMode } from '../../features/modes';
import { useErrorToast } from '../../components/ui/Toast';
import ConfirmModal from '../../components/shared/ConfirmModal';

// Define custom node types
const nodeTypes = {
    actor: ActorNode,
    useCase: UseCaseNode,
    usecase: UseCaseNode,
    systemBoundary: SystemBoundaryNode,
};

const initialNodes = [];
const initialEdges = [];

const getId = () => crypto.randomUUID();

const UseCaseDiagramEditor = ({ assignmentId, initialData, isReadOnly = false, highlights = [] }) => {
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, setEdges] = useEdgesState(initialEdges);
    const dispatch = useAppDispatch();
    const { theme } = useTheme();
    const mode = useAppSelector(selectCurrentMode);
    const isTutorialMode = useAppSelector(selectIsTutorialMode);
    const errorToast = useErrorToast();

    const registry = useAppSelector(s => s.mode.nameRegistry);
    const systemName = (registry?.system)?.lockedName;
    const isSystemNameEntered = !!systemName && systemName.trim() !== '';

    // Responsive Colors
    const edgeColor = theme === 'dark' ? '#9CA3AF' : '#111827';
    const bgColor = theme === 'dark' ? '#374151' : '#aaa';

    const [selectedNodeIds, setSelectedNodeIds] = useState(new Set());
    const [selectedEdgeIds, setSelectedEdgeIds] = useState(new Set());
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    const hasAppliedInitialData = useRef(false);
    const flowInstanceRef = useRef(null);

    // Sync helper with debounce to prevent performance issues and infinite loops
    const syncTimeoutRef = useRef(null);

    const syncToRedux = useCallback(() => {
        if (!isReadOnly && hasAppliedInitialData.current) {
            const flowData = { nodes, edges };
            dispatch(updateDiagram({ mode, diagram: flowData }));
        }
    }, [nodes, edges, mode, dispatch, isReadOnly]);

    // Debounced sync effect
    useEffect(() => {
        if (isReadOnly) return;
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(() => {
            syncToRedux();
        }, 1000); // 1s debounce is very safe

        return () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [nodes, edges, syncToRedux, isReadOnly]);

    // Load saved diagram
    const lastDataLoadedRef = useRef('');
    useEffect(() => {
        if (!initialData) return;
        
        const dataString = JSON.stringify(initialData);
        if (dataString === lastDataLoadedRef.current) return;

        const normalizedNodes = (initialData.nodes ?? []).map((n) => {
            let updated = { ...n };
            if (n.type === 'useCase') updated.type = 'usecase';
            updated.data = { ...updated.data, isReadOnly };
            return updated;
        });

        setNodes(normalizedNodes);
        setEdges(initialData.edges ?? []);
        lastDataLoadedRef.current = dataString;
        
        // Mark that initial data has been applied so future changes sync correctly
        hasAppliedInitialData.current = true;

        // Ensure visibility after layout settles
        if (isReadOnly && flowInstanceRef.current) {
            setTimeout(() => {
                flowInstanceRef.current.fitView({ padding: 0.2 });
            }, 50);
        }
    }, [initialData, isReadOnly, setEdges, setNodes]);

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

    // Handlers
    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );

    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge({
            ...params,
            type: 'straight',
            style: { strokeWidth: 2, stroke: edgeColor }
        }, eds)),
        [setEdges, edgeColor]
    );

    const onAddNode = useCallback((type) => {
        if (isTutorialMode && (type === 'actor' || type === 'usecase') && !isSystemNameEntered) {
            errorToast('Please enter system name before adding actors or use cases.');
            return;
        }

        if (type === 'systemBoundary' && nodes.some(n => n.type === 'systemBoundary')) return;

        const nodeId = getId();

        // Calculate stable position based on existing nodes
        let position;
        if (type === 'actor') {
            // Position actors on the left side, stacked vertically
            const existingActors = nodes.filter(n => n.type === 'actor');
            position = {
                x: 50,
                y: 100 + (existingActors.length * 150)
            };
        } else if (type === 'usecase') {
            // Position use cases in the center-right area
            const existingUseCases = nodes.filter(n => n.type === 'usecase');
            const row = Math.floor(existingUseCases.length / 3);
            const col = existingUseCases.length % 3;
            position = {
                x: 300 + (col * 150),
                y: 150 + (row * 120)
            };
        } else if (type === 'systemBoundary') {
            // System boundary in the center
            position = { x: 200, y: 50 };
        } else {
            // Fallback positioning
            position = { x: 200, y: 200 };
        }

        const label = '';

        const newNode = {
            id: nodeId,
            type,
            position,
            data: { label },
            zIndex: type === 'systemBoundary' ? 1 : 10,
        };

        if (type === 'systemBoundary') {
            newNode.data = { ...newNode.data, width: 500, height: 600 };
            newNode.style = { width: 500, height: 600 };
        }

        setNodes((nds) => [...nds, newNode]);
    }, [nodes, setNodes, isTutorialMode, isSystemNameEntered, errorToast]);

    const onDelete = useCallback(() => {
        if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;

        const nodesToDelete = [...selectedNodeIds].filter(id => {
            const node = nodes.find(n => n.id === id);
            return node && node.type !== 'systemBoundary';
        });

        if (nodesToDelete.length > 0) {
            setNodes((nds) => nds.filter((n) => !nodesToDelete.includes(n.id)));
            setEdges((eds) => eds.filter(e => !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)));
        }

        if (selectedEdgeIds.size > 0) {
            setEdges((eds) => eds.filter((e) => !selectedEdgeIds.has(e.id)));
        }

        setSelectedNodeIds(new Set());
        setSelectedEdgeIds(new Set());
    }, [selectedEdgeIds, selectedNodeIds, nodes, setEdges, setNodes]);

    const onClear = useCallback(() => {
        setIsClearConfirmOpen(true);
    }, []);

    const handleConfirmClear = () => {
        setNodes((nds) => nds.filter(n => n.type === 'systemBoundary'));
        setEdges([]);
        setIsClearConfirmOpen(false);
    };

    const onNodeDragStop = useCallback((event, node) => {
        if (node.type === 'systemBoundary') return;

        // Get absolute position for boundary check
        const parent = node.parentNode ? nodes.find(n => n.id === node.parentNode) : null;
        const absX = node.parentNode && parent ? node.position.x + parent.position.x : node.position.x;
        const absY = node.parentNode && parent ? node.position.y + parent.position.y : node.position.y;

        const boundary = nodes.find(
            (n) => n.type === 'systemBoundary' &&
                n.id !== node.id &&
                absX >= n.position.x &&
                absX <= n.position.x + (n.data?.width || 500) &&
                absY >= n.position.y &&
                absY <= n.position.y + (n.data?.height || 600)
        );

        if (boundary && node.parentNode !== boundary.id) {
            setNodes((nds) => nds.map((n) => {
                if (n.id === node.id) {
                    return {
                        ...n,
                        parentNode: boundary.id,
                        extent: 'parent',
                        position: { x: absX - boundary.position.x, y: absY - boundary.position.y },
                    };
                }
                return n;
            }));
        } else if (!boundary && node.parentNode) {
            setNodes((nds) => nds.map((n) => {
                if (n.id === node.id) {
                    return { ...n, parentNode: undefined, extent: undefined, position: { x: absX, y: absY } };
                }
                return n;
            }));
        }
    }, [nodes, setNodes]);

    return (
        <div data-testid="usecase-canvas" className="flex flex-col h-full bg-slate-50 dark:bg-gray-950 relative">
            <style dangerouslySetInnerHTML={{
                __html: `
                .react-flow__node.selected {
                    box-shadow: none !important;
                    outline: 2px solid #3b82f6;
                    outline-offset: 2px;
                }
            `}} />
            <ReactFlowProvider>
                <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 z-10">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Use Case Diagram</h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {isReadOnly ? 'Read-only preview' : 'Drag to move • Drag handles to resize • Double-click to rename'}
                    </div>
                </div>

                <div className="relative flex-1 min-h-0 bg-white dark:bg-gray-900">
                    {!isReadOnly && (
                        <DiagramToolbar
                            onAddActor={() => onAddNode('actor')}
                            onAddUseCase={() => onAddNode('usecase')}
                            onAddSystemBoundary={() => onAddNode('systemBoundary')}
                            onDelete={onDelete}
                            onClear={onClear}
                            isActorDisabled={isTutorialMode && !isSystemNameEntered}
                            isUseCaseDisabled={isTutorialMode && !isSystemNameEntered}
                            onDisabledActionClick={(msg) => errorToast(msg)}
                        />
                    )}
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={isReadOnly ? undefined : onNodesChange}
                        onEdgesChange={isReadOnly ? undefined : onEdgesChange}
                        onConnect={isReadOnly ? undefined : onConnect}
                        onNodeDragStop={isReadOnly ? undefined : onNodeDragStop}
                        onSelectionChange={({ nodes: selNodes, edges: selEdges }) => {
                            if (isReadOnly) return;
                            setSelectedNodeIds(new Set(selNodes.map(n => n.id)));
                            setSelectedEdgeIds(new Set(selEdges.map(e => e.id)));
                        }}
                        onInit={(instance) => flowInstanceRef.current = instance}
                        nodeTypes={nodeTypes}
                        fitView={isReadOnly}
                        fitViewOptions={{ padding: 0.1 }}
                        snapToGrid={true}
                        snapGrid={[15, 15]}
                        deleteKeyCode={isReadOnly ? null : ['Backspace', 'Delete']}
                        elementsSelectable={!isReadOnly}
                        nodesDraggable={!isReadOnly}
                        minZoom={0.2}
                        maxZoom={4}
                    >
                        {!isReadOnly && <Background color={bgColor} gap={15} />}
                        {!isReadOnly && <Controls />}
                    </ReactFlow>
                </div>
            </ReactFlowProvider>

            <ConfirmModal
                isOpen={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                onConfirm={handleConfirmClear}
                title="Clear Diagram"
                message="Are you sure you want to clear the entire diagram? This action cannot be undone."
                confirmText="Clear All"
            />
        </div>
    );
};

export default UseCaseDiagramEditor;

