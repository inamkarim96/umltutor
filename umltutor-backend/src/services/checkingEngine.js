"use strict"; Object.defineProperty(exports, "__esModule", { value: true }); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _ssdValidationService = require('./ssdValidationService');

/**
 * Pure service for checking UML Model consistency and quality.
 * No database access.
 */
class CheckingEngine {
    // Lookup tables for better performance
    /**
     * Perform a check of the UML Model (can be global or focused on a section/target)
     */
    static checkModel(model, section = null, targetId = null) {
        const issues = [];

        // Pre-compute diagram analysis 
        const diagramAnalysis = this.analyzeDiagram(model.diagram);

        // 1. Diagram Validation (Step 1)
        if (!section || section === 'diagram' || section === 'usecase') {
            this.validateDiagram(model.diagram, issues, diagramAnalysis);
        }

        // 2. Description Validation (Step 2)
        if (!section || section === 'description') {
            this.validateDescriptions(model.descriptions, issues, diagramAnalysis, targetId);
        }

        // 3. SSD Validation (Step 3)
        if (!section || section === 'ssd') {
            this.validateSSDs(model.ssds, issues, diagramAnalysis, model.descriptions, targetId);
        }

        // 4. Global Mapping Consistency (Step 3 vs Step 2)
        // This is the "Inspection Step" to ensure 3.1 maps to 2.1, etc.
        this.validateGlobalMapping(model, issues, diagramAnalysis);

        // Calculate summary efficiently
        const summary = this.countIssues(issues);

        return {
            summary,
            issues
        };
    }

    /**
     * Pre-compute diagram analysis to avoid repeated calculations
     */
    static analyzeDiagram(diagram) {
        if (!diagram || !diagram.nodes) {
            return {
                nodes: [],
                actors: [],
                useCases: [],
                actorLabels: new Map(),
                useCaseLabels: new Map(),
                edges: diagram.edges || []
            };
        }

        const nodes = diagram.nodes;
        const actors = nodes.filter((n) => n.type === 'actor');
        const useCases = nodes.filter((n) => n.type === 'usecase' || n.type === 'useCase');

        // Pre-extract labels to avoid repeated optional chaining
        const actorLabels = new Map();
        const useCaseLabels = new Map();

        actors.forEach(actor => {
            const label = _optionalChain([actor, 'access', _ => _.data, 'optionalAccess', _2 => _2.label]);
            if (label) actorLabels.set(actor.id, label);
        });

        useCases.forEach(useCase => {
            const label = _optionalChain([useCase, 'access', _ => _.data, 'optionalAccess', _2 => _2.label]);
            if (label) useCaseLabels.set(useCase.id, label);
        });

        return {
            nodes,
            actors,
            useCases,
            actorLabels,
            useCaseLabels,
            edges: diagram.edges || []
        };
    }

    /**
     * Count issues efficiently with single pass
     */
    static countIssues(issues) {
        return issues.reduce((counts, issue) => {
            counts[issue.severity] = (counts[issue.severity] || 0) + 1;
            counts.total++;
            return counts;
        }, { total: 0, error: 0, warning: 0, info: 0 });
    }

    /**
     * Get node label efficiently from pre-computed labels
     */
    static getNodeLabel(nodeId, labels, fallback = 'Unnamed') {
        return labels.get(nodeId) || fallback;
    }

    /**
     * Classify a "System" description step into:
     *   'self'     → internal operation (self-loop on System lifeline)
     *   'external' → output/response to Actor (normal System → Actor arrow)
     *   'actor'    → actor-initiated (not a System step at all)
     *
     * Rules:
     *   INTERNAL verbs (self-loop): calculate, process, validate, check, compute, verify,
     *                               update, store, save, record, log, retrieve, fetch, look, find
     *   EXTERNAL verbs (output):    display, show, confirm, generate, return, notify, send,
     *                               present, provide, redirect, output, emit, render, respond
     */
    static classifySystemStep(stepText) {
        const s = (stepText || '').trim().toLowerCase();

        // Only classify sentences that start with "system"
        if (!s.startsWith('system')) return 'actor';

        // Remove leading "System" then split into words
        const rest = s.replace(/^system\s+/, '');
        const words = rest.split(/\s+/);

        // The first meaningful word is typically the verb
        const verb = words[0] || '';

        const INTERNAL_VERBS = new Set([
            'calculate', 'calculates', 'process', 'processes', 'validate', 'validates',
            'check', 'checks', 'compute', 'computes', 'verify', 'verifies',
            'update', 'updates', 'store', 'stores', 'save', 'saves',
            'record', 'records', 'log', 'logs', 'retrieve', 'retrieves',
            'fetch', 'fetches', 'look', 'looks', 'find', 'finds',
            'search', 'searches', 'load', 'loads', 'compare', 'compares',
            'sort', 'sorts', 'filter', 'filters', 'encrypt', 'encrypts',
            'decrypt', 'decrypts', 'hash', 'hashes', 'resolve', 'resolves',
            'create', 'creates', 'set', 'sets', 'read', 'reads',
        ]);

        const EXTERNAL_VERBS = new Set([
            'display', 'displays', 'show', 'shows', 'confirm', 'confirms',
            'generate', 'generates', 'return', 'returns', 'notify', 'notifies',
            'send', 'sends', 'present', 'presents', 'provide', 'provides',
            'redirect', 'redirects', 'output', 'outputs', 'emit', 'emits',
            'render', 'renders', 'respond', 'responds', 'report', 'reports',
            'give', 'gives', 'reply', 'replies', 'inform', 'informs',
            'print', 'prints', 'broadcast', 'broadcasts',
        ]);

        if (INTERNAL_VERBS.has(verb)) return 'self';
        if (EXTERNAL_VERBS.has(verb)) return 'external';

        // Secondary scan of full sentence if first word didn't match
        for (const w of words) {
            if (INTERNAL_VERBS.has(w)) return 'self';
            if (EXTERNAL_VERBS.has(w)) return 'external';
        }

        // Default: treat as external (System → Actor response)
        return 'external';
    }

