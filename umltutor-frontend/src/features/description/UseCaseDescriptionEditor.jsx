import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
    updateDescription,
    selectActiveUseCaseId,
    selectTutorialModel,
    selectDevelopmentModel
} from '../../features/diagram';
import { DescriptionForm } from './DescriptionForm';
import { selectCurrentMode, selectIsTutorialMode } from '../../features/modes';
import { X, Search, Play } from 'lucide-react';
import CheckingModePanel from '../checking/CheckingModePanel';
import { runSubmissionCheckLogic } from '../submissions/submissionLogic';

export const UseCaseDescriptionEditor = ({
    assignmentId,
    isReadOnly = false,
    isCheckingActive = false,
    modelOverride = null,
    reportOverride = null,
    onRunChecker = null,
    onLocalReport = null
}) => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector(selectCurrentMode);
    const isTutorialMode = useAppSelector(selectIsTutorialMode);
    const tutorialModel = useAppSelector(selectTutorialModel);
    const developmentModel = useAppSelector(selectDevelopmentModel);
    const [localReport, setLocalReport] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const model = modelOverride || (mode === 'tutorial' ? tutorialModel : developmentModel);

    const activeNodeId = useAppSelector(selectActiveUseCaseId);

    if (!model) return null;
    const descriptions = model.descriptions || {};

    const useCaseNodes = useMemo(() =>
        model.diagram?.nodes?.filter(node => node.type === 'usecase' || node.type === 'useCase') || [],
        [model.diagram?.nodes]);

    // Track which use cases are currently being edited in the UI
    const [activeBlocks, setActiveBlocks] = useState([]);

    // Standardized sorting function to match backend (Visual: Top-to-Bottom, Left-to-Right)
    const getSortedIds = (ids) => {
        if (!ids || ids.length === 0) return [];
        return [...ids].sort((a, b) => {
            const nodeA = useCaseNodes.find(n => n.id === a);
            const nodeB = useCaseNodes.find(n => n.id === b);
            if (!nodeA || !nodeB) return 0;
            const posA = nodeA.position || { x: 0, y: 0 };
            const posB = nodeB.position || { x: 0, y: 0 };
            return (posA.y - posB.y) || (posA.x - posB.x);
        });
    };

    // Initialize/Update blocks with existing descriptions, sorted visually
    useEffect(() => {
        const existingIds = Object.keys(descriptions);
        if (existingIds.length > 0) {
            setActiveBlocks(getSortedIds(existingIds));
        } else if (useCaseNodes.length > 0) {
            // Default to the first visually sorted use case if none exist
            const sortedNodes = [...useCaseNodes].sort((a, b) => {
                const posA = a.position || { x: 0, y: 0 };
                const posB = b.position || { x: 0, y: 0 };
                return (posA.y - posB.y) || (posA.x - posB.x);
            });
            setActiveBlocks([sortedNodes[0].id]);
        }
    }, [useCaseNodes.length, descriptions]);

    const edges = model.diagram?.edges || [];

    const handleSaveDescription = (id, data) => {
        if (!id) return;
        if (isReadOnly) return;
        dispatch(updateDescription({ mode, id, description: data }));
    };

    const handleAddBlock = () => {
        // Find next use case that isn't already in activeBlocks
        const nextNode = useCaseNodes.find(n => !activeBlocks.includes(n.id));
        if (nextNode) {
            setActiveBlocks([...activeBlocks, nextNode.id]);
        } else if (useCaseNodes.length > 0) {
            setActiveBlocks([...activeBlocks, useCaseNodes[0].id]);
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

    const handleRunLocalCheck = async () => {
        if (!assignmentId) return;
        try {
            setIsChecking(true);
            const report = await runSubmissionCheckLogic(assignmentId);
            setLocalReport(report);
            if (onLocalReport) onLocalReport(report);
            if (onRunChecker) onRunChecker(report);
        } catch (err) {
            console.error('Failed to run local check:', err);
        } finally {
            setIsChecking(false);
        }
    };

    if (useCaseNodes.length === 0 && isTutorialMode) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-center p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mb-4">💡</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Use Cases Found</h3>
                <p className="text-gray-500 max-w-md">Please go back to <b>Step 1: Use Case Diagram</b> and add at least one Use Case node to the diagram before writing descriptions.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-visible">
            <header className="mb-6 px-4">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Step 2: Use Case Descriptions</h2>
                <p className="text-sm text-gray-500 font-medium">Define the behavior and requirements for each use case.</p>
            </header>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-12">
                {activeBlocks.map((id, index) => {
                    const useCaseNode = useCaseNodes.find(n => n.id === id);
                    const useCaseName = useCaseNode?.data?.label || 'Unnamed Use Case';
                    const displayLabel = `2.${index + 1}: ${useCaseName}`;

                    return (
                        <div
                            key={`${id}-${index}`}
                            data-description-id={id}
                            className={`flex flex-col xl:flex-row w-full gap-6 lg:gap-8 mb-16 ${isCheckingActive ? 'items-start' : ''}`}
                        >
                            {/* Left: Description Form Card */}
                            <div className="flex-1 min-w-0 bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-xl shadow-gray-100/50 transition-all">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-black shadow-md flex items-center justify-center min-w-[3rem]">
                                            {displayLabel}
                                        </span>
                                        <div className="h-px w-24 bg-slate-100"></div>
                                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                            Use Case Description Section
                                        </span>
                                    </div>

                                    {!isReadOnly && (
                                        <button
                                            onClick={() => handleRemoveBlock(index)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                                            title="Remove Section"
                                        >
                                            <X size={14} /> Remove
                                        </button>
                                    )}
                                </div>

                                <div className="w-full">
                                    <DescriptionForm
                                        useCaseId={id}
                                        initialData={descriptions[id]}
                                        availableUseCases={useCaseNodes.map(node => ({
                                            id: node.id,
                                            label: node.data?.label || 'Unnamed Use Case'
                                        }))}
                                        allNodes={model.diagram.nodes}
                                        allEdges={edges}
                                        onUseCaseChange={(newId) => handleBlockUseCaseChange(index, newId)}
                                        onSave={(data) => handleSaveDescription(id, data)}
                                        isReadOnly={isReadOnly}
                                        isDevelopmentMode={!isTutorialMode}
                                    />
                                </div>
                            </div>

                            {/* Right: Checking Report Card */}
                            {isCheckingActive && (
                                <div className="w-full xl:w-96 flex-shrink-0 flex flex-col h-auto animate-in slide-in-from-right-4 duration-500 bg-white rounded-[2.5rem] border border-gray-200 overflow-hidden shadow-xl shadow-gray-100/50">
                                    {/* The panel will naturally fill the space */}
                                    <CheckingModePanel
                                        activeSection="description"
                                        label={displayLabel}
                                        useCaseId={id}
                                        modelOverride={model}
                                        reportOverride={reportOverride || localReport?.useCaseDescriptionReport || localReport?.useCaseDescription}
                                        onNavigate={() => { }}
                                        onRunChecker={onRunChecker || handleRunLocalCheck}
                                        onLocalReport={onLocalReport}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {!isReadOnly && (
                    <button
                        onClick={handleAddBlock}
                        className="w-full py-6 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-500 font-black hover:bg-indigo-50 hover:border-indigo-400 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">+</span>
                        Add Another Use Case Description
                    </button>
                )}
            </div>
        </div>
    );
};

