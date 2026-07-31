import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setCheckingRunning, setCheckingResults } from '../../features/checking';
import { selectTutorialModel, selectDevelopmentModel } from '../../features/diagram';
import { selectCurrentMode } from '../../features/modes';
import { selectUser } from '../../features/auth';
import { validateUseCaseName, validateActorName, validateSentence } from './grammarRules';
import { useSuccessToast, useErrorToast } from '../../components/ui/Toast';
import { checkConsistency } from './ConsistencyChecker';
import { normalizeName } from '../../nlp/similarity';
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
        return savedSize ? Number(savedSize) : 15;
    });

    useEffect(() => {
        localStorage.setItem("reportFontSize", fontSize);
    }, [fontSize]);

    const handleIncreaseFontSize = () => setFontSize(prev => Math.min(prev + 1, 20));
    const handleDecreaseFontSize = () => setFontSize(prev => Math.max(prev - 1, 12));
    const handleResetFontSize = () => setFontSize(15);

    const isExternal = !!modelOverride || !!reportOverride || !!onRunChecker;

    // Filter and process report issues for the current section and use case
    const processReportSection = useCallback((rep) => {
        if (!rep) return null;

        const isFlatReport = Array.isArray(rep.issues);

        let sectionData = rep;
        if (!isFlatReport) {
            if (activeSection === 'usecase') sectionData = rep.useCaseDiagram || rep;
            else if (activeSection === 'description') sectionData = rep.useCaseDescription || rep;
            else if (activeSection === 'ssd') sectionData = rep.systemSequence || rep;
            else if (activeSection === 'class-diagram') sectionData = rep.classDiagram || rep;
            else if (activeSection === 'sequence-diagram') sectionData = rep.sequenceDiagram || rep;
        }

        // Map activeSection to potential location labels
        const sectionLocationMap = {
            'usecase': ['diagram', 'usecasediagram', 'model'],
            'description': ['description', 'usecasedescription', 'step2'],
            'ssd': ['ssd', 'systemsequence', 'systemsequencediagram', 'step3'],
            'class-diagram': ['class-diagram', 'classdiagram', 'step4'],
            'sequence-diagram': ['sequence-diagram', 'sequencediagram', 'step5']
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
            filteredIssues = filteredIssues.filter(i => {
                const issueUseCaseId = i.context?.useCaseId || i.relatedId;
                if (issueUseCaseId) {
                    return issueUseCaseId === useCaseId || issueUseCaseId.toLowerCase() === idLower;
                }

                // Fallback checks for specific ID patterns if context is missing
                const hasMatch = (i.id && i.id.toLowerCase().includes(idLower)) ||
                    (typeof i.problem === 'string' && i.problem.toLowerCase().includes(idLower));

                // If it doesn't have an explicit use case ID, assume it's a general issue
                return hasMatch;
            });
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

            if (nodes.length === 0) {
                issues.push({
                    id: 'no-nodes',
                    code: 'NO_NODES',
                    severity: 'error',
                    location: 'diagram',
                    message: 'Use Case Diagram not found.'
                });
                // Continue or return? If we return, we must finalize report
                report.issues = issues;
                report.score = 0;
                report.summary = { total: 1, errors: 1, warnings: 0, info: 0 };
                return report;
            }

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
            let descriptions = model.descriptions ?? {};
            if (Array.isArray(descriptions)) {
                descriptions = {};
                model.descriptions.forEach((desc, idx) => {
                    if (desc && desc.useCaseNodeId) {
                        descriptions[desc.useCaseNodeId] = desc;
                    }
                });
            }
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
                    severity: 'error',
                    location: 'description',
                    message: 'No Use Case descriptions found.',
                    context: {}
                });
            }

            // Build name-based fallback map for stale relatedId handling
            const descriptionByName = new Map();
            Object.entries(descriptions).forEach(([key, desc]) => {
                if (desc && desc.useCaseName) {
                    const n = normalizeName(desc.useCaseName);
                    if (n) descriptionByName.set(n, { key, desc });
                }
            });

            // If targetUseCaseId provided, check both ID and name fallback
            if (targetUseCaseId) {
                let desc = descriptions[targetUseCaseId];
                if (!desc) {
                    const useCaseNode = model.diagram?.nodes?.find(n => n.id === targetUseCaseId);
                    if (useCaseNode) {
                        const nodeNameNorm = normalizeName(useCaseNode.data?.label || '');
                        if (nodeNameNorm && descriptionByName.has(nodeNameNorm)) {
                            desc = descriptionByName.get(nodeNameNorm).desc;
                            descriptions[targetUseCaseId] = desc;
                        }
                    }
                }
                if (!desc) {
                    issues.push({
                        id: `description-not-found-${targetUseCaseId}`,
                        code: 'DESCRIPTION_NOT_FOUND',
                        severity: 'error',
                        location: 'description',
                        message: `Use Case Description not found.`,
                        context: { useCaseId: targetUseCaseId }
                    });
                    report.score = 0;
                }
            }

            // Validate each use case by iterating diagram nodes (not descriptions keys)
            const useCaseNodes = model.diagram?.nodes?.filter(n => n.type === 'usecase') || [];
            useCaseNodes.forEach((node) => {
                const useCaseId = node.id;
                if (targetUseCaseId && useCaseId !== targetUseCaseId) return;

                // Try ID lookup, then name fallback
                let description = descriptions[useCaseId];
                if (!description) {
                    const nodeNameNorm = normalizeName(node.data?.label || '');
                    if (nodeNameNorm && descriptionByName.has(nodeNameNorm)) {
                        description = descriptionByName.get(nodeNameNorm).desc;
                        descriptions[useCaseId] = description;
                    }
                }

                if (!description) {
                    if (!targetUseCaseId || useCaseId === targetUseCaseId) {
                        issues.push({
                            id: `description-not-found-${useCaseId}`,
                            code: 'DESCRIPTION_NOT_FOUND',
                            severity: 'error',
                            location: 'description',
                            message: `Use Case Description not found for "${node.data?.label || 'Unnamed'}".`,
                            context: { useCaseId, suggestion: 'Add a description for this use case.' }
                        });
                        report.score -= 30;
                    }
                    return;
                }

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

                    // Cross-verify useCaseName matches diagram label
                    if (description.useCaseName && description.useCaseName.trim()) {
                        const descLabel = normalizeName(description.useCaseName);
                        const diagramNode = model.diagram?.nodes?.find(n => n.id === useCaseId);
                        const diagramLabel = normalizeName(diagramNode?.data?.label || '');
                        if (descLabel !== diagramLabel && descLabel !== 'unnamed' && diagramLabel !== 'unnamed') {
                            issues.push({
                                id: `usecase-name-mismatch-${useCaseId}`,
                                code: 'USE_CASE_NAME_MISMATCH',
                                severity: 'warning',
                                location: 'description',
                                message: `Description name "${description.useCaseName}" does not match diagram name "${diagramNode?.data?.label || ''}".`,
                                context: { useCaseId, suggestion: 'Ensure the use case name in the description matches the diagram.' }
                            });
                            report.score -= 5;
                        }
                    }

                    // Check primary actor
                    const isNotSetActor = !description.primaryActor ||
                        (typeof description.primaryActor === 'string' && (description.primaryActor.trim() === '' || normalizeName(description.primaryActor) === 'not set'));

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
                        const edges = model.diagram?.edges || [];
                        const nodes = model.diagram?.nodes || [];

                        const neighborIds = edges
                            .filter(e => e.source === useCaseId || e.target === useCaseId)
                            .map(e => e.source === useCaseId ? e.target : e.source);

                        const connectedActors = nodes
                            .filter(n => n.type === 'actor' && neighborIds.includes(n.id))
                            .map(n => (n.data?.label || ''));

                        const connectedActorNorm = connectedActors.map(l => normalizeName(l));
                        const selectedActorNorm = normalizeName(description.primaryActor);

                        if (connectedActorNorm.length > 0 && !connectedActorNorm.includes(selectedActorNorm)) {
                            issues.push({
                                id: `invalid-primary-actor-${useCaseId}`,
                                code: 'INVALID_PRIMARY_ACTOR',
                                severity: 'error',
                                location: 'description',
                                message: `Primary Actor "${description.primaryActor}" is not connected to this Use Case in the diagram.`,
                                context: {
                                    useCaseId,
                                    suggestion: `Ensure Primary Actor name matches the one in the Use Case Diagram. (Expected: ${connectedActors.join(' or ')})`
                                }
                            });
                            report.score -= 10;
                        } else if (connectedActorNorm.length === 0 && selectedActorNorm !== '' && selectedActorNorm !== 'not set') {
                            issues.push({
                                id: `invalid-primary-actor-${useCaseId}`,
                                code: 'INVALID_PRIMARY_ACTOR',
                                severity: 'error',
                                location: 'description',
                                message: `Primary Actor "${description.primaryActor}" cannot be validated because no actors are connected to this Use Case in the diagram.`,
                                context: {
                                    useCaseId,
                                    suggestion: 'Connect an Actor to this Use Case in the Use Case Diagram first.'
                                }
                            });
                            report.score -= 10;
                        } else if (selectedActorNorm !== '') {
                            passes.push(`Primary actor defined: ${description.primaryActor}`);
                        }
                    }

                    // Check preconditions — accept string or array
                    let preValue = description.preconditions;
                    if (Array.isArray(preValue)) preValue = preValue.join(' ');
                    const preStr = (typeof preValue === 'string' ? preValue : '').trim();
                    const isNoPre = !preStr || normalizeName(preStr) === 'none';

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
                        const validation = validateSentence(preStr);
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

                    // Check postconditions — accept string or array
                    let postValue = description.postconditions;
                    if (Array.isArray(postValue)) postValue = postValue.join(' ');
                    const postStr = (typeof postValue === 'string' ? postValue : '').trim();
                    const isNoPost = !postStr || normalizeName(postStr) === 'none';

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
                        const validation = validateSentence(postStr);
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
                    const hasMainFlow = description.mainFlow && description.mainFlow.length > 0 && description.mainFlow.some(step => {
                        const text = step.action || (typeof step === 'string' ? step : null);
                        return text && text.trim().length > 0;
                    });

                    if (!hasMainFlow) {
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
                            const stepText = step.action || (typeof step === 'string' ? step : '');
                            if (!stepText || stepText.trim() === '') {
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
                                const validation = validateSentence(stepText);
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
                    severity: 'error',
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
                    message: 'System Sequence Diagram not found.',
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

                // Resolve a human-readable Use Case name for error messages
                const useCaseNode = model.diagram?.nodes?.find(n => n.id === useCaseId);
                const descriptionName = model.descriptions?.[useCaseId]?.useCaseName;
                const ucName = useCaseNode?.data?.label || descriptionName || 'this Use Case';

                // Normalize SSD data structure
                let ssd = rawSsd;
                if (ssd && ssd.semanticData) ssd = ssd.semanticData;
                else if (ssd && ssd.diagramData) {
                    // If only diagram data exists, it might need conversion, 
                    // but for dynamic check we usually have lifelines/messages directly or in semanticData
                    ssd = ssd.diagramData;
                }

                if (!ssd || !ssd.lifelines || ssd.lifelines.length === 0) {
                    issues.push({
                        id: `ssd-not-found-${useCaseId}`,
                        code: 'SSD_NOT_FOUND',
                        severity: 'error',
                        location: 'ssd',
                        message: `System Sequence Diagram for "${ucName}" is not found.`,
                        context: { useCaseId }
                    });
                    report.score = 0;
                    return; // early return so consistency check doesn't run
                } else if (ssd.lifelines.length < 2) {
                    issues.push({
                        id: `incomplete-ssd-${useCaseId}`,
                        code: 'INCOMPLETE_SSD',
                        severity: 'error',
                        location: 'ssd',
                        message: `SSD for "${ucName}" is incomplete — add both an Actor and a System lifeline.`,
                        context: { useCaseId }
                    });
                    report.score = 0;
                } else {
                    passes.push(`SSD has ${ssd.lifelines.length} lifelines`);
                }

                // Check for forbidden Object lifelines in SSD (Step 3 allows Actor & System ONLY)
                const objectLifelines = ssd.lifelines.filter(l => l.type === 'object' || (l.type !== 'actor' && l.type !== 'system'));
                if (objectLifelines.length > 0) {
                    objectLifelines.forEach(obj => {
                        const objName = obj.label || obj.name || 'Object';
                        issues.push({
                            id: `ssd-object-not-allowed-${useCaseId}-${obj.id || objName}`,
                            code: 'SSD_OBJECT_NOT_ALLOWED',
                            severity: 'error',
                            location: 'ssd',
                            message: `Object lifeline "${objName}" is not allowed in the System Sequence Diagram for "${ucName}".`,
                            context: { useCaseId, suggestion: `Remove the "${objName}" Object lifeline from SSD "${ucName}". System Sequence Diagrams (Step 3) can ONLY contain Actor and System lifelines. Internal objects belong in Step 5 (Detailed Sequence Diagram).` }
                        });
                        report.score -= 25;
                    });
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
        } else if (activeSection === 'class-diagram') {
            const classDiagram = model.classDiagram || { nodes: [], edges: [] };
            const nodes = classDiagram.nodes || [];

            if (nodes.length === 0) {
                issues.push({
                    id: 'class-diagram-empty',
                    code: 'CLASS_DIAGRAM_EMPTY',
                    severity: 'error',
                    location: 'class-diagram',
                    message: 'Class Diagram is empty.',
                });
                report.score = 0;
            } else {
                const classes = nodes.filter((n) => n.type === 'class' || n.type === 'interface');
                if (classes.length === 0) {
                    issues.push({
                        id: 'no-classes',
                        code: 'NO_CLASSES',
                        severity: 'error',
                        location: 'class-diagram',
                        message: 'Add at least one class or interface.',
                    });
                    report.score -= 30;
                } else {
                    passes.push(`${classes.length} class(es)/interface(s) found`);
                }
                classes.forEach((cls) => {
                    const label = (cls.data?.label || '').trim();
                    if (!label || ['newclass', 'newinterface'].includes(label.toLowerCase())) {
                        issues.push({
                            id: `class-placeholder-${cls.id}`,
                            code: 'CLASS_NAME_PLACEHOLDER',
                            severity: 'error',
                            location: 'class-diagram',
                            message: 'Rename placeholder class names to domain entities.',
                        });
                        report.score -= 10;
                    }
                });
            }
        } else if (activeSection === 'sequence-diagram') {
            const sequences = model.sequenceDiagrams || {};
            const entries = targetUseCaseId
                ? [[targetUseCaseId, sequences[targetUseCaseId]]]
                : Object.entries(sequences);

            if (entries.length === 0 && !targetUseCaseId) {
                issues.push({
                    id: 'no-sequences',
                    code: 'NO_SEQUENCE_DIAGRAMS',
                    severity: 'error',
                    location: 'sequence-diagram',
                    message: 'No Sequence Diagrams found.',
                });
                report.score -= 20;
            }

            entries.forEach(([ucId, raw]) => {
                const useCaseNode = model.diagram?.nodes?.find(n => n.id === ucId);
                const descriptionName = model.descriptions?.[ucId]?.useCaseName;
                const ucName = useCaseNode?.data?.label || descriptionName || 'this Use Case';

                if (!raw) {
                    issues.push({
                        id: `seq-missing-${ucId}`,
                        code: 'SEQUENCE_DIAGRAM_MISSING',
                        severity: 'error',
                        location: 'sequence-diagram',
                        message: `Sequence Diagram for "${ucName}" is not found.`,
                        context: { useCaseId: ucId },
                    });
                    return;
                }

                let nodes = raw.nodes || [];
                let edges = raw.edges || [];

                if (nodes.length === 0 && (raw.lifelines || raw.semanticData?.lifelines)) {
                    nodes = raw.lifelines || raw.semanticData?.lifelines || [];
                }
                if (edges.length === 0 && (raw.messages || raw.semanticData?.messages)) {
                    edges = raw.messages || raw.semanticData?.messages || [];
                }

                if (nodes.length < 2) {
                    issues.push({
                        id: `seq-incomplete-${ucId}`,
                        code: 'SEQUENCE_INCOMPLETE',
                        severity: 'error',
                        location: 'sequence-diagram',
                        message: `Sequence Diagram for "${ucName}" needs at least two lifelines.`,
                        context: { useCaseId: ucId },
                    });
                    report.score -= 15;
                }
                if (edges.length === 0) {
                    issues.push({
                        id: `seq-no-messages-${ucId}`,
                        code: 'SEQUENCE_NO_MESSAGES',
                        severity: 'error',
                        location: 'sequence-diagram',
                        message: `Sequence Diagram for "${ucName}" has no messages.`,
                        context: { useCaseId: ucId },
                    });
                    report.score -= 15;
                } else {
                    passes.push(`Sequence diagram for "${ucName}" has ${edges.length} message(s)`);
                }

                const desc = model.descriptions?.[ucId];
                if (desc?.mainFlow?.length && edges.length > 0) {
                    const diagramActors = model.diagram?.nodes
                        ?.filter((n) => n.type === 'actor')
                        ?.map((n) => n.data?.label)
                        .filter(Boolean) || [];
                    const seqMessages = edges.map((e, idx) => ({
                        text: e.data?.label || '',
                        order: idx + 1,
                        senderLabel: nodes.find((n) => n.id === e.source)?.data?.label || '',
                        senderType: nodes.find((n) => n.id === e.source)?.data?.isActor ? 'actor' : 'object',
                    }));
                    const consistencyIssues = checkConsistency(
                        desc.mainFlow,
                        seqMessages,
                        diagramActors,
                        desc.primaryActor
                    );
                    consistencyIssues.forEach((issue, idx) => {
                        issues.push({
                            id: `seq-consistent-${ucId}-${idx}`,
                            code: issue.category,
                            severity: issue.severity || issue.type,
                            location: 'sequence-diagram',
                            message: issue.message,
                            context: { useCaseId: ucId, ...issue },
                        });
                    });
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
            return textReport;
        }
        return null;
    };

    const renderReport = () => {
        const issues = report?.issues ?? [];
        const errors = issues.filter(i => i.severity === 'error');
        const warnings = issues.filter(i => i.severity === 'warning');
        const info = issues.filter(i => i.severity === 'info' || i.severity === 'suggestion');

        const suggestions = issues
            .filter(i => i.context?.suggestion || i.severity === 'info' || i.severity === 'error' || i.severity === 'warning')
            .map(i => i.context?.suggestion || i.message)
            .filter((val, idx, arr) => arr.indexOf(val) === idx); // Deduplicate

        const renderSection = (title, issuesList, successMsg) => {
            const sectionErrors = issuesList.filter(i => i.severity === 'error' || i.type === 'error');
            if (sectionErrors.length === 0) return <div className="text-slate-600 mb-1">✓ {successMsg}</div>;
            return sectionErrors.map((i, idx) => (
                <div key={idx} className="text-status-red mb-1 font-bold font-body">✗ {i.message}</div>
            ));
        };

        return (
            <div className="space-y-6 font-mono leading-relaxed">
                <div className="space-y-1">
                    <h3 className="font-extrabold font-heading text-slate-800 uppercase tracking-wider mb-4">
                        CHECKING REPORT
                    </h3>
                </div>

                {activeSection === 'usecase' && (
                    <div className="space-y-1">
                        {(() => {
                            const missingDiagramIssue = issues.find(i => (i.code === 'DIAGRAM_EMPTY' || i.code === 'NO_NODES' || i.code === 'NO_DIAGRAM') && i.severity === 'error');
                            if (missingDiagramIssue) {
                                return (
                                    <>
                                        <div className="text-status-red font-extrabold font-heading mb-2 uppercase tracking-tighter">✗ {missingDiagramIssue.message}</div>
                                        <div className="text-accent leading-tight">! Please add a System Boundary, Actors, and Use Cases to proceed.</div>
                                    </>
                                );
                            }

                            const sysBoundaryIssues = issues.filter(i => i.code === 'SYSTEM_BOUNDARY_MISSING');
                            const sysNameIssues = issues.filter(i => i.code === 'SYSTEM_NAME_MISSING' || i.code === 'SYSTEM_NAME_INVALID' || i.code === 'SYSTEM_NAME_WEAK');
                            const ucIssues = issues.filter(i => i.location === 'diagram' && i.code?.includes('USE_CASE'));
                            const actorIssues = issues.filter(i => i.location === 'diagram' && i.code?.includes('ACTOR'));

                            return (
                                <>
                                    {renderSection('System Boundary', sysBoundaryIssues, 'System Boundary exists')}
                                    {renderSection('System Name', sysNameIssues, 'System has a valid name')}
                                    {renderSection('Use Cases', ucIssues, 'Use Cases properly defined')}
                                    {renderSection('Actors', actorIssues, 'Actors properly defined')}
                                </>
                            );
                        })()}
                    </div>
                )}

                {activeSection === 'description' && (
                    <div className="space-y-1">
                        {(() => {
                            const missingDescIssue = issues.find(i => i.code === 'DESCRIPTION_NOT_FOUND' || i.code === 'NO_DESCRIPTIONS' || i.code === 'NO_USE_CASE_DESCRIPTION');
                            if (missingDescIssue) {
                                return (
                                    <>
                                        <div className="text-status-red font-extrabold font-heading mb-2 uppercase tracking-tighter">✗ {missingDescIssue.message}</div>
                                        <div className="text-accent leading-tight">! Please create a Use Case Description for this Use Case to proceed.</div>
                                    </>
                                );
                            }

                            const hasNoTitle = issues.some(i => i.code === 'NO_TITLE');
                            const hasNoActor = issues.some(i => i.code === 'NO_PRIMARY_ACTOR' || i.code === 'INVALID_PRIMARY_ACTOR');
                            const hasNoPre = issues.some(i => i.code === 'NO_PRECONDITIONS' || i.code === 'INVALID_PRECONDITIONS');
                            const hasNoPost = issues.some(i => i.code === 'NO_POSTCONDITIONS' || i.code === 'INVALID_POSTCONDITIONS');
                            const hasNoFlow = issues.some(i => i.code === 'NO_MAIN_FLOW' || i.code === 'EMPTY_MAIN_FLOW_STEP');

                            return (
                                <>
                                    <div className={`${hasNoTitle ? 'text-status-red font-bold font-body' : 'text-slate-600'} mb-1`}>{hasNoTitle ? '✗' : '✓'} Use Case Name defined</div>
                                    <div className={`${hasNoActor ? 'text-status-red font-bold font-body' : 'text-slate-600'} mb-1`}>{hasNoActor ? '✗' : '✓'} Primary Actor defined</div>
                                    <div className={`${hasNoPre ? 'text-status-red font-bold font-body' : 'text-slate-600'} mb-1`}>{hasNoPre ? '✗' : '✓'} Preconditions defined</div>
                                    <div className={`${hasNoPost ? 'text-status-red font-bold font-body' : 'text-slate-600'} mb-1`}>{hasNoPost ? '✗' : '✓'} Postconditions defined</div>
                                    <div className={`${hasNoFlow ? 'text-status-red font-bold font-body' : 'text-slate-600'} mb-1`}>{hasNoFlow ? '✗' : '✓'} Main Success Scenario defined</div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {activeSection === 'ssd' && (
                    <div className="space-y-1">
                        {(() => {
                            const missingSsdIssue = issues.find(i => (i.code === 'SSD_MISSING' || i.code === 'NO_SSDS' || i.code === 'SSD_NOT_FOUND') && i.severity === 'error');
                            if (missingSsdIssue) {
                                return (
                                    <>
                                        <div className="text-status-red font-extrabold font-heading mb-2 uppercase tracking-tighter">✗ {missingSsdIssue.message}</div>
                                        <div className="text-accent leading-tight">! Please create a System Sequence Diagram to proceed.</div>
                                    </>
                                );
                            }

                            const flowIssuesList = issues.filter(i => i.location === 'ssd' && (i.severity === 'error' || i.type === 'error'));
                            const consistencyIssuesList = issues.filter(i => (i.type === 'consistency' || i.code?.includes('CONSISTENCY')) && i.severity === 'error');

                            return (
                                <>
                                    <div className={`${flowIssuesList.length > 0 ? 'text-status-red font-bold font-body' : 'text-slate-600'} mb-1`}>{flowIssuesList.length > 0 ? '✗' : '✓'} Message Flow properly structured</div>
                                    <div className={`${consistencyIssuesList.length > 0 ? 'text-status-red font-bold font-body' : 'text-slate-600'} mb-1`}>{consistencyIssuesList.length > 0 ? '✗' : '✓'} Model Consistency maintained</div>
                                </>
                            );
                        })()}
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                    <div className="text-status-red font-bold font-body mb-1">X {errors.length} Error(s) found</div>
                    {warnings.length > 0 && <div className="text-amber-600 font-bold font-body mb-1">! {warnings.length} Warning(s) found</div>}
                </div>

                {suggestions.length > 0 && (
                    <div className="pt-4">
                        <h4 className="font-extrabold font-heading text-slate-800 mb-2">Suggestions:</h4>
                        <ul className="space-y-2">
                            {suggestions.map((s, idx) => (
                                <li key={idx} className="flex gap-2 text-slate-600">
                                    <span className="text-indigo-500">•</span>
                                    <span>{s}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    useEffect(() => {
        // Auto-refresh validation when the active editor (activeSection) or model changes (dev mode only)
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
            <div className="bg-white rounded-lg shadow-xl border border-black/10 overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-black/5">
                    <h2 className="text-lg font-bold font-body text-ink mb-2">Checking Mode</h2>
                    <p className="text-sm text-muted mb-4">
                        {onRunChecker ? (isStudent ? 'Your UML model is ready for review.' : 'Run validation checks on your UML model to identify structural issues and inconsistencies.') : 'Review the official feedback and consistency findings provided by your teacher.'}
                    </p>
                    {onRunChecker && !isStudent && (
                        <button
                            onClick={runChecks}
                            disabled={isRunning}
                            className="w-full px-4 py-3 bg-accent text-white rounded-lg font-bold font-body hover:bg-indigo-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                        <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mb-4 text-2xl">🔍</div>
                        <h3 className="text-lg font-semibold text-ink mb-2">
                            {onRunChecker ? 'Ready to Check' : 'No report available yet'}
                        </h3>
                        <p className="text-sm text-muted max-w-xs mx-auto">
                            {onRunChecker ? 'Click "Run Checker" to validate your UML model and see a detailed report.' : 'Once the teacher reviews your assignment, their report will be displayed here.'}
                        </p>
                    </div>
                </div>
                <div className="px-5 py-3 bg-surface-3 border-t border-black/5 text-[10px] text-gray-400 font-bold font-body uppercase tracking-widest flex justify-between">
                    <span>Manual validation mode</span>
                </div>
            </div>
        );
    }

    if (isRunning) {
        return (
            <div className="flex flex-col items-center justify-center h-80 bg-white/50 backdrop-blur-md rounded-lg border border-black/5 shadow-xl">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-accent/10 border-t-indigo-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-xl">🔍</div>
                </div>
                <p className="mt-6 text-sm font-bold font-body text-ink tracking-tight">Analyzing UML Artifacts...</p>
                <p className="mt-1 text-xs text-muted">Checking cross-artifact consistency rules</p>
            </div>
        );
    }

    return (
        <div data-testid="checking-report" className="flex flex-col h-full bg-white overflow-hidden">
            <div className="p-3 border-b border-black/5 flex flex-col gap-3 shrink-0 bg-slate-50/20">
                {/* Header Row: Title & Button */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0 flex-1">
                        <h2 className="text-sm font-extrabold font-heading text-ink truncate">
                            Checking Report
                        </h2>
                        {label && (
                            <span className="text-[8px] text-gray-400 font-extrabold font-heading uppercase tracking-widest truncate mt-0.5">
                                {label}
                            </span>
                        )}
                    </div>

                    {onRunChecker && !isStudent && (
                        <button
                            onClick={runChecks}
                            disabled={isRunning}
                            className="shrink-0 px-2.5 py-1.5 bg-accent hover:bg-indigo-700 text-white rounded-lg font-extrabold font-heading text-[9px] uppercase tracking-widest transition-all shadow-card flex items-center gap-1.5 active:scale-95 disabled:bg-gray-400"
                        >
                            {isRunning ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" />
                                    Running...
                                </>
                            ) : (
                                <>🔍 RUN CHECKER</>
                            )}
                        </button>
                    )}
                </div>

                {/* Stats & Controls Row */}
                <div className="flex items-center justify-between gap-2">
                    {!isStudent && (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-status-red/10 text-status-red rounded border border-red-100 shadow-card">
                                <span className="w-1.5 h-1.5 bg-status-red/100 rounded-full animate-pulse" />
                                <span className="text-[10px] font-extrabold font-heading">{errorsCount} ERRORS</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded border border-yellow-100 shadow-card">
                                <span className="text-[10px] font-extrabold font-heading">{warningsCount} WARNINGS</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center bg-surface-3/80 rounded-lg p-0.5 border border-black/10" title="Adjust text size">
                        <button onClick={handleDecreaseFontSize} className="p-1 text-muted hover:text-accent hover:bg-white rounded transition-all active:scale-90"><Minus size={11} strokeWidth={3} /></button>
                        <span className="text-[10px] font-extrabold font-heading text-muted w-5 text-center select-none">{fontSize}</span>
                        <button onClick={handleIncreaseFontSize} className="p-1 text-muted hover:text-accent hover:bg-white rounded transition-all active:scale-90"><Plus size={11} strokeWidth={3} /></button>
                        <div className="w-px h-3 bg-gray-300 mx-0.5"></div>
                        <button onClick={handleResetFontSize} className="p-1 text-muted hover:text-accent hover:bg-white rounded transition-all active:scale-90" title="Reset font size"><RotateCcw size={9} strokeWidth={3} /></button>
                    </div>
                </div>
            </div>

            {/* The Structured Report Display */}
            <div className="flex-1 p-5 overflow-auto bg-white" style={{ fontSize: `${fontSize}px` }}>
                {renderReport()}
            </div>
        </div>
    );
};

export default CheckingModePanel;