    /**
     * Nearest Message / Function Suggestion Engine
     *
     * Given a raw scenario sentence, produces smart naming suggestions:
     *   nearestMessage        → verb + key content words (e.g. "calculate total price")
     *   nearestFunction       → camelCase function name (e.g. "calculateTotalPrice")
     *   nearestFunctionWithParam → function + last noun as param (e.g. "calculateTotalPrice(order)")
     *
     * This is purely informational – no validation, no errors.
     */
    static suggestFromSentence(sentence) {
        const STOP_WORDS = new Set([
            'the', 'of', 'a', 'an', 'is', 'to', 'for', 'and', 'with', 'by',
            'in', 'on', 'at', 'as', 'be', 'this', 'that', 'its', 'it',
            'from', 'or', 'into', 'their', 'has', 'have', 'was', 'are',
            'will', 'should', 'can', 'then', 'after', 'before', 'when', 'if',
        ]);

        // Strip the leading actor/system identifier (first word) and lowercase everything
        const raw = (sentence || '').replace(/\./g, '').trim();
        const words = raw.split(/\s+/).filter(w => w.length > 0);

        // Remove subject (first word: System / Actor name)
        const contentWords = words.slice(1);

        // Strip stop words and non-alpha characters
        const meaningful = contentWords
            .map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
            .filter(w => w.length > 1 && !STOP_WORDS.has(w));

        // Fallback if nothing meaningful extracted
        if (meaningful.length === 0) {
            const fallback = raw.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim() || 'newMessage';
            return {
                nearestMessage: fallback,
                nearestFunction: fallback.replace(/\s+(\w)/g, (_, c) => c.toUpperCase()),
                nearestFunctionWithParam: fallback.replace(/\s+(\w)/g, (_, c) => c.toUpperCase()) + '()'
            };
        }

        // First meaningful word is the verb
        const verb = meaningful[0];
        // Remaining words are object / context
        const objectWords = meaningful.slice(1);

        // Nearest Message: verb + object words as a phrase
        const nearestMessage = [verb, ...objectWords].join(' ');

        // Nearest Function: camelCase
        const camelParts = [verb, ...objectWords];
        const nearestFunction = camelParts
            .map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
            .join('');

        // Parameter: last noun in objectWords (simple heuristic: last word)
        const param = objectWords.length > 0 ? objectWords[objectWords.length - 1] : '';
        const nearestFunctionWithParam = param
            ? `${nearestFunction}(${param})`
            : `${nearestFunction}()`;

        return { nearestMessage, nearestFunction, nearestFunctionWithParam };
    }

