import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setCheckingRunning, setCheckingResults } from '../../features/checking';
import { selectTutorialModel, selectDevelopmentModel } from '../../features/diagram';
import { selectCurrentMode } from '../../features/modes';
import { selectUser } from '../../features/auth';
import { validateUseCaseName, validateActorName, validateSentence } from './grammarRules';
import { useSuccessToast, useErrorToast } from '../../components/ui/Toast';
import { checkConsistency } from './ConsistencyChecker';
import { Plus, Minus, RotateCcw } from 'lucide-react';


const CheckingModePanel = ({
    onNavigate,
    label = null, // Added for identifying specific runners (e.g. 1.1, 1.2)
    activeSection = 'usecase',
    useCaseId = null,
    modelOverride = null,
    reportOverride = null,
    onRunChecker = null,
    onLocalReport = null
}) => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector(selectCurrentMode);
    const tutorialModel = useAppSelector(selectTutorialModel);
    const developmentModel = useAppSelector(selectDevelopmentModel);
    const model = modelOverride || (mode === 'tutorial' ? tutorialModel : developmentModel);
    const checkingState = useAppSelector(state => state.checking);
    const user = useAppSelector(selectUser);
    const isStudent = user?.role === 'STUDENT';
    const successToast = useSuccessToast();
    const errorToast = useErrorToast();

    const [localReport, setLocalReport] = useState(null);
    const [localRunning, setLocalRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Font size control logic
    const [fontSize, setFontSize] = useState(() => {
        const savedSize = localStorage.getItem("reportFontSize");
        return savedSize ? Number(savedSize) : 14;
    });

    useEffect(() => {
        localStorage.setItem("reportFontSize", fontSize);
    }, [fontSize]);

    const handleIncreaseFontSize = () => setFontSize(prev => Math.min(prev + 1, 20));
    const handleDecreaseFontSize = () => setFontSize(prev => Math.max(prev - 1, 12));
    const handleResetFontSize = () => setFontSize(14);

    const isExternal = !!modelOverride || !!reportOverride || !!onRunChecker;

    // Filter and process report issues for the current section and use case
    const processReportSection = useCallback((rep) => {
        if (!rep) return null;

        let sectionData = rep;
        if (activeSection === 'usecase') sectionData = rep.useCaseDiagram || rep;
        else if (activeSection === 'description') sectionData = rep.useCaseDescription || rep;
        else if (activeSection === 'ssd') sectionData = rep.systemSequence || rep;

        // Map activeSection to potential location labels
        const sectionLocationMap = {
            'usecase': ['diagram', 'usecasediagram', 'model'],
            'description': ['description', 'usecasedescription', 'step2'],
            'ssd': ['ssd', 'systemsequence', 'systemsequencediagram', 'step3']
        };
        const targetLocations = sectionLocationMap[activeSection] || [activeSection];

        // Ensure we are only looking at issues for this section
        let filteredIssues = (sectionData.issues || []).filter(i => {
            const loc = (i.location || '').toLowerCase();
            const id = (i.id || '').toLowerCase();
            return targetLocations.some(tl => loc.includes(tl)) || id.includes(activeSection);
        });

        // Filter by useCaseId if applicable (e.g. for individual SSDs)
        if (useCaseId) {
            const idLower = useCaseId.toLowerCase();
            const relevantIssues = filteredIssues.filter(i =>
                i.context?.useCaseId === useCaseId ||
                i.relatedId === useCaseId ||
                (i.id && i.id.toLowerCase().includes(idLower)) ||
                (typeof i.problem === 'string' && i.problem.toLowerCase().includes(idLower))
            );

            // Allow general section issues if no specific ID-matched issues are found
            if (relevantIssues.length > 0) {
                filteredIssues = relevantIssues;
            }
        }

        // Recalculate score for this isolated scope
        let localScore = 100;
        filteredIssues.forEach(i => {
            if (i.severity === 'error') localScore -= 10;
            else if (i.severity === 'warning') localScore -= 5;
        });

        return {
            ...sectionData,
            issues: filteredIssues,
            score: Math.max(0, localScore),
            summary: {
                total: filteredIssues.length,
                errors: filteredIssues.filter(i => i.severity === 'error' || i.type === 'error').length,
                warnings: filteredIssues.filter(i => i.severity === 'warning' || i.type === 'warning').length,
                info: filteredIssues.filter(i => i.severity === 'info' || i.severity === 'suggestion').length
            }
        };
    }, [activeSection, useCaseId]);

    const processedReportOverride = useMemo(() => {
        return processReportSection(reportOverride);
    }, [reportOverride, processReportSection]);

    // Priority: External Report > Local Report > Global State Results
    const report = processedReportOverride || localReport || (isExternal ? null : checkingState.results);
    const isRunning = isExternal ? localRunning : checkingState.isRunning;

    const runChecks = async () => {
        if (!model || !model.id) {
            console.error('Cannot run checks: model is undefined or incomplete');
            return;
        }
        if (isExternal) setLocalRunning(true);
        else dispatch(setCheckingRunning(true));

        try {
            if (typeof onRunChecker === 'function') {
                const external = await onRunChecker({ section: activeSection, targetId: useCaseId });
                // If it's a specific item check, the response from handleRunCheck in SubmissionDetail.jsx 
                // already filters for that ID. We just need to process it.
                setLocalReport(processReportSection(external));
            } else if (modelOverride && typeof performDynamicValidation === 'function') {
                // Perform dynamic validation based on active section
                const dynamicReport = await performDynamicValidation(modelOverride, activeSection, useCaseId);
                setLocalReport(dynamicReport);

                // Notify parent so it can update diagram highlights
                if (typeof onLocalReport === 'function') {
                    onLocalReport(dynamicReport, useCaseId);
                }
            } else {
                // Perform dynamic validation based on active section (dev mode)
                const dynamicReport = await performDynamicValidation(model, activeSection, useCaseId);
                setLocalReport(dynamicReport);

                if (typeof onLocalReport === 'function') {
                    onLocalReport(dynamicReport, useCaseId);
                }
            }
        } catch (error) {
            console.error('Checking failed:', error);
            if (isExternal) setLocalRunning(false);
            else dispatch(setCheckingRunning(false));
        }
        if (isExternal) setLocalRunning(false);
    };

    const performDynamicValidation = async (model, activeSection, targetUseCaseId = null) => {
        const report = {
            summary: { total: 0, errors: 0, warnings: 0, info: 0 },
            issues: [],
            score: 100,
            tier: 'A',
            feedback: ''
        };

        const issues = [];
        const passes = [];

        if (activeSection === 'usecase') {
            // Dynamic Use Case Diagram validation
            const diagram = model.diagram;
            const nodes = diagram?.nodes ?? [];
            const edges = diagram?.edges ?? [];

            // SYSTEM RULES
            const systemBoundary = nodes.find(n => n.type === 'systemBoundary');
            if (!systemBoundary) {
                issues.push({
                    id: 'system-boundary-missing',
                    code: 'SYSTEM_BOUNDARY_MISSING',
                    severity: 'error',
                    location: 'diagram',
                    message: 'System boundary is missing.',
                    context: {}
                });
                report.score -= 20;
            } else {
                passes.push('System boundary exists');

                // Check system name — must be a meaningful name, not a placeholder or generic 'System'
                const sysLabel = (systemBoundary.data?.label || '').trim();
                const sysLabelLower = sysLabel.toLowerCase();
                const invalidSystemNames = [
                    '', 'system', 'sys', 'name', 'untitled',
                    'double click to name system', 'double click to name',
                    'click to name', 'enter name', 'new system'
                ];

                if (!sysLabel || invalidSystemNames.includes(sysLabelLower)) {
                    issues.push({
                        id: 'system-name-invalid',
                        code: 'SYSTEM_NAME_INVALID',
                        severity: 'error',
                        location: 'diagram',
                        message: !sysLabel
                            ? 'System name is missing.'
                            : `System name "${sysLabel}" is not valid. A single generic word like "System" is not a proper system name.`,
                        context: { suggestion: 'Please provide a valid system name that describes the system (e.g., "Online Shopping System", "Library Management System", "Student Portal").' }
                    });
                    report.score -= 10;
                } else if (sysLabel.split(/\s+/).length < 2) {
                    // Single-word names are weak — warn
                    issues.push({
                        id: 'system-name-weak',
                        code: 'SYSTEM_NAME_INVALID',
                        severity: 'warning',
                        location: 'diagram',
                        message: `System name "${sysLabel}" is too short. A descriptive system name should contain at least two words.`,
                        context: { suggestion: 'Please provide a more descriptive system name (e.g., "Online Shopping System", "Banking Application").' }
                    });
                    report.score -= 5;
                } else {
                    passes.push('System has a valid name');
                }
            }

            // USE CASE RULES
            const useCases = nodes.filter(n => n.type === 'usecase');
            if (useCases.length === 0) {
                issues.push({
                    id: 'no-use-cases',
                    code: 'NO_USE_CASES',
                    severity: 'error',
                    location: 'diagram',
                    message: 'No Use Cases defined inside system.',
                    context: { suggestion: 'Add at least one Use Case inside the system boundary. Use Cases describe what the system does for its actors.' }
                });
                report.score -= 25;
            } else {
                passes.push(`${useCases.length} Use Case(s) found`);
            }

            // Check each use case
            useCases.forEach(useCase => {
                // Check use case name
                if (!useCase.data?.label || useCase.data.label.trim() === '') {
                    issues.push({
                        id: `usecase-no-name-${useCase.id}`,
                        code: 'USE_CASE_NO_NAME',
                        severity: 'error',
                        location: 'diagram',
                        message: `Use Case has no name.`,
                        context: { useCaseId: useCase.id, suggestion: 'Please provide a name for this Use Case. Use Case names must follow the format: Verb + Noun (e.g., "Submit Order", "View Profile", "Register Account").' }
                    });
                    report.score -= 10;
                } else {
                    // Check use case name grammar rules
                    const validation = validateUseCaseName(useCase.data.label);
                    if (!validation.isValid) {
                        issues.push({
                            id: `usecase-invalid-name-${useCase.id}`,
                            code: 'USE_CASE_INVALID_NAME',
                            severity: 'error',
                            location: 'diagram',
                            message: `Invalid Use Case Name: "${useCase.data.label}". ${validation.error}`,
                            context: { useCaseId: useCase.id, suggestion: 'Use Case names must follow the format: Verb + Noun (e.g., "Submit Order", "View Profile", "Register Account"). Start with a verb from the dictionary.' }
                        });
                        report.score -= 10;
                    }
                }

                // Check if inside system boundary
                if (systemBoundary && useCase.parentNode !== systemBoundary.id) {
                    issues.push({
                        id: `usecase-outside-boundary-${useCase.id}`,
                        code: 'USE_CASE_OUTSIDE_BOUNDARY',
                        severity: 'error',
                        location: 'diagram',
                        message: `Use Case "${useCase.data?.label || 'Unnamed'}" is outside system boundary.`,
                        context: { useCaseId: useCase.id, suggestion: 'Drag this Use Case inside the system boundary rectangle. All Use Cases must be placed inside the system.' }
                    });
                    report.score -= 15;
                }

                // Check connections to actors
                const isConnectedToActor = edges.some(e =>
                    (e.source === useCase.id || e.target === useCase.id) &&
                    nodes.find(n => (n.id === e.source || n.id === e.target) && n.type === 'actor')
                );
                if (!isConnectedToActor) {
                    issues.push({
                        id: `usecase-not-connected-${useCase.id}`,
                        code: 'USE_CASE_NOT_CONNECTED',
                        severity: 'error',
                        location: 'diagram',
                        message: `Use Case "${useCase.data?.label || 'Unnamed'}" is not connected to any Actor.`,
                        context: { useCaseId: useCase.id, suggestion: 'Draw an association line from an Actor to this Use Case. Every Use Case must be connected to at least one Actor.' }
                    });
                    report.score -= 10;
                }
            });

            // Check for duplicate use case names
            const useCaseNames = useCases.map(uc => uc.data?.label).filter(Boolean);
            const duplicateUseCaseNames = useCaseNames.filter((name, index) => useCaseNames.indexOf(name) !== index);
            duplicateUseCaseNames.forEach(name => {
                issues.push({
                    id: `duplicate-usecase-name-${name}`,
                    code: 'DUPLICATE_USE_CASE_NAME',
                    severity: 'error',
                    location: 'diagram',
                    message: `Duplicate Use Case name: "${name}"`,
                    context: { name, suggestion: `Rename one of the duplicate Use Cases. Each Use Case must have a unique name.` }
                });
                report.score -= 15;
            });

            // ACTOR RULES
            const actors = nodes.filter(n => n.type === 'actor');
            if (actors.length === 0) {
                issues.push({
                    id: 'no-actors',
                    code: 'NO_ACTORS',
                    severity: 'error',
                    location: 'diagram',
                    message: 'No Actors defined.',
                    context: { suggestion: 'Add at least one Actor to the diagram. Actors represent external users or systems that interact with your system (e.g., "Student", "Admin").' }
                });
                report.score -= 25;
            } else {
                passes.push(`${actors.length} Actor(s) found`);
            }

            // Check each actor
            actors.forEach(actor => {
                // Check actor name
                if (!actor.data?.label || actor.data.label.trim() === '') {
                    issues.push({
                        id: `actor-no-name-${actor.id}`,
                        code: 'ACTOR_NO_NAME',
                        severity: 'error',
                        location: 'diagram',
                        message: `Actor has no name.`,
                        context: { actorId: actor.id, suggestion: 'Please provide a name for this Actor. Actors represent external entities (e.g., "Student", "Teacher", "Admin").' }
                    });
                    report.score -= 10;
                } else {
                    // Check actor name validation rules
                    const validation = validateActorName(actor.data.label);
                    if (!validation.isValid) {
                        issues.push({
                            id: `actor-invalid-name-${actor.id}`,
                            code: 'ACTOR_INVALID_NAME',
                            severity: 'error',
                            location: 'diagram',
                            message: `Invalid Actor Name: "${actor.data.label}". ${validation.error}`,
                            context: { actorId: actor.id, suggestion: 'Actors represent external entities that interact with the system. Use human-readable names like "Student", "Teacher", "Customer". An actor cannot be named "System".' }
                        });
                        report.score -= 10;
                    }
                }

                // Check connections to use cases
                const isConnectedToUseCase = edges.some(e =>
                    (e.source === actor.id || e.target === actor.id) &&
                    nodes.find(n => (n.id === e.source || n.id === e.target) && n.type === 'usecase')
                );
                if (!isConnectedToUseCase) {
                    issues.push({
                        id: `actor-not-connected-${actor.id}`,
                        code: 'ACTOR_NOT_CONNECTED',
                        severity: 'error',
                        location: 'diagram',
                        message: `Actor "${actor.data?.label || 'Unnamed'}" is not connected to any Use Case.`,
                        context: { actorId: actor.id, actorName: actor.data?.label, suggestion: 'Draw an association line from this Actor to at least one Use Case.' }
                    });
                    report.score -= 10;
                }
            });

            // Check for duplicate actor names
            const actorNames = actors.map(a => a.data?.label).filter(Boolean);
            const duplicateActorNames = actorNames.filter((name, index) => actorNames.indexOf(name) !== index);
            duplicateActorNames.forEach(name => {
                issues.push({
                    id: `duplicate-actor-name-${name}`,
                    code: 'DUPLICATE_ACTOR_NAME',
                    severity: 'error',
                    location: 'diagram',
                    message: `Duplicate Actor name: "${name}"`,
                    context: { name, suggestion: `Rename one of the duplicate Actors. Each Actor must have a unique name.` }
                });
                report.score -= 15;
            });

        } else if (activeSection === 'description') {
            // Dynamic Use Case Description validation
            const descriptions = model.descriptions ?? {};
            const diagramUseCases = model.diagram?.nodes?.filter(n => n.type === 'usecase') || [];

            if (Object.keys(descriptions).length === 0 && diagramUseCases.length > 0) {
                issues.push({
                    id: 'no-descriptions',
                    code: 'NO_DESCRIPTIONS',
                    severity: 'error',
                    location: 'description',
                    message: 'No Use Case descriptions found for defined use cases.',
                    context: {}
                });
                report.score -= 50;
            } else if (Object.keys(descriptions).length === 0) {
                issues.push({
                    id: 'no-descriptions',
                    code: 'NO_DESCRIPTIONS',
                    severity: 'warning',
                    location: 'description',
                    message: 'No Use Case descriptions found.',
                    context: {}
                });
            }

            Object.entries(descriptions).forEach(([useCaseId, description]) => {
                // If targetUseCaseId is provided, skip others
                if (targetUseCaseId && useCaseId !== targetUseCaseId) return;

                // Check Title/Use Case Name
                if (!description.useCaseName || description.useCaseName.trim() === '') {
                    issues.push({
                        id: `no-title-${useCaseId}`,
                        code: 'NO_TITLE',
                        severity: 'error',
                        location: 'description',
                        message: `Use Case title is missing.`,
                        context: { useCaseId, suggestion: 'Add a name for the use case description' }
                    });
                    report.score -= 20;
                } else {
                    passes.push(`Title defined: ${description.useCaseName}`);
                }

                // Check primary actor
                const isNotSetActor = !description.primaryActor ||
                    description.primaryActor.trim() === '' ||
                    description.primaryActor.toLowerCase() === 'not set';

                if (isNotSetActor) {
                    issues.push({
                        id: `no-primary-actor-${useCaseId}`,
                        code: 'NO_PRIMARY_ACTOR',
                        severity: 'error',
                        location: 'description',
                        message: `Primary actor not set, please set it.`,
                        context: { useCaseId, suggestion: 'Please set up Primary Actor' }
                    });
                    report.score -= 20;
                } else {
                    // Check if selected actor exists in diagram
                    const actorLabels = (model.diagram?.nodes || [])
                        .filter(n => n.type === 'actor')
                        .map(n => (n.data?.label || '').trim().toLowerCase());

                    const selectedActorLower = description.primaryActor.trim().toLowerCase();

                    if (actorLabels.length > 0 && !actorLabels.includes(selectedActorLower)) {
                        issues.push({
                            id: `invalid-primary-actor-${useCaseId}`,
                            code: 'INVALID_PRIMARY_ACTOR',
                            severity: 'error',
                            location: 'description',
                            message: `Primary Actor "${description.primaryActor}" does not exist in the diagram.`,
                            context: { useCaseId, suggestion: 'Ensure Primary Actor name matches the one in the Use Case Diagram.' }
                        });
                        report.score -= 10;
                    } else {
                        passes.push(`Primary actor defined: ${description.primaryActor}`);
                    }
                }

                // Check preconditions
                const isNoPre = !description.preconditions ||
                    description.preconditions.trim() === '' ||
                    description.preconditions.toLowerCase() === 'none';

                if (isNoPre) {
                    issues.push({
                        id: `no-preconditions-${useCaseId}`,
                        code: 'NO_PRECONDITIONS',
                        severity: 'error',
                        location: 'description',
                        message: `Precondition missing, please define it.`,
                        context: { useCaseId, suggestion: 'Please write Precondition' }
                    });
                    report.score -= 15;
                } else {
                    const validation = validateSentence(description.preconditions);
                    if (!validation.isValid) {
                        issues.push({
                            id: `invalid-preconditions-${useCaseId}`,
                            code: 'INVALID_PRECONDITIONS',
                            severity: 'error',
                            location: 'description',
                            message: `Invalid Precondition: ${validation.error}`,
                            context: { useCaseId, suggestion: 'Precondition: Write a proper sentence (e.g., "The user is logged in.").' }
                        });
                        report.score -= 10;
                    } else {
                        passes.push('Preconditions defined');
                    }
                }

                // Check postconditions
                const isNoPost = !description.postconditions ||
                    description.postconditions.trim() === '' ||
                    description.postconditions.toLowerCase() === 'none';

                if (isNoPost) {
                    issues.push({
                        id: `no-postconditions-${useCaseId}`,
                        code: 'NO_POSTCONDITIONS',
                        severity: 'error',
                        location: 'description',
                        message: `Postcondition missing, please define it.`,
                        context: { useCaseId, suggestion: 'Please write Postcondition' }
                    });
                    report.score -= 15;
                } else {
                    const validation = validateSentence(description.postconditions);
                    if (!validation.isValid) {
                        issues.push({
                            id: `invalid-postconditions-${useCaseId}`,
                            code: 'INVALID_POSTCONDITIONS',
                            severity: 'error',
                            location: 'description',
                            message: `Invalid Postcondition: ${validation.error}`,
                            context: { useCaseId, suggestion: 'Postcondition: Write a proper sentence (e.g., "The order is saved in the database.").' }
                        });
                        report.score -= 10;
                    } else {
                        passes.push('Postconditions defined');
                    }
                }

                // Check main flow
                if (!description.mainFlow || description.mainFlow.length === 0) {
                    issues.push({
                        id: `no-main-flow-${useCaseId}`,
                        code: 'NO_MAIN_FLOW',
                        severity: 'error',
                        location: 'description',
                        message: `Main success scenario is empty.`,
                        context: { useCaseId, suggestion: 'Add at least one step to the main flow' }
                    });
                    report.score -= 30;
                } else {
                    passes.push(`Main flow defined`);
                    // Check each step is not empty
                    description.mainFlow.forEach((step, index) => {
                        if (!step.action || step.action.trim() === '') {
                            issues.push({
                                id: `empty-main-flow-step-${useCaseId}-${index}`,
                                code: 'EMPTY_MAIN_FLOW_STEP',
                                severity: 'error',
                                location: 'description',
                                message: `Main Success Scenario step ${index + 1} is empty.`,
                                context: { useCaseId, stepIndex: index + 1, suggestion: `Fill in the action for step ${index + 1}` }
                            });
                            report.score -= 5;
                        } else {
                            // Check if step content is a proper sentence
                            const validation = validateSentence(step.action);
                            if (!validation.isValid) {
                                issues.push({
                                    id: `invalid-main-flow-step-${useCaseId}-${index}`,
                                    code: 'INVALID_MAIN_FLOW_STEP',
                                    severity: 'error',
                                    location: 'description',
                                    message: `Main Success Scenario step ${index + 1} is invalid: ${validation.error}`,
                                    context: { useCaseId, stepIndex: index + 1, suggestion: `Step ${index + 1}: Write a clear and complete sentence.` }
                                });
                                report.score -= 5;
                            } else {
                                passes.push(`Step ${index + 1} content`);
                            }
                        }
                    });
                }

                // Check alternative flows - only if they exist
                if (description.alternativeFlows && description.alternativeFlows.length > 0) {
                    description.alternativeFlows.forEach((altFlow, index) => {
                        const hasCondition = altFlow.condition && altFlow.condition.trim() !== '';
                        const hasResponse = altFlow.response && altFlow.response.trim() !== '';

                        // Skip completely empty optional rows
                        if (!hasCondition && !hasResponse) return;

                        if (!hasCondition) {
                            issues.push({
                                id: `empty-alt-flow-condition-${useCaseId}-${index}`,
                                code: 'EMPTY_ALT_FLOW_CONDITION',
                                severity: 'error',
                                location: 'description',
                                message: `Alternative Flow ${index + 1} condition is empty.`,
                                context: { useCaseId, altFlowIndex: index + 1, suggestion: `Fill in the condition for alt flow ${index + 1}` }
                            });
                        } else {
                            passes.push(`Alt Flow ${index + 1} condition`);
                        }

                        if (!hasResponse) {
                            issues.push({
                                id: `empty-alt-flow-response-${useCaseId}-${index}`,
                                code: 'EMPTY_ALT_FLOW_RESPONSE',
                                severity: 'error',
                                location: 'description',
                                message: `Alternative Flow ${index + 1} response is empty.`,
                                context: { useCaseId, altFlowIndex: index + 1, suggestion: `Fill in the response for alt flow ${index + 1}` }
                            });
                        } else {
                            passes.push(`Alt Flow ${index + 1} response`);
                        }
                    });
                }
            });

        } else if (activeSection === 'ssd') {
            // Dynamic SSD validation
            const ssds = model.ssds ?? {};

            // Get system name from Use Case diagram
            const systemBoundaryNode = model.diagram?.nodes?.find(n => n.type === 'systemBoundary');
            const expectedSystemName = (systemBoundaryNode?.data?.label || '').trim();

            if (Object.keys(ssds).length === 0 && !targetUseCaseId) {
                issues.push({
                    id: 'no-ssds',
                    code: 'NO_SSDS',
                    severity: 'warning',
                    location: 'ssd',
                    message: 'No System Sequence Diagrams found.',
                    context: {}
                });
                report.score -= 20;
            } else if (targetUseCaseId && !ssds[targetUseCaseId]) {
                issues.push({
                    id: `ssd-missing-${targetUseCaseId}`,
                    code: 'SSD_MISSING',
                    severity: 'error',
                    location: 'ssd',
                    message: 'System Sequence Diagram for this Use Case is missing.',
                    context: { useCaseId: targetUseCaseId }
                });
                report.score -= 20;
            } else {
                if (!targetUseCaseId) {
                    passes.push(`${Object.keys(ssds).length} SSD(s) found`);
                }
            }

            Object.entries(ssds).forEach(([useCaseId, rawSsd]) => {
                // If targetUseCaseId is provided, skip others
                if (targetUseCaseId && useCaseId !== targetUseCaseId) return;

                // Normalize SSD data structure
                let ssd = rawSsd;
                if (ssd && ssd.semanticData) ssd = ssd.semanticData;
                else if (ssd && ssd.diagramData) {
                    // If only diagram data exists, it might need conversion, 
                    // but for dynamic check we usually have lifelines/messages directly or in semanticData
                    ssd = ssd.diagramData;
                }

                if (!ssd || !ssd.lifelines || ssd.lifelines.length < 2) {
                    issues.push({
                        id: `incomplete-ssd-${useCaseId}`,
                        code: 'INCOMPLETE_SSD',
                        severity: 'error',
                        location: 'ssd',
                        message: `SSD is incomplete or missing lifelines (minimum 2 required).`,
                        context: { useCaseId }
                    });
                    report.score -= 15;
                } else {
                    passes.push(`SSD has ${ssd.lifelines.length} lifelines`);
                }

                // Check for messages
                if (!ssd.messages || ssd.messages.length === 0) {
                    issues.push({
                        id: `no-messages-${useCaseId}`,
                        code: 'NO_MESSAGES',
                        severity: 'error',
                        location: 'ssd',
                        message: `SSD has no messages.`,
                        context: { useCaseId }
                    });
                    report.score -= 20;
                } else {
                    passes.push(`SSD has ${ssd.messages.length} messages`);

                    // --- NEW: USE CASE DESCRIPTION TO SSD CONSISTENCY CHECK ---
                    const description = model.descriptions ? model.descriptions[useCaseId] : null;
                    if (description && description.mainFlow && description.mainFlow.length > 0) {
                        // Gather actors from the diagram for better detection
                        const diagramActors = model.diagram?.nodes
                            ?.filter(n => n.type === 'actor')
                            ?.map(n => n.data?.label)
                            .filter(Boolean) || [];

                        // Map SSD messages to format expected by checker
                        const ssdMessagesWithLabels = ssd.messages.map(msg => {
                            const senderNode = ssd.lifelines?.find(l => l.id === msg.fromLifelineId);
                            // Determine sender type (lifelineType is set during node creation)
                            const senderType = senderNode?.type || senderNode?.lifelineType;

                            return {
                                ...msg,
                                text: msg.name || msg.text || msg.label || '',
                                senderLabel: senderNode ? (senderNode.label || senderNode.name) : '',
                                senderType: senderType,
                                y: Number(msg.positionY || msg.y || 0)
                            };
                        }).sort((a, b) => a.y - b.y);

                        const consistencyIssues = checkConsistency(
                            description.mainFlow,
                            ssdMessagesWithLabels,
                            diagramActors,
                            description.primaryActor
                        );

                        if (consistencyIssues.length > 0) {
                            consistencyIssues.forEach((issue, idx) => {
                                issues.push({
                                    id: `ssd-consistent-${useCaseId}-${issue.category}-${issue.stepNumber || idx}`,
                                    code: issue.category,
                                    severity: issue.severity || issue.type,
                                    location: 'ssd',
                                    message: issue.message,
                                    context: { useCaseId, ...issue }
                                });
                                // Deduct points
                                if (issue.type === 'error') report.score -= 10;
                                else report.score -= 5;
                            });
                        } else {
                            passes.push(`SSD is consistent with Main Success Scenario`);
                        }
                    } else if (!description) {
                        issues.push({
                            id: `missing-description-for-ssd-${useCaseId}`,
                            code: 'MISSING_DESCRIPTION_FOR_SSD',
                            severity: 'warning',
                            location: 'ssd',
                            message: `No Use Case Description found to validate SSD consistency.`,
                            context: { useCaseId }
                        });
                    }
                }
            });
        }

        // Calculate final score and summary
        report.issues = issues;

        const errorsCount = issues.filter(i => i.severity === 'error' || i.type === 'error').length;
        const warningsCount = issues.filter(i => i.severity === 'warning' || i.type === 'warning').length;
        const infoCount = issues.filter(i => i.severity === 'info' || i.severity === 'suggestion').length;

        // Ensure score is within valid range [0, 100]
        report.score = Math.max(0, Math.min(100, report.score));

        report.summary = {
            total: issues.length,
            errors: errorsCount,
            warnings: warningsCount,
            info: infoCount
        };

        report.passes = passes; // Include passed checks for detailed reporting

        // Determine tier and feedback
        if (report.score >= 90) {
            report.tier = 'A';
            report.feedback = 'Excellent work! Your UML model is well-structured and complete.';
        } else if (report.score >= 80) {
            report.tier = 'B';
            report.feedback = 'Good job! Your model has most required elements with minor issues.';
        } else if (report.score >= 70) {
            report.tier = 'C';
            report.feedback = 'Decent effort. Consider addressing the warnings to improve your model.';
        } else if (report.score >= 60) {
            report.tier = 'D';
            report.feedback = 'Your model needs some work. Focus on fixing the errors first.';
        } else {
            report.tier = 'F';
            report.feedback = 'Your model requires significant improvements. Please review all the issues.';
        }

        return report;
    };

    const generateTextReport = () => {
        if (!report) return 'Please run the checker to see the report.';

        // External (submission) report: render a generic list instead of dev-specific checks
        if (isExternal && (report?.errors || report?.warnings || report?.suggestions) && !(report?.issues?.length)) {
            const errors = report?.errors || [];
            const warnings = report?.warnings || [];
            const suggestions = report?.suggestions || [];

            let textReport = '---------------------------------\n';
            textReport += 'CHECKING REPORT\n';
            textReport += '---------------------------------\n\n';

            if (errors.length === 0 && warnings.length === 0 && suggestions.length === 0) {
                textReport += '✓ No issues found.\n';
            } else {
                if (errors.length > 0) {
                    textReport += 'Errors:\n';
                    errors.forEach((i) => { textReport += `✗ ${i.message}\n`; });
                    textReport += '\n';
                }
                if (warnings.length > 0) {
                    textReport += 'Warnings:\n';
                    warnings.forEach((i) => { textReport += `! ${i.message}\n`; });
                    textReport += '\n';
                }
                if (suggestions.length > 0) {
                    textReport += 'Suggestions:\n';
                    suggestions.forEach((i) => { textReport += `• ${i.message}\n`; });
                    textReport += '\n';
                }
            }

            textReport += '\n--- VALIDATION SUMMARY ---\n';
            textReport += `✗ ${errors.length} Error(s) found\n`;
            if (warnings.length > 0) textReport += `! ${warnings.length} Warning(s) found\n`;
            textReport += `\nOverall Score: ${Math.max(0, report?.score ?? 0)}%\n`;
            textReport += '---------------------------------';
            return textReport;
        }

        let textReport = '---------------------------------\n';
        textReport += 'CHECKING REPORT\n';
        textReport += '---------------------------------\n\n';

        const issues = report?.issues ?? [];

        if (activeSection === 'usecase') {
            // Use Case Diagram specific report
            const sysBoundaryIssues = issues.filter(i => i.code === 'SYSTEM_BOUNDARY_MISSING');
            const sysNameIssues = issues.filter(i => i.code === 'SYSTEM_NAME_MISSING' || i.code === 'SYSTEM_NAME_INVALID');
            const ucIssues = issues.filter(i => i.location === 'diagram' && i.code?.includes('USE_CASE'));
            const actorIssues = issues.filter(i => i.location === 'diagram' && i.code?.includes('ACTOR'));

            textReport += `${sysBoundaryIssues.length === 0 ? '✓' : '✗'} System Boundary exists\n`;


            if (sysNameIssues.length === 0) {
                textReport += '✓ System has a valid name\n';
            } else {
                sysNameIssues.forEach(i => {
                    textReport += `✗ ${i.message}\n`;
                });
            }

            if (ucIssues.length === 0) {
                textReport += '✓ Use Cases properly defined\n';
            } else {
                ucIssues.forEach(i => {
                    textReport += `✗ ${i.message}\n`;
                });
            }

            if (actorIssues.length === 0) {
                textReport += '✓ Actors properly defined\n';
            } else {
                actorIssues.forEach(i => {
                    textReport += `✗ ${i.message}\n`;
                });
            }

        } else if (activeSection === 'description') {
            // Use Case Description specific report
            const hasNoTitle = issues.some(i => i.code === 'NO_TITLE');
            const hasNoActor = issues.some(i => i.code === 'NO_PRIMARY_ACTOR');
            const hasNoPre = issues.some(i =>
                i.code === 'NO_PRECONDITIONS' ||
                i.code === 'INVALID_PRECONDITIONS' ||
                (i.message && i.message.toLowerCase().includes('precondition') && i.severity === 'error') ||
                (i.id && i.id.toLowerCase().includes('precondition'))
            );
            const hasNoPost = issues.some(i =>
                i.code === 'NO_POSTCONDITIONS' ||
                i.code === 'INVALID_POSTCONDITIONS' ||
                (i.message && i.message.toLowerCase().includes('postcondition') && i.severity === 'error') ||
                (i.id && i.id.toLowerCase().includes('postcondition'))
            );
            const hasNoFlow = issues.some(i =>
                i.code === 'NO_MAIN_FLOW' ||
                i.code === 'EMPTY_MAIN_FLOW_STEP' ||
                i.code === 'INVALID_MAIN_FLOW_STEP' ||
                (i.message && i.message.toLowerCase().includes('main flow') && i.severity === 'error') ||
                (i.message && i.message.toLowerCase().includes('main success scenario') && i.severity === 'error')
            );

            textReport += `${hasNoTitle ? '✗' : '✓'} Use Case Name defined\n`;
            textReport += `${hasNoActor ? '✗' : '✓'} Primary Actor selected\n`;
            textReport += `${hasNoPre ? '✗' : '✓'} Preconditions defined\n`;
            textReport += `${hasNoPost ? '✗' : '✓'} Postconditions defined\n`;
            textReport += `${hasNoFlow ? '✗' : '✓'} Main Success Scenario defined\n`;

        } else if (activeSection === 'ssd') {
            // SSD specific report
            const ssdIssues = issues.filter(i => i.location === 'ssd');
            const hasNoSSDs = issues.some(i => i.code === 'NO_SSDS' || i.code === 'SSD_MISSING' || i.code === 'SSD_ACTOR_MISSING' || i.code === 'SSD_SYSTEM_MISSING');
            const structuralIssues = ssdIssues.filter(i =>
                !i.code?.includes('CONSISTENCY') &&
                i.code !== 'SYSTEM_NAME_MISMATCH' &&
                i.severity === 'error'
            );
            const consistencyIssues = ssdIssues.filter(i =>
                i.code?.includes('CONSISTENCY') ||
                i.type === 'consistency'
            );

            if (hasNoSSDs) {
                const specificIssue = issues.find(i => i.code === 'SSD_MISSING' || i.code === 'NO_SSDS' || i.code === 'SSD_ACTOR_MISSING' || i.code === 'SSD_SYSTEM_MISSING');
                textReport += `✗ ${specificIssue?.message || 'SSD Participants missing or incorrectly defined.'}\n`;
            } else if (structuralIssues.length > 0) {
                textReport += '✗ SSD structural errors found.\n';
                structuralIssues.forEach(i => textReport += `  - ${i.message}\n`);
            } else {
                // Determine the mapping reference
                let mapRef = 'Success Scenario';
                if (label && label.includes('.')) {
                    const sectionNum = label.split('.').pop();
                    mapRef = `Description 2.${sectionNum}`;
                } else if (useCaseId) {
                    const idParts = useCaseId.split('-');
                    const idNum = idParts[idParts.length - 1];
                    mapRef = `Description 2.${idNum?.substring(0, 4) || 'x'}`;
                }

                textReport += `✓ SSD mapped correctly to ${mapRef}\n`;
                textReport += '✓ SSD lifelines & structure correct\n';

                if (consistencyIssues.length === 0) {
                    textReport += `✓ SSD interaction flow matches ${mapRef}\n`;
                } else {
                    // Actor mismatch issues (diagram-level)
                    const actorMismatchIssues = consistencyIssues.filter(i =>
                        i.code === 'CONSISTENCY_ACTOR_DIAGRAM_MISMATCH'
                    );
                    if (actorMismatchIssues.length > 0) {
                        actorMismatchIssues.forEach(issue => {
                            textReport += `\n✗ Actor Mismatch:\n`;
                            textReport += `  - ${issue.context?.problem || issue.message}\n`;
                        });
                    }

                    // Group step-level issues by step number
                    const stepIssues = consistencyIssues.filter(i =>
                        i.code !== 'CONSISTENCY_ACTOR_DIAGRAM_MISMATCH'
                    );

                    if (stepIssues.length > 0) {
                        textReport += `\nStep-by-Step Analysis:\n`;

                        const byStep = {};
                        stepIssues.forEach(issue => {
                            const step = issue.context?.stepNumber || '?';
                            if (!byStep[step]) byStep[step] = [];
                            byStep[step].push(issue);
                        });

                        Object.keys(byStep)
                            .sort((a, b) => (a === '?' ? 1 : b === '?' ? -1 : Number(a) - Number(b)))
                            .forEach(stepNo => {
                                const stepIssueList = byStep[stepNo];

                                // Determine match status from context
                                const matchStatus = stepIssueList[0]?.context?.matchStatus || 'unknown';
                                const hasError = stepIssueList.some(i => i.severity === 'error');
                                const hasWarning = stepIssueList.some(i => i.severity === 'warning');

                                let icon, statusLabel;
                                if (matchStatus === 'missing') {
                                    icon = '✗'; statusLabel = 'Missing';
                                } else if (matchStatus === 'partial') {
                                    icon = '!'; statusLabel = 'Partially Matched';
                                } else if (matchStatus === 'extra') {
                                    icon = '!'; statusLabel = 'Extra Message';
                                } else if (matchStatus === 'matched' && hasError) {
                                    icon = '!'; statusLabel = 'Matched (issues found)';
                                } else if (matchStatus === 'matched') {
                                    icon = '✓'; statusLabel = 'Matched';
                                } else {
                                    icon = hasError ? '✗' : hasWarning ? '!' : '->';
                                    statusLabel = hasError ? 'Error' : hasWarning ? 'Warning' : 'Suggestion';
                                }

                                textReport += `\n${icon} Step ${stepNo} (${statusLabel})\n`;

                                stepIssueList.forEach(issue => {
                                    const problem = issue.context?.problem || issue.message;
                                    textReport += `  - ${problem}\n`;

                                });
                            });
                    }
                }
            }
        }

        // Final filter for reporting text to focus ONLY on the specific use case if ID is provided
        if (useCaseId) {
            // Further trim issues by ID just in case (though entries loop above should handle most)
            // But we keep this for consistency
        }

        // Summary Section
        textReport += '\n--- VALIDATION SUMMARY ---\n';
        const errorCount = issues.filter(i => i.severity === 'error').length;
        const warningCount = issues.filter(i => i.severity === 'warning').length;

        if (errorCount === 0 && warningCount === 0) {
            textReport += '✓ All elements are correct.\n';
        } else {
            textReport += `✗ ${errorCount} Error(s) found\n`;
            if (warningCount > 0) textReport += `! ${warningCount} Warning(s) found\n`;

            textReport += '\nSuggestions:\n';
            const suggestions = new Set();
            issues.forEach(issue => {
                if (issue.context && issue.context.suggestion) {
                    let stepPrefix = '';
                    if (issue.context.stepNumber && issue.context.stepNumber !== '?') {
                        stepPrefix = `Step ${issue.context.stepNumber}: `;
                    }
                    let line = `• ${stepPrefix}${issue.context.suggestion}`;
                    // Append smart suggestions inline if available
                    if (issue.context.suggestions) {
                        const sg = issue.context.suggestions;
                        line += `\n    → Nearest Message : "${sg.nearestMessage}"`;
                        line += `\n    → Function Name   : ${sg.nearestFunction}()`;
                        line += `\n    → With Parameter  : ${sg.nearestFunctionWithParam}`;
                    }
                    suggestions.add(line);
                } else {
                    // Fallback for code-based suggestions
                    if (issue.code === 'USE_CASE_INVALID_NAME') suggestions.add('• Rename Use Case to use "Verb + Object"');
                }
            });
            suggestions.forEach(s => textReport += `${s}\n`);
        }

        textReport += `\nOverall Score: ${Math.max(0, report?.score ?? 0)}%\n`;
        textReport += '---------------------------------';

        return textReport;
    };

    useEffect(() => {
        // Auto-refresh validation when the active editor (activeSection) changes (dev mode only)
        if (!isExternal && model?.id) {
            dispatch(setCheckingResults(null)); // Reset previous report
            runChecks();
        }
    }, [activeSection, model?.id, isExternal]);

    const summary = useMemo(() => {
        const issues = report?.issues ?? [];
        const errors = issues.filter(i => i.severity === 'error' || i.type === 'error').length;
        const warnings = issues.filter(i => i.severity === 'warning' || i.type === 'warning').length;
        const info = issues.filter(i => i.severity === 'info' || i.type === 'suggestion').length;
        const total = report?.summary?.total ?? issues.length;
        return { total, errors, warnings, info };
    }, [report]);

    const errorsCount = report?.summary?.errors ?? summary.errors ?? 0;
    const warningsCount = report?.summary?.warnings ?? summary.warnings ?? 0;
    const totalIssues = report?.summary?.total ?? summary.total ?? 0;
    const passedChecks = totalIssues > 0 ? Math.max(0, 10 - totalIssues) : 10;

    if (!report) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Checking Mode</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        {onRunChecker ? (isStudent ? 'Your UML model is ready for review.' : 'Run validation checks on your UML model to identify structural issues and inconsistencies.') : 'Review the official feedback and consistency findings provided by your teacher.'}
                    </p>
                    {onRunChecker && !isStudent && (
                        <button
                            onClick={runChecks}
                            disabled={isRunning}
                            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isRunning ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                                    Running Checks...
                                </>
                            ) : (
                                <>🔍 Run Checker</>
                            )}
                        </button>
                    )}
                </div>
                <div className="flex-1 p-6 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">🔍</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {onRunChecker ? 'Ready to Check' : 'No report available yet'}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                            {onRunChecker ? 'Click "Run Checker" to validate your UML model and see a detailed report.' : 'Once the teacher reviews your assignment, their report will be displayed here.'}
                        </p>
                    </div>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-widest flex justify-between">
                    <span>Manual validation mode</span>
                </div>
            </div>
        );
    }

    if (isRunning) {
        return (
            <div className="flex flex-col items-center justify-center h-80 bg-white/50 backdrop-blur-md rounded-2xl border border-gray-100 shadow-xl">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-xl">🔍</div>
                </div>
                <p className="mt-6 text-sm font-bold text-gray-900 tracking-tight">Analyzing UML Artifacts...</p>
                <p className="mt-1 text-xs text-gray-500">Checking cross-artifact consistency rules</p>
            </div>
        );
    }

    return (
        <div data-testid="checking-report" className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        Checking Report {label && <span className="text-sm bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 font-black">{label}</span>}
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200 shadow-sm" title="Adjust text size">
                            <button onClick={handleDecreaseFontSize} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded transition-all active:scale-95"><Minus size={14} strokeWidth={2.5} /></button>
                            <span className="text-[11px] font-black text-gray-400 w-6 text-center select-none">{fontSize}</span>
                            <button onClick={handleIncreaseFontSize} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded transition-all active:scale-95"><Plus size={14} strokeWidth={2.5} /></button>
                            <div className="w-px h-4 bg-gray-300 mx-1"></div>
                            <button onClick={handleResetFontSize} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded transition-all active:scale-95" title="Reset text size"><RotateCcw size={12} strokeWidth={3} /></button>
                        </div>
                        {onRunChecker && !isStudent && (
                            <button
                                onClick={runChecks}
                                disabled={isRunning}
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                            >
                                {isRunning ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" />
                                        Running...
                                    </>
                                ) : (
                                    <>🔍 Run Checker</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
                {/* Score Display (Hidden for Students) */}
                {!isStudent && (
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">Score:</span>
                            <span className={`font-bold text-lg ${(report?.score ?? 0) >= 80 ? 'text-green-600' : (report?.score ?? 0) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {report?.score ?? 0}%
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                {passedChecks} Passed
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                                {warningsCount} Warnings
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-500 rounded-full" />
                                {errorsCount} Errors
                            </span>
                        </div>
                    </div>
                )}
            </div>
            {/* Text Report Display */}
            <div className="flex-1 p-4 overflow-auto">
                <pre
                    className="font-mono text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-200 transition-all duration-200 ease-in-out"
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                >
                    {generateTextReport()}
                </pre>
            </div>
            {/* Footer Info */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <div className="flex justify-between items-center">
                </div>
            </div>
        </div>
    );
};

export default CheckingModePanel;

