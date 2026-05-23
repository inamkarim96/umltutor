import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    useOnViewportChange,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import LifelineNode from './nodes/LifelineNode';
import MessageEdge from './edges/MessageEdge';
import SequenceDiagramToolbar from './SequenceDiagramToolbar';
import SequenceMarkers from './SequenceMarkers';

import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { updateSequenceDiagram, selectActiveUseCaseId } from '../../features/diagram';
import { selectCurrentMode } from '../../features/modes';
import { useErrorToast } from '../../components/ui/Toast';
import ConfirmModal from '../../components/shared/ConfirmModal';

const nodeTypes = {
    lifeline: LifelineNode,
    actor: LifelineNode, // Can use same visual but with actor data
};

const edgeTypes = {
    message: MessageEdge,
};

const MESSAGE_SPACING = 50;
const BASE_Y = 100;

const SequenceDiagramEditor = ({ assignmentId, isReadOnly = false, modelOverride = null }) => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector(selectCurrentMode);
    const activeUseCaseId = useAppSelector(selectActiveUseCaseId);
    
    const [nodes, setNodes] = useNodesState([]);
    const [edges, setEdges] = useEdgesState([]);
    const [activeMessageType, setActiveMessageType] = useState('sync');
    const [selectedElement, setSelectedElement] = useState(null);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    const flowInstanceRef = useRef(null);
    const lastLoadedRef = useRef('');

    // Load Data from Redux
    useEffect(() => {
        if (!activeUseCaseId) return;
        const model = modelOverride || (mode === 'tutorial' ? window.store.getState().uml.tutorialModel : window.store.getState().uml.developmentModel);
        const sequenceData = model?.sequenceDiagrams?.[activeUseCaseId];
        
        if (!sequenceData) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const dataString = JSON.stringify(sequenceData);
        if (dataString === lastLoadedRef.current) return;

        setNodes(sequenceData.nodes || []);
        setEdges(sequenceData.edges || []);
        lastLoadedRef.current = dataString;
    }, [activeUseCaseId, mode, modelOverride, setNodes, setEdges]);

    // Sync to Redux with debounce
    useEffect(() => {
        if (isReadOnly || !activeUseCaseId) return;
        const timer = setTimeout(() => {
            const sequence = { nodes, edges, useCaseId: activeUseCaseId };
            dispatch(updateSequenceDiagram({ mode, id: activeUseCaseId, sequence }));
        }, 1000);
        return () => clearTimeout(timer);
    }, [nodes, edges, mode, activeUseCaseId, dispatch, isReadOnly]);

    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );

    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );

    const onConnect = useCallback(
        (params) => {
            const newEdge = {
                ...params,
                id: crypto.randomUUID(),
                type: 'message',
                data: { type: activeMessageType, label: 'message()' },
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, activeMessageType]
    );

    const onAddLifeline = useCallback(() => {
        const id = crypto.randomUUID();
        const newNode = {
            id,
            type: 'lifeline',
            position: { x: nodes.length * 200 + 100, y: 50 },
            data: { label: 'Instance:Class', isReadOnly },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, setNodes, isReadOnly]);

    const onAddActor = useCallback(() => {
        const id = crypto.randomUUID();
        const newNode = {
            id,
            type: 'actor',
            position: { x: nodes.length * 200 + 100, y: 50 },
            data: { label: 'ActorName', isReadOnly, isActor: true },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, setNodes, isReadOnly]);

    const onDelete = useCallback(() => {
        if (selectedElement) {
            if (selectedElement.type === 'node') {
                setNodes((nds) => nds.filter((n) => n.id !== selectedElement.id));
                setEdges((eds) => eds.filter((e) => e.source !== selectedElement.id && e.target !== selectedElement.id));
            } else {
                setEdges((eds) => eds.filter((e) => e.id !== selectedElement.id));
            }
            setSelectedElement(null);
        }
    }, [selectedElement, setNodes, setEdges]);

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <SequenceMarkers />
            <div className="px-6 py-4 bg-white border-b border-black/5 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-xl font-extrabold font-heading text-ink tracking-tight">Sequence Diagram</h2>
                    <p className="text-[10px] font-bold font-body text-indigo-500 uppercase tracking-widest mt-0.5">Behavioral Design</p>
                </div>
                <div className="flex items-center gap-4">
                     {!activeUseCaseId && (
                        <div className="px-4 py-2 bg-amber-50 text-amber-700 text-xs font-bold font-body rounded-lg border border-amber-100 animate-pulse">
                           Select a Use Case from the Sidebar to start designing
                        </div>
                    )}
                    <div className="text-xs font-bold font-body text-gray-400 italic">
                        {isReadOnly ? 'Read-only View' : 'Drag lifelines to arrange • Connect handles to send messages'}
                    </div>
                </div>
            </div>

            <div className="relative flex-1 bg-white overflow-hidden">
                {!isReadOnly && activeUseCaseId && (
                    <SequenceDiagramToolbar
                        onAddLifeline={onAddLifeline}
                        onAddActor={onAddActor}
                        onDelete={onDelete}
                        onClear={() => setIsClearConfirmOpen(true)}
                        activeMessageType={activeMessageType}
                        onMessageTypeChange={setActiveMessageType}
                    />
                )}
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={isReadOnly ? undefined : onNodesChange}
                    onEdgesChange={isReadOnly ? undefined : onEdgesChange}
                    onConnect={isReadOnly ? undefined : onConnect}
                    onInit={(instance) => (flowInstanceRef.current = instance)}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onSelectionChange={({ nodes: selNodes, edges: selEdges }) => {
                        if (selNodes.length > 0) setSelectedElement({ id: selNodes[0].id, type: 'node' });
                        else if (selEdges.length > 0) setSelectedElement({ id: selEdges[0].id, type: 'edge' });
                        else setSelectedElement(null);
                    }}
                    fitView={isReadOnly}
                    snapToGrid={true}
                    snapGrid={[15, 15]}
                >
                    <Background color="#f1f5f9" gap={15} />
                    <Controls />
                </ReactFlow>
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

const SequenceDiagramEditorWrapper = (props) => (
    <ReactFlowProvider>
        <SequenceDiagramEditor {...props} />
    </ReactFlowProvider>
);

export default SequenceDiagramEditorWrapper;