    static validateDiagram(diagram, issues, analysis) {
        if (!analysis.nodes.length) {
            issues.push({ type: 'diagram', severity: 'error', location: 'diagram', code: 'DIAGRAM_EMPTY', message: 'Diagram is missing nodes.' });
            return;
        }

        const { actors, useCases, edges, useCaseLabels, actorLabels, nodes } = analysis;

        // ── System Boundary Validation ──
        const systemBoundary = nodes.find((n) => n.type === 'systemBoundary');
        if (!systemBoundary) {
            issues.push({
                type: 'diagram', severity: 'error', location: 'diagram',
                code: 'SYSTEM_BOUNDARY_MISSING',
                message: 'System boundary is missing.',
                context: { suggestion: 'Add a System Boundary to your diagram. It represents the scope of the system.' }
            });
        } else {
            const sysLabel = (_optionalChain([systemBoundary, 'access', _sb => _sb.data, 'optionalAccess', _sb2 => _sb2.label]) || '').trim();
            const sysLabelLower = sysLabel.toLowerCase();
            const invalidNames = ['', 'system', 'sys', 'name', 'untitled',
                'double click to name system', 'double click to name',
                'click to name', 'enter name', 'new system'];

            if (!sysLabel || invalidNames.includes(sysLabelLower)) {
                issues.push({
                    type: 'diagram', severity: 'error', location: 'diagram',
                    code: 'SYSTEM_NAME_INVALID',
                    message: !sysLabel
                        ? 'System name is missing.'
                        : `System name "${sysLabel}" is not valid. A single generic word like "System" is not a proper system name.`,
                    context: { suggestion: 'Please provide a valid system name that describes the system (e.g., "Online Shopping System", "Library Management System", "Student Portal").' }
                });
            } else if (sysLabel.split(/\s+/).length < 2) {
                issues.push({
                    type: 'diagram', severity: 'warning', location: 'diagram',
                    code: 'SYSTEM_NAME_INVALID',
                    message: `System name "${sysLabel}" is too short. A descriptive system name should contain at least two words.`,
                    context: { suggestion: 'Please provide a more descriptive system name (e.g., "Online Shopping System", "Banking Application").' }
                });
            }
        }

        // ── Actor Validation ──
        if (actors.length === 0) {
            issues.push({
                type: 'diagram', severity: 'error', location: 'diagram',
                code: 'NO_ACTORS',
                message: 'No Actors defined.',
                context: { suggestion: 'Add at least one Actor to the diagram. Actors represent external users or systems that interact with your system (e.g., "Student", "Admin").' }
            });
        }

        actors.forEach((actor) => {
            const label = actorLabels.get(actor.id);
            if (!label || label.trim() === '') {
                issues.push({
                    type: 'diagram', severity: 'error', location: 'diagram',
                    code: 'ACTOR_NO_NAME',
                    message: 'Actor has no name.',
                    relatedId: actor.id,
                    context: { actorId: actor.id, suggestion: 'Please provide a name for this Actor. Actors represent external entities (e.g., "Student", "Teacher", "Admin").' }
                });
            } else {
                const nameLower = label.toLowerCase().trim();
                if (nameLower === 'system' || nameLower.includes('system')) {
                    issues.push({
                        type: 'diagram', severity: 'error', location: 'diagram',
                        code: 'ACTOR_INVALID_NAME',
                        message: `Invalid Actor Name: "${label}". Actor name cannot be "System".`,
                        relatedId: actor.id,
                        context: { actorId: actor.id, suggestion: 'Actors represent external entities that interact with the system. Use human-readable names like "Student", "Teacher", "Customer". An actor cannot be named "System".' }
                    });
                }
            }

            // Check connections
            const hasEdge = edges.some((e) => e.source === actor.id || e.target === actor.id);
            if (!hasEdge) {
                issues.push({
                    type: 'diagram', severity: 'error', location: 'diagram',
                    code: 'ACTOR_NOT_CONNECTED',
                    message: `Actor "${label || 'Unnamed'}" is not connected to any Use Case.`,
                    relatedId: actor.id,
                    context: { actorId: actor.id, suggestion: 'Draw an association line from this Actor to at least one Use Case.' }
                });
            }
        });

        // ── Use Case Validation ──
        if (useCases.length === 0) {
            issues.push({
                type: 'diagram', severity: 'error', location: 'diagram',
                code: 'NO_USE_CASES',
                message: 'No Use Cases defined inside system.',
                context: { suggestion: 'Add at least one Use Case inside the system boundary. Use Cases describe what the system does for its actors.' }
            });
        }

        // Verb dictionary for Use Case name validation
        const VERB_DICTIONARY = [
            'create', 'add', 'update', 'delete', 'register', 'login', 'logout',
            'view', 'search', 'generate', 'submit', 'process', 'send', 'receive',
            'manage', 'book', 'place', 'track', 'upload', 'download', 'approve',
            'reject', 'withdraw', 'purchase', 'make'
        ];

        useCases.forEach((uc) => {
            const label = useCaseLabels.get(uc.id);

            if (!label || label.trim() === '') {
                issues.push({
                    type: 'diagram', severity: 'error', location: 'diagram',
                    code: 'USE_CASE_NO_NAME',
                    message: 'Use Case has no name.',
                    relatedId: uc.id,
                    context: { useCaseId: uc.id, suggestion: 'Please provide a name for this Use Case. Use Case names must follow the format: Verb + Noun (e.g., "Submit Order", "View Profile", "Register Account").' }
                });
            } else {
                // Grammar validation: must be at least 2 words, first word must be a verb
                const words = label.trim().split(/\s+/);
                if (words.length < 2) {
                    issues.push({
                        type: 'diagram', severity: 'error', location: 'diagram',
                        code: 'USE_CASE_INVALID_NAME',
                        message: `Invalid Use Case Name: "${label}". Use case name must contain a verb followed by an object.`,
                        relatedId: uc.id,
                        context: { useCaseId: uc.id, suggestion: 'Use Case names must follow the format: Verb + Noun (e.g., "Submit Order", "View Profile", "Register Account"). Start with a verb from the dictionary.' }
                    });
                } else {
                    const firstWord = words[0].toLowerCase();
                    if (!VERB_DICTIONARY.includes(firstWord)) {
                        issues.push({
                            type: 'diagram', severity: 'error', location: 'diagram',
                            code: 'USE_CASE_INVALID_NAME',
                            message: `Invalid Use Case Name: "${label}". Use case name must start with a verb.`,
                            relatedId: uc.id,
                            context: { useCaseId: uc.id, suggestion: 'Use Case names must follow the format: Verb + Noun (e.g., "Submit Order", "View Profile", "Register Account"). Start with a verb from the dictionary.' }
                        });
                    }
                }
            }

            // Check if inside system boundary
            if (systemBoundary && uc.parentNode !== systemBoundary.id) {
                issues.push({
                    type: 'diagram', severity: 'error', location: 'diagram',
                    code: 'USE_CASE_OUTSIDE_BOUNDARY',
                    message: `Use Case "${label || 'Unnamed'}" is outside system boundary.`,
                    relatedId: uc.id,
                    context: { useCaseId: uc.id, suggestion: 'Drag this Use Case inside the system boundary rectangle. All Use Cases must be placed inside the system.' }
                });
            }

            // Check connections
            const hasEdge = edges.some((e) => e.source === uc.id || e.target === uc.id);
            if (!hasEdge) {
                issues.push({
                    type: 'diagram', severity: 'warning', location: 'diagram',
                    code: 'USE_CASE_NOT_CONNECTED',
                    message: `Use Case "${label || 'Unnamed'}" is not connected to any Actor.`,
                    relatedId: uc.id,
                    context: { useCaseId: uc.id, suggestion: 'Draw an association line from an Actor to this Use Case. Every Use Case must be connected to at least one Actor.' }
                });
            }
        });
    }

