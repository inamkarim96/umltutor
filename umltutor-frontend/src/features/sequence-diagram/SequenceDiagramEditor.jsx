import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import LifelineNode from './nodes/LifelineNode';
import MessageEdge from './edges/MessageEdge';
import SequenceDiagramToolbar from './SequenceDiagramToolbar';
import SequenceMarkers from './SequenceMarkers';

import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
    updateSequenceDiagram,
    selectTutorialModel,
    selectDevelopmentModel,
} from '../../features/diagram';
import { selectCurrentMode, selectIsTutorialMode } from '../../features/modes';
import ConfirmModal from '../../components/shared/ConfirmModal';
import CheckingModePanel from '../checking/CheckingModePanel';
import { X } from 'lucide-react';
import { useSequenceAutosave } from './useSequenceAutosave';

const nodeTypes = {
    lifeline: LifelineNode,
    actor: LifelineNode,
};

const edgeTypes = {
    message: MessageEdge,
};

const SequenceDiagramEditorInner = ({
    model,
    activeUseCaseId,
    isReadOnly = false,
    highlights = [],
}) => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector(selectCurrentMode);

    const [nodes, setNodes] = useNodesState([]);
    const [edges, setEdges] = useEdgesState([]);
    const [activeMessageType, setActiveMessageType] = useState(null);
    const [selectedElement, setSelectedElement] = useState(null);
    const [editingNodeId, setEditingNodeId] = useState(null);
    const [editingEdgeId, setEditingEdgeId] = useState(null);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    const flowInstanceRef = useRef(null);
    const lastLoadedRef = useRef('');

    useEffect(() => {
        if (!activeUseCaseId) return;
        const sequenceData = model?.sequenceDiagrams?.[activeUseCaseId];

        if (!sequenceData) {
            setNodes([]);
            setEdges([]);
            lastLoadedRef.current = '';
            return;
        }

        const dataString = JSON.stringify(sequenceData);
        if (dataString === lastLoadedRef.current) return;

        setNodes(sequenceData.nodes || []);
        setEdges(sequenceData.edges || []);
        lastLoadedRef.current = dataString;
    }, [activeUseCaseId, model?.sequenceDiagrams]);

    useSequenceAutosave({
        activeUseCaseId,
        nodes,
        edges,
        mode,
        isReadOnly,
        dispatch,
        updateSequenceDiagramAction: updateSequenceDiagram,
    });

    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );

    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );

    // ── Toolbar & Drag message helpers ──────────────────────────────────────────
    const getDefaultLabel = (type) => {
        if (type === 'call') return 'call()';
        if (type === 'return') return 'return()';
        if (type === 'self') return 'self()';
        return 'message()';
    };

    const getNextY = useCallback(() => {
        const last = edges.reduce((acc, e) => Math.max(acc, e.data?.y || 0), 0);
        return last ? last + 40 : 160;
    }, [edges]);

    const onConnect = useCallback(
        (params) => {
            const isSelf = params.source === params.target;
            const msgType = isSelf ? 'self' : (activeMessageType || 'call');
            const y = getNextY();
            const newEdge = {
                ...params,
                id: crypto.randomUUID(),
                type: 'message',
                data: {
                    type: msgType,
                    label: getDefaultLabel(msgType),
                    y,
                    order: edges.length,
                },
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, activeMessageType, getNextY, edges.length]
    );

    const addMessage = useCallback(
        (source, target, type) => {
            const y = getNextY();
            setEdges((eds) => [
                ...eds,
                {
                    id: crypto.randomUUID(),
                    source,
                    target,
                    type: 'message',
                    data: {
                        type,
                        label: getDefaultLabel(type),
                        y,
                        order: eds.length,
                    },
                },
            ]);
        },
        [getNextY, setEdges]
    );

    const createMessageBetweenRecent = useCallback(
        (type) => {
            if (isReadOnly) return;

            const lifelines = nodes.filter((n) => n.type === 'lifeline' || n.type === 'actor');
            if (lifelines.length === 0) return;

            // Sort lifelines left-to-right horizontally by X position
            const sortedLifelines = [...lifelines].sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0));

            let sourceNode = null;
            let targetNode = null;

            const selectedId = selectedElement?.type === 'node' ? selectedElement.id : null;
            const selectedIndex = selectedId ? sortedLifelines.findIndex((n) => n.id === selectedId) : -1;

            if (type === 'self') {
                const target = selectedIndex !== -1 ? sortedLifelines[selectedIndex] : sortedLifelines[sortedLifelines.length - 1];
                sourceNode = target;
                targetNode = target;
            } else {
                if (sortedLifelines.length < 2) return;

                if (selectedIndex !== -1) {
                    if (type === 'call') {
                        if (selectedIndex < sortedLifelines.length - 1) {
                            sourceNode = sortedLifelines[selectedIndex];
                            targetNode = sortedLifelines[selectedIndex + 1];
                        } else {
                            sourceNode = sortedLifelines[selectedIndex - 1];
                            targetNode = sortedLifelines[selectedIndex];
                        }
                    } else if (type === 'return') {
                        if (selectedIndex < sortedLifelines.length - 1) {
                            sourceNode = sortedLifelines[selectedIndex + 1];
                            targetNode = sortedLifelines[selectedIndex];
                        } else {
                            sourceNode = sortedLifelines[selectedIndex];
                            targetNode = sortedLifelines[selectedIndex - 1];
                        }
                    }
                } else {
                    const source = sortedLifelines[0];
                    const target = sortedLifelines[1];
                    if (type === 'return') {
                        sourceNode = target;
                        targetNode = source;
                    } else {
                        sourceNode = source;
                        targetNode = target;
                    }
                }
            }

            if (sourceNode && targetNode) {
                addMessage(sourceNode.id, targetNode.id, type);
            }
            setActiveMessageType(type);
        },
        [isReadOnly, addMessage, nodes, selectedElement]
    );

    const onAddLifeline = useCallback(() => {
        const id = crypto.randomUUID();
        const newNode = {
            id,
            type: 'lifeline',
            position: { x: nodes.length * 200 + 100, y: 50 },
            data: { label: 'Instance:ClassName', isReadOnly },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, setNodes]);

    const onAddActor = useCallback(() => {
        const id = crypto.randomUUID();
        const newNode = {
            id,
            type: 'actor',
            position: { x: nodes.length * 200 + 100, y: 50 },
            data: { label: 'ActorName', isReadOnly, isActor: true },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, setNodes]);

    const onAddSystem = useCallback(() => {
        const id = crypto.randomUUID();
        const newNode = {
            id,
            type: 'lifeline',
            position: { x: nodes.length * 200 + 100, y: 50 },
            data: { label: 'System', isReadOnly, isSystem: true },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, setNodes]);

    const onNodeDoubleClick = useCallback(
        (event, node) => {
            if (isReadOnly) return;
            setSelectedElement({ id: node.id, type: 'node' });
            setEditingNodeId(node.id);
        },
        [isReadOnly]
    );

    const handleEditCommit = useCallback(
        (nodeId, newLabel) => {
            setNodes((nds) =>
                nds.map((n) =>
                    n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
                )
            );
        },
        [setNodes]
    );

    const endEditing = useCallback(() => setEditingNodeId(null), []);

    const visibleNodes = useMemo(
        () => {
            if (!editingNodeId) return nodes;
            
            return nodes.map((n) =>
                n.id === editingNodeId
                    ? {
                          ...n,
                          data: {
                              ...n.data,
                              editing: true,
                              editValue: n.data.label,
                              onCommit: handleEditCommit,
                              onDone: endEditing,
                          },
                      }
                    : n
            );
        },
        [nodes, editingNodeId, handleEditCommit, endEditing]
    );

    const onEdgeDoubleClick = useCallback(
        (event, edge) => {
            if (isReadOnly) return;
            setSelectedElement({ id: edge.id, type: 'edge' });
            setEditingEdgeId(edge.id);
        },
        [isReadOnly]
    );

    const handleEdgeEditCommit = useCallback(
        (edgeId, newLabel) => {
            setEdges((eds) =>
                eds.map((e) =>
                    e.id === edgeId
                        ? { ...e, data: { ...e.data, label: newLabel } }
                        : e
                )
            );
        },
        [setEdges]
    );

    const endEdgeEditing = useCallback(() => setEditingEdgeId(null), []);

    const visibleEdges = useMemo(
        () => {
            if (!editingEdgeId) return edges;
            
            return edges.map((e) =>
                e.id === editingEdgeId
                    ? {
                          ...e,
                          data: {
                              ...e.data,
                              editing: true,
                              editValue: e.data.label,
                              onCommit: handleEdgeEditCommit,
                              onDone: endEdgeEditing,
                          },
                      }
                    : e
            );
        },
        [edges, editingEdgeId, handleEdgeEditCommit, endEdgeEditing]
    );

    const onDelete = useCallback(() => {
        if (!selectedElement) return;
        if (selectedElement.type === 'node') {
            setNodes((nds) => nds.filter((n) => n.id !== selectedElement.id));
            setEdges((eds) => eds.filter((e) => e.source !== selectedElement.id && e.target !== selectedElement.id));
        } else {
            setEdges((eds) => eds.filter((e) => e.id !== selectedElement.id));
        }
        setSelectedElement(null);
    }, [selectedElement, setNodes, setEdges]);

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <SequenceMarkers />
            <div className="relative flex-1 bg-white overflow-hidden min-h-[500px] h-full w-full" style={{ minHeight: 480 }}>
                {!isReadOnly && (
                    <SequenceDiagramToolbar
                        onAddLifeline={onAddLifeline}
                        onAddObject={onAddLifeline}
                        onAddActor={onAddActor}
                        onAddSystem={onAddSystem}
                        onDelete={onDelete}
                        onClear={() => setIsClearConfirmOpen(true)}
                        hasSelection={!!selectedElement}
                        activeMessageType={activeMessageType}
                        onMessageTypeChange={createMessageBetweenRecent}
                        lifelineCount={nodes.filter((n) => n.type === 'lifeline' || n.type === 'actor').length}
                        isReadOnly={isReadOnly}
                    />
                )}
                <div data-testid="sequence-canvas" data-usecase-id={activeUseCaseId} className="w-full h-full">
                    <ReactFlow
                        nodes={visibleNodes}
                        edges={visibleEdges}
                        onNodesChange={isReadOnly ? undefined : onNodesChange}
                        onEdgesChange={isReadOnly ? undefined : onEdgesChange}
                        onConnect={isReadOnly ? undefined : onConnect}
                        isValidConnection={() => true}
                        connectionMode={ConnectionMode.Loose}
                        onNodeDoubleClick={isReadOnly ? undefined : onNodeDoubleClick}
                        onEdgeDoubleClick={isReadOnly ? undefined : onEdgeDoubleClick}
                        onInit={(instance) => { flowInstanceRef.current = instance; }}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        onSelectionChange={({ nodes: selNodes, edges: selEdges }) => {
                            if (selNodes.length > 0) setSelectedElement({ id: selNodes[0].id, type: 'node' });
                            else if (selEdges.length > 0) setSelectedElement({ id: selEdges[0].id, type: 'edge' });
                            else setSelectedElement(null);
                        }}
                        fitView={isReadOnly}
                        snapToGrid
                        snapGrid={[15, 15]}
                        nodesDraggable={!isReadOnly}
                        elementsSelectable={!isReadOnly}
                    >
                        <Background color="#f1f5f9" gap={15} />
                        {!isReadOnly && <Controls />}
                    </ReactFlow>
                </div>
            </div>

            <ConfirmModal
                isOpen={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                onConfirm={() => {
                    setNodes([]);
                    setEdges([]);
                    setIsClearConfirmOpen(false);
                }}
                title="Clear Sequence Diagram"
                message="This will remove all lifelines and messages for this use case. Continue?"
                confirmText="Clear All"
            />
        </div>
    );
};

export const SequenceDiagramEditor = ({
    assignmentId,
    isReadOnly = false,
    modelOverride = null,
    useCaseId = null,
    isCheckingActive = false,
    reportOverride = null,
    onRunChecker = null,
    onLocalReport = null,
    embedded = false,
}) => {
    const mode = useAppSelector(selectCurrentMode);
    const isTutorialMode = useAppSelector(selectIsTutorialMode);
    const tutorialModel = useAppSelector(selectTutorialModel);
    const developmentModel = useAppSelector(selectDevelopmentModel);
    const model = modelOverride || (mode === 'tutorial' ? tutorialModel : developmentModel);

    const useCaseNodes = useMemo(
        () => model?.diagram?.nodes?.filter((n) => n.type === 'usecase' || n.type === 'useCase') || [],
        [model?.diagram?.nodes]
    );

    const getSortedIds = useCallback((ids) => {
        const sorted = [...ids];
        sorted.sort((a, b) => {
            const nodeA = useCaseNodes.find((n) => n.id === a);
            const nodeB = useCaseNodes.find((n) => n.id === b);
            const posA = nodeA?.position || { x: 0, y: 0 };
            const posB = nodeB?.position || { x: 0, y: 0 };
            return (posA.y - posB.y) || (posA.x - posB.x);
        });
        return sorted;
    }, [useCaseNodes]);

    const [activeBlocks, setActiveBlocks] = useState([]);

    useEffect(() => {
        const seqKeys = Object.keys(model?.sequenceDiagrams || {});
        const descKeys = Object.keys(model?.descriptions || {});
        const fromDiagram = useCaseNodes.map((n) => n.id);
        const combined = [...new Set([...fromDiagram, ...descKeys, ...seqKeys])];
        const sorted = getSortedIds(combined);
        setActiveBlocks((prev) => {
            if (prev.length === 0 && sorted.length > 0) return sorted;
            if (sorted.length > prev.length) {
                const next = [...prev];
                sorted.forEach((id) => { if (!next.includes(id)) next.push(id); });
                return getSortedIds(next);
            }
            return prev.length ? getSortedIds(prev) : sorted;
        });
    }, [useCaseNodes, model?.descriptions, model?.sequenceDiagrams, getSortedIds]);

    const handleAddBlock = () => {
        const unused = useCaseNodes.find((n) => !activeBlocks.includes(n.id));
        if (unused) setActiveBlocks((prev) => getSortedIds([...prev, unused.id]));
    };

    const handleRemoveBlock = (index) => {
        setActiveBlocks((prev) => prev.filter((_, i) => i !== index));
    };

    const handleBlockUseCaseChange = (index, newId) => {
        setActiveBlocks((prev) => {
            const next = [...prev];
            next[index] = newId;
            return getSortedIds(next);
        });
    };

    const blocksToRender = useCaseId
        ? activeBlocks.filter((id) => id === useCaseId)
        : activeBlocks;

    if (useCaseNodes.length === 0 && isTutorialMode) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-center p-8 bg-surface-3 rounded-3xl border-2 border-dashed border-black/10">
                <h3 className="text-xl font-bold font-body text-ink mb-2">No Use Cases Detected</h3>
                <p className="text-muted max-w-md">Add use cases in Step 1 before creating sequence diagrams.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-visible">
            {!embedded && (
            <header className="mb-6 px-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-extrabold font-heading text-ink tracking-tight">Step 5: Sequence Diagrams</h2>
                    <p className="text-sm text-muted font-medium">Model detailed interactions per use case, consistent with descriptions, SSD, and class diagram.</p>
                </div>
            </header>
            )}

            <div className={`flex-1 overflow-y-auto custom-scrollbar space-y-16 ${embedded ? 'px-2' : 'pr-4'}`}>
                {blocksToRender.map((id, index) => {
                    const useCaseNode = useCaseNodes.find((n) => n.id === id);
                    const useCaseName = useCaseNode?.data?.label || model?.descriptions?.[id]?.useCaseName || 'Unnamed Use Case';
                    const displayLabel = `5.${index + 1}: ${useCaseName}`;

                    return (
                        <div
                            key={`${id}-${index}`}
                            data-testid="sequence-card"
                            data-usecase-id={id}
                            className={`flex flex-col xl:flex-row w-full gap-6 lg:gap-8 mb-16 relative ${isCheckingActive ? 'items-start' : ''}`}
                        >
                            <div className="flex-1 min-w-0 bg-white rounded-lg border border-black/10 p-8 shadow-xl shadow-gray-100/50">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="bg-accent text-white px-4 py-1.5 rounded-full text-sm font-extrabold font-heading shadow-md">
                                        {displayLabel}
                                    </span>
                                    {!isReadOnly && !useCaseId && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveBlock(index)}
                                            className="p-2 text-slate-300 hover:text-status-red hover:bg-status-red/10 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-extrabold uppercase"
                                        >
                                            <X size={14} /> Remove
                                        </button>
                                    )}
                                </div>
                                <div className="w-full overflow-hidden h-[650px] bg-slate-50 border border-slate-100 rounded-lg">
                                    <ReactFlowProvider>
                                        <SequenceDiagramEditorInner
                                            model={model}
                                            activeUseCaseId={id}
                                            isReadOnly={isReadOnly}
                                        />
                                    </ReactFlowProvider>
                                </div>
                            </div>

                            {isCheckingActive && (
                                <div className="w-full xl:w-96 flex-shrink-0 bg-white rounded-lg border border-black/10 overflow-hidden shadow-xl">
                                    <CheckingModePanel
                                        activeSection="sequence-diagram"
                                        label={displayLabel}
                                        useCaseId={id}
                                        modelOverride={model}
                                        reportOverride={reportOverride}
                                        onRunChecker={onRunChecker}
                                        onLocalReport={(report, tid) => {
                                            if (onLocalReport) onLocalReport(report, tid || id);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {!isReadOnly && !useCaseId && (
                    <button
                        type="button"
                        onClick={handleAddBlock}
                        className="w-full py-8 border-2 border-dashed border-blue-200 rounded-3xl text-blue-600 font-extrabold hover:bg-blue-50 transition-all"
                    >
                        + Add Sequence Diagram Section
                    </button>
                )}
            </div>
        </div>
    );
};

const SequenceDiagramEditorWrapper = (props) => (
    <ReactFlowProvider>
        <SequenceDiagramEditor {...props} />
    </ReactFlowProvider>
);

export default SequenceDiagramEditorWrapper;
