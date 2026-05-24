import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import ClassNode from './nodes/ClassNode';
import InterfaceNode from './nodes/InterfaceNode';
import ClassRelationshipEdge from './edges/ClassRelationshipEdge';
import ClassDiagramToolbar from './ClassDiagramToolbar';
import UMLMarkers from './UMLMarkers';

import { updateClassDiagram } from '../../features/diagram';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectCurrentMode } from '../../features/modes';
import { useErrorToast } from '../../components/ui/Toast';
import ConfirmModal from '../../components/shared/ConfirmModal';

const nodeTypes = {
    class: ClassNode,
    interface: InterfaceNode,
};

const edgeTypes = {
    relationship: ClassRelationshipEdge,
};

const ClassDiagramEditor = ({ assignmentId, initialData, isReadOnly = false, embedded = false }) => {
    const [nodes, setNodes] = useNodesState([]);
    const [edges, setEdges] = useEdgesState([]);
    const [activeRelationship, setActiveRelationship] = useState('association');
    const [selectedNodeIds, setSelectedNodeIds] = useState(new Set());
    const [selectedEdgeIds, setSelectedEdgeIds] = useState(new Set());
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    const dispatch = useAppDispatch();
    const mode = useAppSelector(selectCurrentMode);
    const errorToast = useErrorToast();
    const flowInstanceRef = useRef(null);
    const hasAppliedInitialData = useRef(false);

    // Sync to Redux with debounce
    useEffect(() => {
        if (isReadOnly || !hasAppliedInitialData.current) return;
        const timer = setTimeout(() => {
            dispatch(updateClassDiagram({ mode, diagram: { nodes, edges } }));
        }, 1000);
        return () => clearTimeout(timer);
    }, [nodes, edges, mode, dispatch, isReadOnly]);

    // Load Initial Data
    useEffect(() => {
        if (initialData && !hasAppliedInitialData.current) {
            setNodes(initialData.nodes || []);
            setEdges(initialData.edges || []);
            hasAppliedInitialData.current = true;
        } else if (!initialData) {
            hasAppliedInitialData.current = true;
        }
    }, [initialData, setNodes, setEdges]);

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
                type: 'relationship',
                data: { type: activeRelationship },
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, activeRelationship]
    );

    const onAddNode = useCallback((type) => {
        const id = crypto.randomUUID();
        const newNode = {
            id,
            type,
            position: { x: 250, y: 150 },
            data: { 
                label: type === 'class' ? 'NewClass' : 'NewInterface',
                attributes: type === 'class' ? ['- id: int'] : [],
                methods: ['+ operation()'],
                isReadOnly
            },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [setNodes, isReadOnly]);

    const onDelete = useCallback(() => {
        if (selectedNodeIds.size > 0) {
            setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)));
            setEdges((eds) => eds.filter((e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)));
        }
        if (selectedEdgeIds.size > 0) {
            setEdges((eds) => eds.filter((e) => !selectedEdgeIds.has(e.id)));
        }
        setSelectedNodeIds(new Set());
        setSelectedEdgeIds(new Set());
    }, [selectedNodeIds, selectedEdgeIds, setNodes, setEdges]);

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <UMLMarkers />
            {!embedded && (
            <div className="px-6 py-4 bg-white border-b border-black/5 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-xl font-extrabold font-heading text-ink tracking-tight">Class Diagram</h2>
                    <p className="text-[10px] font-bold font-body text-indigo-500 uppercase tracking-widest mt-0.5">Structural Model</p>
                </div>
                <div className="text-xs font-bold font-body text-gray-400 italic">
                    {isReadOnly ? 'Read-only View' : 'Double-click to edit • Drag handles to connect'}
                </div>
            </div>
            )}

            <div className="relative flex-1 bg-white overflow-hidden">
                {!isReadOnly && (
                    <ClassDiagramToolbar
                        onAddClass={() => onAddNode('class')}
                        onAddInterface={() => onAddNode('interface')}
                        onDelete={onDelete}
                        onClear={() => setIsClearConfirmOpen(true)}
                        activeRelationship={activeRelationship}
                        onRelationshipChange={setActiveRelationship}
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
                        setSelectedNodeIds(new Set(selNodes.map((n) => n.id)));
                        setSelectedEdgeIds(new Set(selEdges.map((e) => e.id)));
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
                title="Clear Diagram"
                message="This will remove all classes and relationships. Continue?"
                confirmText="Clear All"
            />
        </div>
    );
};

const ClassDiagramEditorWrapper = (props) => (
    <ReactFlowProvider>
        <ClassDiagramEditor {...props} />
    </ReactFlowProvider>
);

export default ClassDiagramEditorWrapper;