    static validateDescriptions(descriptions, issues, analysis, targetId = null) {
        if (!descriptions) return;

        const { useCases, actorLabels, useCaseLabels } = analysis;

        useCases.forEach((node) => {
            // If targetId is provided, skip all other use cases
            if (targetId && node.id !== targetId) return;

            const desc = descriptions[node.id];
            const nodeLabel = this.getNodeLabel(node.id, useCaseLabels);

            if (!desc) {
                // Only report missing description if we are NOT targeting a specific one
                // OR if we ARE targeting this specific one and it's missing
                if (!targetId || node.id === targetId) {
                    issues.push({
                        type: 'description',
                        severity: 'warning',
                        code: 'NO_USE_CASE_DESCRIPTION',
                        message: `Use Case "${nodeLabel}" is missing a description.`,
                        relatedId: node.id,
                        location: 'description'
                    });
                }
                return;
            }

            // 1. Check primary actor
            const isNotSetActor = !desc.primaryActor ||
                desc.primaryActor.trim() === '' ||
                desc.primaryActor.toLowerCase() === 'not set';

            if (isNotSetActor) {
                issues.push({
                    type: 'description',
                    severity: 'error',
                    code: 'NO_PRIMARY_ACTOR',
                    message: `Primary actor not set in description for "${nodeLabel}", please set it.`,
                    relatedId: node.id,
                    location: 'description',
                    context: { suggestion: 'Please set up Primary Actor' }
                });
            } else if (!actorLabels.has(desc.primaryActor)) {
                issues.push({
                    type: 'consistency',
                    severity: 'error',
                    code: 'INVALID_PRIMARY_ACTOR',
                    message: `Primary Actor "${desc.primaryActor}" in description for "${nodeLabel}" does not exist in the use case diagram.`,
                    relatedId: node.id,
                    path: 'primaryActor',
                    location: 'description'
                });
            }

            // 2. Check preconditions
            const isNoPre = !desc.preconditions ||
                desc.preconditions.trim() === '' ||
                desc.preconditions.toLowerCase() === 'none';

            if (isNoPre) {
                issues.push({
                    type: 'description',
                    severity: 'error',
                    code: 'NO_PRECONDITIONS',
                    message: `Precondition missing in description for "${nodeLabel}", please define it.`,
                    relatedId: node.id,
                    location: 'description',
                    context: { suggestion: 'Please write Precondition' }
                });
            }

            // 3. Check postconditions
            const isNoPost = !desc.postconditions ||
                desc.postconditions.trim() === '' ||
                desc.postconditions.toLowerCase() === 'none';

            if (isNoPost) {
                issues.push({
                    type: 'description',
                    severity: 'error',
                    code: 'NO_POSTCONDITIONS',
                    message: `Postcondition missing in description for "${nodeLabel}", please define it.`,
                    relatedId: node.id,
                    location: 'description',
                    context: { suggestion: 'Please write Postcondition' }
                });
            }

            // 4. Check main flow exists
            if (!desc.mainFlow || desc.mainFlow.length === 0 || (desc.mainFlow.length === 1 && !desc.mainFlow[0].action)) {
                issues.push({
                    type: 'description',
                    severity: 'warning',
                    code: 'NO_MAIN_FLOW',
                    message: `Description for "${nodeLabel}" has no main flow steps.`,
                    relatedId: node.id,
                    location: 'description'
                });
            }
        });
    }

    static validateSSDs(ssds, issues, analysis, descriptions, targetId = null) {
        if (!ssds) return;

        const { useCases, actorLabels, useCaseLabels } = analysis;

        Object.keys(ssds).forEach(nodeId => {
            // If targetId is provided, skip all other SSDs
            if (targetId && nodeId !== targetId) return;

            const ssdRawData = ssds[nodeId];
            const ucName = this.getNodeLabel(nodeId, useCaseLabels, nodeId);

            if (!ssdRawData) return;

            // CRITICAL FIX: SSD data might be raw React Flow diagram data
            // We must convert it to semantic lifelines/messages before validating
            const { semanticData } = this.processSSDData(ssdRawData);

            if (!semanticData || !semanticData.lifelines?.length) {
                issues.push({
                    type: 'ssd',
                    severity: 'warning',
                    code: 'NO_SSDS',
                    message: `SSD for "${ucName}" is missing lifelines.`,
                    relatedId: nodeId,
                    location: 'ssd'
                });
                return;
            }

            // Use the centralized SSD validation on the SEMANTIC data
            const semanticResult = this.validateSSDSemantics(semanticData);
            if (!semanticResult.isValid) {
                semanticResult.errors.forEach(err => {
                    // Map common SSD semantic errors to codes for the frontend
                    let code = 'SSD_SEMANTIC_ERROR';
                    if (err.includes('Actor participant is required')) code = 'SSD_ACTOR_MISSING';
                    if (err.includes('System participant is typically required')) code = 'SSD_SYSTEM_MISSING';

                    issues.push({
                        type: 'ssd',
                        severity: 'error',
                        code,
                        message: `SSD "${ucName}": ${err}`,
                        relatedId: nodeId,
                        location: 'ssd'
                    });
                });
            }

            const desc = (descriptions || {})[nodeId];
            if (desc && semanticData.messages) {
                // Perform deep consistency check between SSD and Main Scenario
                this.validateSSDInteractionFlow(semanticData, desc, nodeId, ucName, issues, analysis);
            }

            // Improvement suggestion: ensure all use cases have both description and SSD
            if (!desc && !targetId) {
                issues.push({
                    type: 'consistency',
                    severity: 'info',
                    code: 'MISSING_DESCRIPTION_LINK',
                    message: `Suggestion: Add a description for use case "${ucName}" to maintain consistency across the model.`,
                    relatedId: nodeId,
                    location: 'ssd'
                });
            }
        });
    }

    /**
     * Advanced Consistency: Strictly checks if SSD messages match the Main Success Scenario steps
     */
    static validateSSDInteractionFlow(ssd, desc, ucId, ucName, issues, analysis) {
        const messages = [...(ssd.messages || [])].sort((a, b) => a.order - b.order);
        const steps = desc.mainFlow || [];
        const lifelines = ssd.lifelines || [];

        // Find the numeric index based on the diagram order (Top-to-Bottom, Left-to-Right)
        // This should match the frontend's section numbering (3.x vs 2.x)
        const sortedUCs = [...(analysis.useCases || [])].sort((a, b) => {
            const posA = a.position || { x: 0, y: 0 };
            const posB = b.position || { x: 0, y: 0 };
            return (posA.y - posB.y) || (posA.x - posB.x);
        });

        const ucIndex = sortedUCs.findIndex(uc => uc.id === ucId);
        const displayNum = ucIndex !== -1 ? (ucIndex + 1) : (ucId.split('-').pop());
        const mappingRef = `Description 2.${displayNum}`;

        // Check 1: Primary Actor Consistency
        if (messages.length > 0) {
            const firstMsg = messages.find(m => !m.isReturn);
            if (firstMsg) {
                const sender = lifelines.find(l => l.id === firstMsg.fromLifelineId);
                if (sender && sender.type === 'actor' && desc.primaryActor && sender.label !== desc.primaryActor) {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'SSD_CONSISTENCY_ACTOR_MISMATCH',
                        message: `SSD 3.${displayNum} Consistency error: Started with Actor "${sender.label}", but mapped ${mappingRef} defines "${desc.primaryActor}".`,
                        relatedId: ucId,
                        location: 'ssd'
                    });
                }
            }
        }

        // Check 2: Strict Interaction mapping (Fuzzy Match & Ordered)
        const matchedMessages = new Set();
        let expectedMessageIdx = 0; // track sequence order

        steps.forEach((step, stepIdx) => {
            const stepNo = stepIdx + 1;
            const stepTextOrig = step.action || '';
            const stepText = stepTextOrig.toLowerCase();

            if (!stepText || stepText.startsWith('if') || stepText.startsWith('else')) return;

            const stepTextNoSpaces = stepText.replace(/[^a-z0-9]/g, '');

            // Look for matching message
            let matchedMsgIdx = -1;

            for (let offset = 0; offset < messages.length; offset++) {
                let i = (expectedMessageIdx + offset) % messages.length;
                if (matchedMessages.has(i)) continue;

                const msg = messages[i];
                const msgOrig = (msg.name || '').trim();
                const msgNorm = msgOrig.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!msgNorm) continue;

                let isMatch = false;

                if (stepTextNoSpaces.includes(msgNorm) || msgNorm.includes(stepTextNoSpaces)) {
                    isMatch = true;
                } else {
                    const verbs = ['add', 'new', 'buy', 'pay', 'log', 'get', 'set', 'put'];
                    for (let v of verbs) {
                        if (msgNorm.startsWith(v) && stepTextNoSpaces.includes(v)) {
                            isMatch = true; break;
                        }
                    }
                    if (!isMatch) {
                        for (let c = 0; c <= msgNorm.length - 4; c++) {
                            const sub = msgNorm.substr(c, 4);
                            if (stepTextNoSpaces.includes(sub)) {
                                isMatch = true;
                                break;
                            }
                        }
                    }
                }

                if (isMatch) {
                    console.log(`Step ${stepNo} ("${stepTextNoSpaces}") MATCHED msg ${i} ("${msgNorm}")`);
                    matchedMsgIdx = i;
                    break;
                }
            }

            if (matchedMsgIdx !== -1) {
                console.log(`Step ${stepNo} matched message ${matchedMsgIdx} (expected: >= ${expectedMessageIdx})`);
                matchedMessages.add(matchedMsgIdx);
                const msg = messages[matchedMsgIdx];
                const msgOrig = (msg.name || '').trim();
                const msgWords = msgOrig.toLowerCase().split(' ').filter(w => w.length > 3);

                if (matchedMsgIdx < expectedMessageIdx) {
                    issues.push({
                        type: 'consistency',
                        severity: 'error',
                        code: 'SSD_CONSISTENCY_ORDER_MISMATCH',
                        message: 'Message Sequence Mismatch',
                        relatedId: ucId,
                        location: 'ssd',
                        context: {
                            stepNumber: `${stepNo}`,
                            problem: `Message ${msg.order} ("${msgOrig}") appears out of order compared to the mapped steps.`,
                            suggestion: `Move message "${msgOrig}" to match Step ${stepNo} order.`
                        }
                    });
                }
                expectedMessageIdx = Math.max(expectedMessageIdx, matchedMsgIdx + 1);

                const sender = lifelines.find(l => l.id === msg.fromLifelineId);
                const receiver = lifelines.find(l => l.id === msg.toLifelineId);

                // Validate source
                const isActorStep = stepText.includes('actor') || stepText.includes('user') || (desc.primaryActor && stepText.includes(desc.primaryActor.toLowerCase()));
                const isSystemStep = stepText.startsWith('system');

                // ── CLASSIFY SYSTEM STEP ────────────────────────────────────────
                // Determine whether this is an Internal Operation (self-loop)
                // or an External Response (System → Actor arrow)
                const systemClass = isSystemStep ? this.classifySystemStep(stepTextOrig) : null;
                const expectSelfLoop = systemClass === 'self';       // e.g. "System calculates ..."
                const expectExternal = systemClass === 'external';   // e.g. "System displays ..."
                // ────────────────────────────────────────────────────────────────

                if (isSystemStep && !isActorStep && sender && sender.type === 'actor') {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'SSD_CONSISTENCY_SOURCE_MISMATCH',
                        message: 'Source Lifeline Mismatch',
                        relatedId: ucId,
                        location: 'ssd',
                        context: {
                            stepNumber: `${stepNo}`,
                            problem: `Step ${stepNo} describes System action in mapped ${mappingRef}, but Message ${msg.order} ("${msgOrig}") originates from Actor.`,
                            suggestion: `Change source lifeline of "${msgOrig}" to System.`
                        }
                    });
                }

                // ── SELF-LOOP VALIDATION ─────────────────────────────────────
                if (expectSelfLoop && sender && receiver) {
                    const isSelfLoop = msg.type === 'self' || sender.id === receiver.id;
                    if (!isSelfLoop) {
                        issues.push({
                            type: 'consistency',
                            severity: 'warning',
                            code: 'SSD_CONSISTENCY_SHOULD_BE_SELF_LOOP',
                            message: 'Expected Self-loop Message',
                            relatedId: ucId,
                            location: 'ssd',
                            context: {
                                stepNumber: `${stepNo}`,
                                problem: `Step ${stepNo} ("${stepTextOrig.substring(0, 60)}") is an internal System operation. Message ${msg.order} ("${msgOrig}") should be a self-loop on the System lifeline.`,
                                suggestion: `Convert "${msgOrig}" to a self-loop message (sender = System, receiver = System).`
                            }
                        });
                    }
                }

                // ── EXTERNAL RESPONSE VALIDATION ─────────────────────────────
                if (expectExternal && sender && receiver) {
                    const isSelfLoop = msg.type === 'self' || sender.id === receiver.id;
                    if (isSelfLoop) {
                        issues.push({
                            type: 'consistency',
                            severity: 'warning',
                            code: 'SSD_CONSISTENCY_SHOULD_BE_EXTERNAL',
                            message: 'Expected System → Actor Message',
                            relatedId: ucId,
                            location: 'ssd',
                            context: {
                                stepNumber: `${stepNo}`,
                                problem: `Step ${stepNo} ("${stepTextOrig.substring(0, 60)}") is an output/response from System. Message ${msg.order} ("${msgOrig}") should target the Actor, not be a self-loop.`,
                                suggestion: `Change "${msgOrig}" to a normal System → Actor arrow.`
                            }
                        });
                    } else if (receiver.type !== 'actor') {
                        issues.push({
                            type: 'consistency',
                            severity: 'warning',
                            code: 'SSD_CONSISTENCY_EXTERNAL_TARGET',
                            message: 'Response Should Target Actor',
                            relatedId: ucId,
                            location: 'ssd',
                            context: {
                                stepNumber: `${stepNo}`,
                                problem: `Step ${stepNo} ("${stepTextOrig.substring(0, 60)}") is a System response. Message ${msg.order} ("${msgOrig}") should target "${desc.primaryActor || 'Actor'}" but currently targets "${receiver.label}".`,
                                suggestion: `Change the target of "${msgOrig}" to the Actor lifeline.`
                            }
                        });
                    }
                }

                // Generic target check – skip for classified messages (handled above)
                if (!expectSelfLoop && !expectExternal && receiver && receiver.type !== 'system' && !msg.isReturn) {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'SSD_CONSISTENCY_TARGET_MISMATCH',
                        message: 'Target Lifeline Mismatch',
                        relatedId: ucId,
                        location: 'ssd',
                        context: {
                            stepNumber: `${stepNo}`,
                            problem: `Message ${msg.order} ("${msgOrig}") targets a non-system lifeline "${receiver.label}".`,
                            suggestion: `Change target lifeline to System.`
                        }
                    });
                }

                // Validate message type (call vs return)
                if (isSystemStep && !msg.isReturn && sender?.type === 'actor') {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'SSD_CONSISTENCY_TYPE_MISMATCH',
                        message: 'Message Type Mismatch',
                        relatedId: ucId,
                        location: 'ssd',
                        context: {
                            stepNumber: `${stepNo}`,
                            problem: `Step ${stepNo} implies a Return/Response, but Message ${msg.order} ("${msgOrig}") is a Call.`,
                            suggestion: `Convert this to a return message.`
                        }
                    });
                }

                // Validate naming — also surface smart suggestions for how to name the message
                if (msgWords.length < 1) {
                    const sg = this.suggestFromSentence(stepTextOrig);
                    issues.push({
                        type: 'consistency',
                        severity: 'info',
                        code: 'SSD_CONSISTENCY_NAME_GUIDANCE',
                        message: 'Message Name Guidance',
                        relatedId: ucId,
                        location: 'ssd',
                        context: {
                            stepNumber: `${stepNo}`,
                            problem: `Message ${msg.order} ("${msgOrig}") lacks actionable verbs or description.`,
                            suggestion: `Rename to clearly describe the action.`,
                            suggestions: {
                                nearestMessage: sg.nearestMessage,
                                nearestFunction: sg.nearestFunction,
                                nearestFunctionWithParam: sg.nearestFunctionWithParam,
                            }
                        }
                    });
                }

            } else {
                // Not found — generate smart naming suggestions from the step sentence
                const sg = this.suggestFromSentence(stepTextOrig);

                issues.push({
                    type: 'consistency',
                    severity: 'error',
                    code: 'SSD_CONSISTENCY_MISSING_MESSAGE',
                    message: `Missing SSD Message`,
                    relatedId: ucId,
                    location: 'ssd',
                    context: {
                        stepNumber: `${stepNo}`,
                        problem: `Step ${stepNo} ("${stepTextOrig.substring(0, 50)}...") has no mapped message in SSD.`,
                        suggestion: `Add a message named "${sg.nearestFunction}" in SSD 3.${displayNum}.`,
                        suggestions: {
                            nearestMessage: sg.nearestMessage,
                            nearestFunction: sg.nearestFunction,
                            nearestFunctionWithParam: sg.nearestFunctionWithParam,
                        }
                    }
                });
            }
        });

        // Extra SSD Messages
        messages.forEach((msg, msgIdx) => {
            if (!matchedMessages.has(msgIdx)) {
                const msgOrig = (msg.name || '').trim();
                if (!msgOrig) return;

                issues.push({
                    type: 'consistency',
                    severity: 'error',
                    code: 'SSD_CONSISTENCY_EXTRA_MESSAGE',
                    message: `Extra SSD Message`,
                    relatedId: ucId,
                    location: 'ssd',
                    context: {
                        stepNumber: `?`,
                        problem: `Message ${msg.order} ("${msgOrig}") is not mapped to any step in the Main Success Scenario.`,
                        suggestion: `Delete message "${msgOrig}".`
                    }
                });
            }
        });
    }

    /**
     * Inspect global mapping consistency between Step 2 and Step 3
     */
    static validateGlobalMapping(model, issues, analysis) {
        const descriptions = model.descriptions || {};
        const ssds = model.ssds || {};

        // Sort use cases visually to match frontend display order (1, 2, 3...)
        const sortedUCs = [...(analysis.useCases || [])].sort((a, b) => {
            const posA = a.position || { x: 0, y: 0 };
            const posB = b.position || { x: 0, y: 0 };
            return (posA.y - posB.y) || (posA.x - posB.x);
        });

        // Filter use cases to those that actually have data
        const descKeys = Object.keys(descriptions);
        const ssdKeys = Object.keys(ssds);

        if (descKeys.length === 0 && ssdKeys.length === 0) return;

        // Check each index in the sorted list
        sortedUCs.forEach((uc, index) => {
            const hasDesc = !!descriptions[uc.id];
            const hasSSD = !!ssds[uc.id];
            const num = index + 1;

            if (hasSSD && !hasDesc) {
                issues.push({
                    type: 'consistency',
                    severity: 'warning',
                    code: 'MAPPING_MISMATCH',
                    message: `Mapping Error: SSD 3.${num} is modeling "${uc.data?.label || 'UC'}", but its corresponding Description (2.${num}) is missing.`,
                    relatedId: uc.id,
                    location: 'ssd'
                });
            } else if (hasDesc && !hasSSD) {
                issues.push({
                    type: 'consistency',
                    severity: 'info',
                    code: 'MAPPING_INCOMPLETE',
                    message: `Step 2.${num} description exists, but Step 3.${num} System Sequence Diagram has not been started yet.`,
                    relatedId: uc.id,
                    location: 'ssd'
                });
            }
        });

        // Ensure overall counts match
        if (descKeys.length !== ssdKeys.length && ssdKeys.length > 0) {
            const firstUC = sortedUCs.find(uc => (!!descriptions[uc.id] !== !!ssds[uc.id]));
            issues.push({
                type: 'consistency',
                severity: 'info',
                message: `Notice: Model contains ${descKeys.length} descriptions and ${ssdKeys.length} SSDs. Ensure each use case has both for full consistency.`,
                relatedId: firstUC?.id,
                location: 'ssd'
            });
        }
    }

    /**
     * Convert legacy React Flow diagram data to semantic SSD model
     * Centralized utility for SSD data transformation
     */
    static convertLegacyToSemantic(diagramData) {
        try {
            // Extract lifelines from React Flow nodes
            const lifelines = (diagramData.nodes || []).map((node) => {
                // Determine type by explicit property or ID prefix fallback (e.g., system-Node-1)
                let type = node.data?.lifelineType;
                if (!type) {
                    if (node.id.includes('system-')) type = 'system';
                    else if (node.id.includes('actor-')) type = 'actor';
                    else type = 'actor'; // Default
                }

                return {
                    id: (node.id || '').replace('lifeline-', ''),
                    label: node.data?.label || 'Unknown',
                    type: type
                };
            });

            // Extract messages from React Flow edges
            const messages = (diagramData.edges || []).map((edge, index) => {
                const messageType = _optionalChain([edge, 'access', _ => _.data, 'optionalAccess', _2 => _2.messageType]) || 'synchronous';

                // CRITICAL arrow check: In SSD, return messages often point back to actor
                const isReturn = messageType === 'return' ||
                    !!_optionalChain([edge, 'access', _3 => _3.data, 'optionalAccess', _4 => _4.isReturn]) ||
                    edge.id.includes('return') ||
                    (edge.label || '').toLowerCase().includes('return');

                return {
                    id: edge.id,
                    order: index + 1,
                    fromLifelineId: (edge.source || '').replace('lifeline-', ''),
                    toLifelineId: (edge.target || '').replace('lifeline-', ''),
                    name: edge.label || '',
                    type: messageType,
                    isReturn: isReturn,
                    guard: _optionalChain([edge, 'access', _5 => _5.data, 'optionalAccess', _6 => _6.guard])
                };
            });

            return {
                lifelines,
                messages
            };
        } catch (error) {
            console.error('Error converting legacy data:', error);
            return {
                lifelines: [],
                messages: []
            };
        }
    }

    /**
     * Validate SSD semantics - centralized validation logic
     */
    static validateSSDSemantics(semanticData) {
        return _ssdValidationService.validateSSDSemantics(semanticData);
    }

    /**
     * Validate semantic SSD structure
     */
    static validateSemanticSSDStructure(data) {
        if (!data || typeof data !== 'object') return false;

        // Validate lifelines
        if (!Array.isArray(data.lifelines)) return false;
        for (const lifeline of data.lifelines) {
            if (!lifeline.id || !lifeline.label || !lifeline.type) return false;
            if (!['actor', 'system', 'object'].includes(lifeline.type)) return false;
        }

        // Validate messages
        if (!Array.isArray(data.messages)) return false;
        for (const message of data.messages) {
            if (!message.id || !message.fromLifelineId || !message.toLifelineId || !message.type) return false;
            if (!['synchronous', 'asynchronous', 'return', 'self', 'create', 'delete', 'lost', 'found'].includes(message.type)) return false;
        }

        return true;
    }

    /**
     * Process SSD data for saving - handles both legacy and semantic data
     */
    static processSSDData(ssdData) {
        if (!ssdData) return { semanticData: null, diagramData: null };

        // Handle stringified JSON from DB if necessary
        let rawData = ssdData;
        if (typeof ssdData === 'string') {
            try {
                rawData = JSON.parse(ssdData);
            } catch (e) {
                return { semanticData: null, diagramData: null };
            }
        }

        // Normalize data: prioritize explicit semanticData, fallback to diagramData
        let semanticData = rawData.semanticData;
        let diagramData = rawData.diagramData;

        // NEW: If rawData already contains lifelines/messages, use it as semanticData
        if (!semanticData && (rawData.lifelines || rawData.messages)) {
            semanticData = rawData;
        }

        // CRITICAL: If rawData is the React Flow object (nodes/edges), use it as diagramData
        if (!diagramData && !semanticData && (rawData.nodes || rawData.edges)) {
            diagramData = rawData;
        }

        // If we have diagramData but no semanticData, generate it
        if (!semanticData && diagramData) {
            semanticData = this.convertLegacyToSemantic(diagramData);
        }

        return {
            semanticData,
            diagramData,
            validationPassed: semanticData ? this.validateSemanticSSDStructure(semanticData) : true
        };
    }
} exports.CheckingEngine = CheckingEngine;
