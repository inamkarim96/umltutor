"use strict"; Object.defineProperty(exports, "__esModule", { value: true }); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _ssdValidationService = require('./ssdValidationService');

const {
    VERB_DICTIONARY, INTERNAL_VERBS, EXTERNAL_VERBS, STOP_WORDS,
    PLACEHOLDER_CLASS_NAMES, SYSTEM_INVALID_NAMES, SSD_VERBS,
} = require('../nlp/constants');
const {
    fuzzyIncludes, normalizeToken, normalizeName,
    evaluateFunctionMatch, areSynonyms, lemmatizeToken, fuzzyMatch,
} = require('../nlp/similarity');
const {
    validateSentence, classifySystemStep, suggestFromSentence, parseScenarioStep,
    parseMethodSignature, parseClassAttribute,
} = require('../nlp/sentenceUtils');
const {
    semanticProcessor, SemanticRepresentation,
} = require('../nlp/semanticService');

class CheckingEngine {

    static checkModel(model, section = null, targetId = null) {
        const issues = [];

        // Normalize model data: convert arrays, strings, or unparsed objects to keyed objects
        const normalizeField = (field) => {
            if (!model[field]) return;
            if (typeof model[field] === 'string') {
                try { model[field] = JSON.parse(model[field]); } catch { model[field] = {}; }
            }
            if (Array.isArray(model[field])) {
                const arr = model[field];
                model[field] = {};
                arr.forEach((d, idx) => {
                    if (d) {
                        const parsed = typeof d === 'string' ? JSON.parse(d) : d;
                        const key = parsed.useCaseNodeId || parsed.relatedId || parsed.useCaseId || parsed.id || idx;
                        model[field][key] = parsed;
                    }
                });
            } else if (typeof model[field] === 'object') {
                Object.keys(model[field]).forEach((key) => {
                    const val = model[field][key];
                    if (typeof val === 'string') {
                        try { model[field][key] = JSON.parse(val); } catch { }
                    }
                });
            }
        };

        normalizeField('descriptions');
        normalizeField('ssds');
        normalizeField('sequenceDiagrams');

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

        // 3b. Description <-> SSD semantic alignment (Step 2 -> Step 3)
        if (!section || section === 'ssd') {
            this.validateDescriptionSSDSemantics(model.descriptions, model.ssds, issues, diagramAnalysis, targetId);
        }

        // 4. Class Diagram Validation (Step 4)
        if (!section || section === 'class-diagram') {
            this.validateClassDiagram(
                model.classDiagram,
                issues,
                diagramAnalysis,
                model.descriptions,
                model.ssds
            );
        }

        // 4a. Class diagram structural validation (Phase 12)
        if (!section || section === 'class-diagram') {
            this.validateClassDiagramStructure(model.classDiagram, issues, diagramAnalysis);
        }

        // 4b. SSD operation <-> Class operation full-signature validation (Phase 10)
        if (!section || section === 'class-diagram') {
            this.validateSSDClassOperations(model.classDiagram, model.ssds, issues, diagramAnalysis);
        }

        // 4c. SSD <-> Class semantic responsibility (Step 3 -> Step 4)
        if (!section || section === 'class-diagram') {
            this.validateSSDClassResponsibility(model.classDiagram, model.ssds, issues, diagramAnalysis);
        }

        // 5. Sequence Diagram Validation (Step 5)
        if (!section || section === 'sequence-diagram') {
            this.validateSequenceDiagrams(
                model.sequenceDiagrams,
                issues,
                diagramAnalysis,
                model.descriptions,
                model.ssds,
                model.classDiagram,
                targetId
            );
        }

        // 5b. Sequence <-> Class receiver ownership semantics (Step 5 -> Step 4)
        if (!section || section === 'sequence-diagram') {
            this.validateSequenceClassOwnership(model.sequenceDiagrams, model.classDiagram, issues, diagramAnalysis);
        }

        // 6. Duplicate element detection (across all diagram types)
        if (!section || section === 'diagram' || section === 'usecase' || section === 'class-diagram') {
            this.validateDuplicateElements(model, issues, diagramAnalysis);
        }

        // 7. Multiple system boundary detection
        if (!section || section === 'diagram' || section === 'usecase') {
            this.validateMultipleBoundaries(model.diagram, issues, diagramAnalysis);
        }

        // 8. Advanced description validation
        if (!section || section === 'description') {
            this.validateDescriptionsAdvanced(model.descriptions, issues, diagramAnalysis, targetId);
        }

        // 8a. Alternative flow validation
        if (!section || section === 'description') {
            this.validateAlternativeFlows(model.descriptions, issues, diagramAnalysis, targetId);
        }

        // 8b. Orphan description detection (descriptions not linked to any use case)
        if (!section || section === 'description') {
            this.validateOrphanDescriptions(model.descriptions, issues, diagramAnalysis);
        }

        // 9. Sequence diagram structure validation (call/return pairing, duplicate lifelines)
        if (!section || section === 'sequence-diagram') {
            this.validateSequenceDiagramStructure(model.sequenceDiagrams, model.classDiagram, issues, diagramAnalysis);
        }

        // Global mapping consistency across steps 2–5
        if (!section) {
            this.validateGlobalMapping(model, issues, diagramAnalysis);
        }

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
                edges: (diagram && diagram.edges) || []
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
     * Resolve a human-readable Use Case name for error messages.
     * Priority: use case diagram label → description useCaseName → readable fallback.
     */
    static getUseCaseName(ucId, useCaseLabels, descriptions = {}) {
        const rawLabel = useCaseLabels.get(ucId);
        const descLabel = (descriptions || {})[ucId]?.useCaseName;
        const cleaned = (rawLabel || '').trim();
        return cleaned || (descLabel || '').trim() || 'this Use Case';
    }


    static classifySystemStep(stepText) {
        return classifySystemStep(stepText);
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
        return suggestFromSentence(sentence);
    }

    /**
     * Proper sentence validation for Preconditions, Postconditions, and Steps.
     * Rules:
     * 1. Minimum 10 characters.
     * 2. Minimum 3 words.
     * 3. Starts with an alphabetic character (capital or small).
     * 4. Must contain at least one vowel (basic gibberish check).
     */
    static validateSentence(text) {
        return validateSentence(text);
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
            if (!sysLabel || SYSTEM_INVALID_NAMES.includes(sysLabelLower)) {
                issues.push({
                    type: 'diagram', severity: 'error', location: 'diagram',
                    code: 'SYSTEM_NAME_INVALID',
                    message: !sysLabel
                        ? 'System name is missing.'
                        : `System name "${sysLabel}" is not valid. A single generic word like "System" is not a proper system name.`,
                    context: { suggestion: 'Please provide a valid system name that describes the system (e.g: "Student Portal").' }
                });
            } else if (sysLabel.split(/\s+/).length < 2) {
                issues.push({
                    type: 'diagram', severity: 'warning', location: 'diagram',
                    code: 'SYSTEM_NAME_INVALID',
                    message: `System name "${sysLabel}" is too short. A descriptive system name should contain at least two words.`,
                    context: { suggestion: 'Please provide a more descriptive system name (e.g: "Student Portal").' }
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

        useCases.forEach((uc) => {
            const label = useCaseLabels.get(uc.id);

            if (!label || label.trim() === '') {
                issues.push({
                    type: 'diagram', severity: 'error', location: 'diagram',
                    code: 'USE_CASE_NO_NAME',
                    message: 'Use Case has no name.',
                    relatedId: uc.id,
                    context: { useCaseId: uc.id, suggestion: 'Please provide a name for this Use Case. Use Case names must follow the format: Verb + Noun (e.g: "Submit Order").' }
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
                        context: { useCaseId: uc.id, suggestion: 'Use Case names must follow the format: Verb + Noun (e.g: "Submit Order"). Start with a verb from the dictionary.' }
                    });
                } else {
                    const firstWord = words[0].toLowerCase();
                    if (!VERB_DICTIONARY.has(firstWord)) {
                        issues.push({
                            type: 'diagram', severity: 'error', location: 'diagram',
                            code: 'USE_CASE_INVALID_NAME',
                            message: `Invalid Use Case Name: "${label}". Use case name must start with a verb.`,
                            relatedId: uc.id,
                            context: { useCaseId: uc.id, suggestion: 'Use Case names must follow the format: Verb + Noun (e.g: "Submit Order"). Start with a verb from the dictionary.' }
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

        const { useCases, actorLabels, useCaseLabels, edges } = analysis;
        const descriptionByName = new Map();
        Object.entries(descriptions).forEach(([key, desc]) => {
            if (desc && desc.useCaseName) {
                const n = normalizeName(desc.useCaseName);
                if (n) descriptionByName.set(n, { key, desc });
            }
        });

        useCases.forEach((node) => {
            // If targetId is provided, skip all other use cases
            if (targetId && node.id !== targetId) return;

            let desc = descriptions[node.id];
            const nodeLabel = this.getNodeLabel(node.id, useCaseLabels);

            // ID-based lookup failed — try name-based fallback for stale relatedId
            if (!desc) {
                const nodeNameNorm = normalizeName(nodeLabel);
                if (nodeNameNorm && descriptionByName.has(nodeNameNorm)) {
                    const match = descriptionByName.get(nodeNameNorm);
                    desc = match.desc;
                    // Re-map description to current node ID in the model so other validators benefit
                    descriptions[node.id] = desc;
                }
            }

            if (!desc) {
                // Only report missing description if we are NOT targeting a specific one
                // OR if we ARE targeting this specific one and it's missing
                if (!targetId || node.id === targetId) {
                    issues.push({
                        type: 'description',
                        severity: 'error',
                        code: 'DESCRIPTION_NOT_FOUND',
                        message: `Use Case Description not found for "${nodeLabel}".`,
                        relatedId: node.id,
                        location: 'description'
                    });
                }
                return;
            }

            // 0. Check Title / Use Case Name
            if (!desc.useCaseName || !desc.useCaseName.trim()) {
                issues.push({
                    type: 'description',
                    severity: 'error',
                    code: 'NO_TITLE',
                    message: `Use Case title is missing in description for "${nodeLabel}".`,
                    relatedId: node.id,
                    location: 'description',
                    context: { suggestion: 'Add a title for the use case description.' }
                });
            } else {
                const descName = normalizeName(desc.useCaseName);
                const diagramLabel = normalizeName(nodeLabel);
                if (descName !== diagramLabel && descName !== 'unnamed' && diagramLabel !== 'unnamed') {
                    const semantic = evaluateFunctionMatch(desc.useCaseName, nodeLabel);
                    if (semantic.matchType === 'STRONG' || semantic.matchType === 'EXACT') {
                        // Semantically equivalent (synonyms / word order) — acceptable, no error
                    } else if (semantic.matchType === 'PARTIAL') {
                        issues.push({
                            type: 'consistency',
                            severity: 'warning',
                            code: 'USE_CASE_NAME_MISMATCH',
                            message: `Description name "${desc.useCaseName}" partially matches diagram name "${nodeLabel}" (confidence ${(semantic.score * 100).toFixed(0)}%).`,
                            relatedId: node.id,
                            location: 'description',
                            context: { suggestion: 'Align the use case name in the description to match the diagram for full consistency.', confidence: semantic.score }
                        });
                    } else {
                        issues.push({
                            type: 'consistency',
                            severity: 'warning',
                            code: 'USE_CASE_NAME_MISMATCH',
                            message: `Description name "${desc.useCaseName}" does not match diagram name "${nodeLabel}".`,
                            relatedId: node.id,
                            location: 'description',
                            context: { suggestion: 'Ensure the use case name in the description matches the diagram.', confidence: semantic.score }
                        });
                    }
                }
            }

            // 1. Check primary actor
            const isNotSetActor = !desc.primaryActor ||
                (typeof desc.primaryActor === 'string' && (desc.primaryActor.trim() === '' || normalizeName(desc.primaryActor) === 'not set'));

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
            } else {
                const primaryActorNorm = normalizeName(desc.primaryActor);
                const availableActors = Array.from(actorLabels.values()).map(v => normalizeName(v));

                if (!availableActors.includes(primaryActorNorm)) {
                    // Find the closest matching actor name to give a targeted suggestion
                    let closest = null;
                    let bestScore = 0;
                    for (const actorName of availableActors) {
                        const score = fuzzyMatch(primaryActorNorm, actorName);
                        if (score > bestScore) {
                            bestScore = score;
                            closest = actorName;
                        }
                    }
                    const originalClosest = closest
                        ? Array.from(actorLabels.values()).find(v => normalizeName(v) === closest)
                        : null;
                    issues.push({
                        type: 'consistency',
                        severity: 'error',
                        code: 'INVALID_PRIMARY_ACTOR',
                        message: `Primary Actor "${desc.primaryActor}" in description for "${nodeLabel}" does not exist in the use case diagram.`,
                        relatedId: node.id,
                        path: 'primaryActor',
                        location: 'description',
                        context: {
                            suggestion: originalClosest && bestScore >= 0.6
                                ? `Did you mean "${originalClosest}"? Ensure the Primary Actor name matches the one in the Use Case Diagram.`
                                : 'Ensure Primary Actor name matches the one in the Use Case Diagram.'
                        }
                    });
                } else {
                    // Find the actor node matching the primary actor name
                    const actorNode = analysis.actors.find((a) => {
                        const label = actorLabels.get(a.id) || '';
                        return normalizeName(label) === primaryActorNorm;
                    });
                    const actorConnected = actorNode && edges.some(
                        (e) => (e.source === node.id && e.target === actorNode.id) ||
                            (e.target === node.id && e.source === actorNode.id)
                    );
                    if (actorNode && !actorConnected) {
                        issues.push({
                            type: 'consistency',
                            severity: 'warning',
                            code: 'PRIMARY_ACTOR_NOT_CONNECTED',
                            message: `Primary Actor "${desc.primaryActor}" is not connected to Use Case "${nodeLabel}" in the diagram.`,
                            relatedId: node.id,
                            path: 'primaryActor',
                            location: 'description',
                            context: { suggestion: 'Draw an association line between the primary actor and this use case in the Use Case Diagram.' }
                        });
                    }
                }
            }

            // 2. Check preconditions — accept string or array
            let preValue = desc.preconditions;
            if (Array.isArray(preValue)) preValue = preValue.join(' ');
            const preStr = (typeof preValue === 'string' ? preValue : '').trim();
            const isNoPre = !preStr || normalizeName(preStr) === 'none';

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
            } else {
                const validation = this.validateSentence(preStr);
                if (!validation.isValid) {
                    issues.push({
                        type: 'description',
                        severity: 'error',
                        code: 'INVALID_PRECONDITIONS',
                        message: `Invalid Precondition for "${nodeLabel}": ${validation.error}`,
                        relatedId: node.id,
                        location: 'description',
                        context: { suggestion: 'Precondition: Please write a proper sentence (e.g., "The user is logged in.").' }
                    });
                }
            }

            // 3. Check postconditions — accept string or array
            let postValue = desc.postconditions;
            if (Array.isArray(postValue)) postValue = postValue.join(' ');
            const postStr = (typeof postValue === 'string' ? postValue : '').trim();
            const isNoPost = !postStr || normalizeName(postStr) === 'none';

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
            } else {
                const validation = this.validateSentence(postStr);
                if (!validation.isValid) {
                    issues.push({
                        type: 'description',
                        severity: 'error',
                        code: 'INVALID_POSTCONDITIONS',
                        message: `Invalid Postcondition for "${nodeLabel}": ${validation.error}`,
                        relatedId: node.id,
                        location: 'description',
                        context: { suggestion: 'Postcondition: Please write a proper sentence (e.g., "The order is saved.").' }
                    });
                }
            }

            // 4. Check main flow exists
            const hasMainFlow = desc.mainFlow && desc.mainFlow.length > 0 && desc.mainFlow.some(step => {
                const text = step.action || (typeof step === 'string' ? step : null);
                return text && text.trim().length > 0;
            });

            if (!hasMainFlow) {
                issues.push({
                    type: 'description',
                    severity: 'error',
                    code: 'NO_MAIN_FLOW',
                    message: `Description for "${nodeLabel}" has no main flow steps.`,
                    relatedId: node.id,
                    location: 'description'
                });
            } else {
                // Validate each step in main flow
                desc.mainFlow.forEach((step, idx) => {
                    const stepText = step.action || (typeof step === 'string' ? step : '');
                    if (stepText && stepText.trim()) {
                        const validation = this.validateSentence(stepText);
                        if (!validation.isValid) {
                            issues.push({
                                type: 'description',
                                severity: 'error',
                                code: 'INVALID_MAIN_FLOW_STEP',
                                message: `Step ${idx + 1} in "${nodeLabel}" is invalid: ${validation.error}`,
                                relatedId: node.id,
                                location: 'description',
                                context: { suggestion: `Step ${idx + 1}: Write a clear and complete sentence.` }
                            });
                        }
                    } else {
                        issues.push({
                            type: 'description',
                            severity: 'warning',
                            code: 'EMPTY_MAIN_FLOW_STEP',
                            message: `Step ${idx + 1} in "${nodeLabel}" is empty.`,
                            relatedId: node.id,
                            location: 'description',
                            context: { suggestion: `Step ${idx + 1}: Describe the action, e.g., "Student enters PIN."` }
                        });
                    }
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

            // Resolve a human-readable name for this Use Case in error messages:
            // Priority: useCaseLabels (from diagram) → description.useCaseName → 'this Use Case'
            const ucName = this.getUseCaseName(nodeId, useCaseLabels, descriptions);

            if (!ssdRawData) return;

            // CRITICAL FIX: SSD data might be raw React Flow diagram data
            // We must convert it to semantic lifelines/messages before validating
            const { semanticData } = this.processSSDData(ssdRawData);

            if (!semanticData || !semanticData.lifelines || semanticData.lifelines.length === 0) {
                issues.push({
                    type: 'ssd',
                    severity: 'error',
                    code: 'SSD_NOT_FOUND',
                    message: `System Sequence Diagram for "${ucName}" is not found or empty.`,
                    relatedId: nodeId,
                    context: { useCaseId: nodeId },
                    location: 'ssd'
                });
                return;
            } else if (semanticData.lifelines.length < 2) {
                issues.push({
                    type: 'ssd',
                    severity: 'error',
                    code: 'INCOMPLETE_SSD',
                    message: `SSD for "${ucName}" is incomplete — add both an Actor and a System lifeline.`,
                    relatedId: nodeId,
                    context: { useCaseId: nodeId },
                    location: 'ssd'
                });
            }

            // Use the centralized SSD validation on the SEMANTIC data
            const semanticResult = this.validateSSDSemantics(semanticData);
            if (!semanticResult.isValid) {
                (semanticResult.structuredErrors || semanticResult.errors.map((err) => ({
                    code: 'SSD_SEMANTIC_ERROR',
                    message: err
                }))).forEach((errObj) => {
                    issues.push({
                        type: errObj.type || 'ssd',
                        severity: errObj.severity || 'error',
                        code: errObj.code || 'SSD_SEMANTIC_ERROR',
                        // Never include raw UUIDs in the message — use the friendly ucName
                        message: `${errObj.message} (Use Case: "${ucName}")`,
                        relatedId: nodeId,
                        context: { useCaseId: nodeId, elementId: errObj.relatedId },
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
        const lifelineMap = new Map(lifelines.map(l => [l.id, l]));

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
                const sender = lifelineMap.get(firstMsg.fromLifelineId);

                if (sender && sender.type === 'actor' && desc.primaryActor) {
                    const senderLabelNorm = normalizeName(sender.label);
                    const descActorNorm = normalizeName(desc.primaryActor);

                    if (senderLabelNorm && descActorNorm && senderLabelNorm !== descActorNorm) {
                        issues.push({
                            type: 'consistency',
                            severity: 'error',
                            code: 'SSD_CONSISTENCY_ACTOR_MISMATCH',
                            message: `SSD 3.${displayNum} Consistency error: Started with Actor "${sender.label}", but mapped ${mappingRef} defines "${desc.primaryActor}".`,
                            relatedId: ucId,
                            location: 'ssd'
                        });
                    }
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
                    for (let v of SSD_VERBS) {
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
                    // console.log(\`Step \${stepNo} ("\${stepTextNoSpaces}") MATCHED msg \${i} ("\${msgNorm}")\`);
                    matchedMsgIdx = i;
                    break;
                }
            }

            if (matchedMsgIdx !== -1) {
                // console.log(\`Step \${stepNo} matched message \${matchedMsgIdx} (expected: >= \${expectedMessageIdx})\`);
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

                const sender = lifelineMap.get(msg.fromLifelineId);
                const receiver = lifelineMap.get(msg.toLifelineId);

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
                const sg = this.suggestFromSentence(stepTextOrig);
                const hasParens = msgOrig.includes('(') || msgOrig.includes(')');

                // If the user's message is loosely matched but doesn't follow method format, guide them
                if (msgWords.length < 1 || !hasParens) {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'SSD_CONSISTENCY_NAME_GUIDANCE',
                        message: 'Message Name Guidance',
                        relatedId: ucId,
                        location: 'ssd',
                        context: {
                            stepNumber: `${stepNo}`,
                            problem: `Message ${msg.order} ("${msgOrig}") lacks standard structural formatting (action/parameters).`,
                            suggestion: `Rename to clearly describe the action using standard notation.`,
                            parsedMessage: sg.nearestFunctionWithParam,
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
     * Description <-> SSD semantic alignment (Step 2 -> Step 3).
     * Uses the centralized semantic processor to detect main-flow steps
     * that have no semantically matching SSD message, and SSD messages
     * that do not semantically correspond to any main-flow step.
     */
    static validateDescriptionSSDSemantics(descriptions, ssds, issues, analysis, targetId = null) {
        if (!descriptions || !ssds) return;

        const { useCaseLabels, actorLabels } = analysis;
        const availableActors = actorLabels ? Array.from(actorLabels.values()) : [];
        const sortedUCs = [...(analysis.useCases || [])].sort((a, b) => {
            const posA = a.position || { x: 0, y: 0 };
            const posB = b.position || { x: 0, y: 0 };
            return (posA.y - posB.y) || (posA.x - posB.x);
        });

        Object.entries(ssds).forEach(([ucId, rawSSD]) => {
            if (targetId && ucId !== targetId) return;
            const desc = descriptions[ucId];
            if (!desc?.mainFlow?.length) return;

            const ucLabel = useCaseLabels.get(ucId) || desc.useCaseName || ucId;
            const { semanticData } = this.processSSDData(rawSSD);
            if (!semanticData?.messages?.length) return;

            const steps = desc.mainFlow.filter((s) => {
                const t = (s.action || '').trim();
                return t && !/^(if|else|then)\b/i.test(t);
            });
            if (steps.length === 0) return;

            const stepSemantics = steps.map((s, i) =>
                semanticProcessor.processDescriptionStep(s.action, ucId, availableActors)
            );
            const messageSemantics = semanticData.messages.map((m) =>
                semanticProcessor.processSSDMessage(m, ucId)
            );

            const stepMatches = semanticProcessor.findBestStepMessageMatch(stepSemantics, messageSemantics, {
                threshold: 0.5
            });

            const matchedSteps = new Set();
            const matchedMessages = new Set();
            stepMatches.forEach((match) => {
                matchedSteps.add(match.stepIndex);
                matchedMessages.add(match.messageIndex);
            });

            steps.forEach((step, idx) => {
                if (matchedSteps.has(idx)) return;
                const stepText = (step.action || '').trim();
                const stepNo = step.step || (idx + 1);
                const sg = this.suggestFromSentence(stepText);
                issues.push({
                    type: 'consistency',
                    severity: 'warning',
                    code: 'SSD_SEMANTIC_MISSING_MESSAGE',
                    message: `Step "${stepText}" in "${ucLabel}" has no semantically matching SSD message.`,
                    relatedId: ucId,
                    location: 'ssd',
                    context: {
                        stepNumber: `${stepNo}`,
                        problem: `Step ${stepNo} ("${stepText}") cannot be semantically aligned with any message in SSD 3.${this._ucDisplayNumber(ucId, sortedUCs)}.`,
                        suggestion: `Add a message named "${sg.nearestFunction}" to the SSD, or rename an existing message to match this step.`
                    }
                });
            });

            semanticData.messages.forEach((msg, idx) => {
                if (matchedMessages.has(idx) || msg.isReturn) return;
                const msgName = (msg.name || '').trim();
                if (!msgName) return;
                issues.push({
                    type: 'consistency',
                    severity: 'info',
                    code: 'SSD_SEMANTIC_UNUSED_MESSAGE',
                    message: `SSD message "${msgName}" in "${ucLabel}" does not semantically match any main-flow step.`,
                    relatedId: ucId,
                    location: 'ssd',
                    context: {
                        problem: `Message "${msgName}" has no corresponding semantic intent in the main scenario.`,
                        suggestion: `Ensure "${msgName}" is intentional; consider removing it or adding a matching step.`
                    }
                });
            });
        });
    }

    static _ucDisplayNumber(ucId, sortedUCs) {
        const idx = sortedUCs.findIndex((uc) => uc.id === ucId);
        return idx !== -1 ? (idx + 1) : (String(ucId).split('-').pop());
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

        const classDiagram = model.classDiagram;
        const sequenceDiagrams = model.sequenceDiagrams || {};
        const seqKeys = Object.keys(sequenceDiagrams);
        const hasClassDiagram = !!(classDiagram?.nodes?.length);

        sortedUCs.forEach((uc, index) => {
            const num = index + 1;
            const hasDesc = !!descriptions[uc.id];
            const hasSSD = !!ssds[uc.id];
            const hasSeq = !!sequenceDiagrams[uc.id];
            const ucName = uc.data?.label || 'Use Case';

            if (hasDesc && hasSSD && !hasClassDiagram) {
                issues.push({
                    type: 'consistency',
                    severity: 'info',
                    code: 'CLASS_DIAGRAM_MISSING',
                    message: `Step 2.${num} and 3.${num} exist for "${ucName}", but Step 4 (Class Diagram) has not been started.`,
                    relatedId: uc.id,
                    location: 'class-diagram'
                });
            }

            if (hasDesc && !hasSeq) {
                issues.push({
                    type: 'consistency',
                    severity: 'info',
                    code: 'SEQUENCE_DIAGRAM_MISSING',
                    message: `Step 2.${num} description exists for "${ucName}", but Step 5.${num} Sequence Diagram has not been started.`,
                    relatedId: uc.id,
                    location: 'sequence-diagram'
                });
            } else if (hasSeq && !hasDesc) {
                issues.push({
                    type: 'consistency',
                    severity: 'warning',
                    code: 'SEQUENCE_WITHOUT_DESCRIPTION',
                    message: `Sequence Diagram 5.${num} exists but Description 2.${num} is missing.`,
                    relatedId: uc.id,
                    location: 'sequence-diagram'
                });
            }

            if (hasSSD && hasSeq && hasDesc) {
                const ssdSemantic = this.processSSDData(ssds[uc.id]).semanticData;
                const seqSemantic = this.processSequenceData(sequenceDiagrams[uc.id]).semanticData;
                if (ssdSemantic?.messages?.length && seqSemantic?.messages?.length) {
                    const ssdCount = ssdSemantic.messages.filter(m => !m.isReturn).length;
                    const seqCount = seqSemantic.messages.filter(m => !m.isReturn).length;
                    if (seqCount < ssdCount) {
                        issues.push({
                            type: 'consistency',
                            severity: 'warning',
                            code: 'SEQ_FEWER_THAN_SSD',
                            message: `Sequence Diagram 5.${num} has fewer interactions (${seqCount}) than SSD 3.${num} (${ssdCount}). Detail the design-level SSD in the sequence diagram.`,
                            relatedId: uc.id,
                            location: 'sequence-diagram'
                        });
                    } else if (seqCount > ssdCount + 1) {
                        issues.push({
                            type: 'consistency',
                            severity: 'info',
                            code: 'SEQ_EXTRA_MESSAGES',
                            message: `Sequence Diagram 5.${num} has significantly more interactions (${seqCount}) than SSD 3.${num} (${ssdCount}). Ensure the extra messages are justified decomposition.`,
                            relatedId: uc.id,
                            location: 'sequence-diagram'
                        });
                    }
                }
            }
        });

        if (hasClassDiagram && seqKeys.length === 0 && descKeys.length > 0) {
            issues.push({
                type: 'consistency',
                severity: 'info',
                code: 'SEQUENCE_DIAGRAMS_INCOMPLETE',
                message: 'Class Diagram (Step 4) exists but no Sequence Diagrams (Step 5) were found.',
                location: 'sequence-diagram'
            });
        }
    }

    static validateDuplicateElements(model, issues, analysis) {
        const { actors, useCases, actorLabels, useCaseLabels, nodes } = analysis;

        const seenActorNames = new Set();
        actors.forEach((actor) => {
            const label = actorLabels.get(actor.id);
            if (label && label.trim()) {
                const lower = label.trim().toLowerCase();
                if (seenActorNames.has(lower)) {
                    issues.push({
                        type: 'diagram', severity: 'error', location: 'diagram',
                        code: 'DUPLICATE_ACTOR_NAME',
                        message: `Duplicate Actor name: "${label}". Each actor must have a unique name.`,
                        relatedId: actor.id,
                        context: { suggestion: `Rename one of the "${label}" actors to distinguish them (e.g., "${label}1" or a more specific role).` }
                    });
                }
                seenActorNames.add(lower);
            }
        });

        const seenUseCaseNames = new Set();
        useCases.forEach((uc) => {
            const label = useCaseLabels.get(uc.id);
            if (label && label.trim()) {
                const lower = label.trim().toLowerCase();
                if (seenUseCaseNames.has(lower)) {
                    issues.push({
                        type: 'diagram', severity: 'error', location: 'diagram',
                        code: 'DUPLICATE_USE_CASE_NAME',
                        message: `Duplicate Use Case name: "${label}". Each use case must have a unique name.`,
                        relatedId: uc.id,
                        context: { suggestion: `Rename one of the "${label}" use cases. Use cases must be uniquely identifiable.` }
                    });
                }
                seenUseCaseNames.add(lower);
            }
        });

        if (model.classDiagram?.nodes) {
            const seenClassNames = new Set();
            model.classDiagram.nodes.forEach((node) => {
                if (node.type !== 'class' && node.type !== 'interface') return;
                const label = (node.data?.label || '').trim().toLowerCase();
                if (!label) return;
                if (seenClassNames.has(label)) {
                    issues.push({
                        type: 'class-diagram', severity: 'error', location: 'class-diagram',
                        code: 'DUPLICATE_CLASS_NAME',
                        message: `Duplicate Class name: "${node.data.label}". Each class must have a unique name.`,
                        relatedId: node.id,
                        context: { suggestion: `Rename one of the "${node.data.label}" classes.` }
                    });
                }
                seenClassNames.add(label);
            });
        }
    }

    static validateMultipleBoundaries(diagram, issues, analysis) {
        if (!diagram?.nodes) return;

        const boundaries = analysis.nodes.filter((n) => n.type === 'systemBoundary');
        if (boundaries.length > 1) {
            boundaries.slice(1).forEach((b) => {
                issues.push({
                    type: 'diagram', severity: 'error', location: 'diagram',
                    code: 'MULTIPLE_SYSTEM_BOUNDARIES',
                    message: 'Multiple system boundaries detected. A use case diagram should have exactly one system boundary.',
                    relatedId: b.id,
                    context: { suggestion: 'Remove the extra system boundary. A use case diagram models a single system.' }
                });
            });
        }
    }

    static validateDescriptionsAdvanced(descriptions, issues, analysis, targetId = null) {
        if (!descriptions) return;

        const { useCases, useCaseLabels } = analysis;

        useCases.forEach((node) => {
            if (targetId && node.id !== targetId) return;

            const desc = descriptions[node.id];
            if (!desc?.mainFlow?.length) return;
            const nodeLabel = this.getNodeLabel(node.id, useCaseLabels);

            if (desc.mainFlow.length < 3) {
                issues.push({
                    type: 'description', severity: 'warning', location: 'description',
                    code: 'MIN_STEP_COUNT',
                    message: `Description for "${nodeLabel}" has only ${desc.mainFlow.length} step(s). A main scenario should have at least 3 steps to be meaningful.`,
                    relatedId: node.id,
                    context: { suggestion: 'Add more steps to describe the full interaction flow.' }
                });
            }

            const seenStepTexts = new Set();
            desc.mainFlow.forEach((step, idx) => {
                const text = (step.action || '').trim().toLowerCase();
                if (text && seenStepTexts.has(text)) {
                    issues.push({
                        type: 'description', severity: 'warning', location: 'description',
                        code: 'DUPLICATE_STEP',
                        message: `Step ${idx + 1} in "${nodeLabel}" is identical to another step. Steps should be unique.`,
                        relatedId: node.id,
                        context: { suggestion: `Revise Step ${idx + 1} to describe a distinct action.` }
                    });
                }
                if (text) seenStepTexts.add(text);
            });
        });
    }

    /**
     * Validate alternative flows in a use case description.
     * Each alternative flow references a main-flow step and declares a
     * condition + system response. A flow is only valid when:
     *   - relatedStep points to an existing main-flow step number
     *   - condition is present and forms a valid sentence
     *   - response is present and forms a valid sentence
     * The semantic meaning of the condition must connect to the use case
     * whose description is being validated (linked via the description key).
     */
    static validateAlternativeFlows(descriptions, issues, analysis, targetId = null) {
        if (!descriptions) return;

        const { useCases, useCaseLabels } = analysis;

        Object.entries(descriptions).forEach(([key, desc]) => {
            if (!desc) return;
            if (targetId && key !== targetId) return;

            const altFlows = desc.alternativeFlows;
            if (!Array.isArray(altFlows) || altFlows.length === 0) return;

            const ucName = useCaseLabels.get(key) || desc.useCaseName || 'this Use Case';
            const mainFlow = Array.isArray(desc.mainFlow) ? desc.mainFlow : [];

            // Collect the valid step numbers: prefer explicit stepNumber/step, fall back to index+1
            const validStepNumbers = new Set();
            mainFlow.forEach((step, idx) => {
                const raw = step && (typeof step === 'object' ? (step.stepNumber ?? step.step) : null);
                const num = Number(raw);
                validStepNumbers.add(Number.isInteger(num) && num > 0 ? num : idx + 1);
            });

            altFlows.forEach((flow, altIdx) => {
                const altLabel = `Alternative flow ${altIdx + 1} in "${ucName}"`;

                const relatedStep = Number(flow?.relatedStep);
                if (!Number.isInteger(relatedStep) || relatedStep < 1 || !validStepNumbers.has(relatedStep)) {
                    issues.push({
                        type: 'description',
                        severity: 'error',
                        code: 'ALT_FLOW_INVALID_RELATED_STEP',
                        message: `${altLabel} references step ${String(flow?.relatedStep)} which does not exist in the main flow.`,
                        relatedId: key,
                        location: 'description',
                        context: {
                            suggestion: `Point the alternative flow to an existing main-flow step (${[...validStepNumbers].sort((a, b) => a - b).join(', ') || 'none'}).`
                        }
                    });
                }

                const condition = (typeof flow?.condition === 'string' ? flow.condition : '').trim();
                if (!condition) {
                    issues.push({
                        type: 'description',
                        severity: 'error',
                        code: 'ALT_FLOW_EMPTY_CONDITION',
                        message: `${altLabel} has no condition. Describe when this alternative path triggers.`,
                        relatedId: key,
                        location: 'description',
                        context: { suggestion: 'Add a condition, e.g., "If the entered PIN is incorrect."' }
                    });
                } else {
                    const condValidation = this.validateSentence(condition);
                    if (!condValidation.isValid) {
                        issues.push({
                            type: 'description',
                            severity: 'error',
                            code: 'ALT_FLOW_INVALID_SENTENCE',
                            message: `${altLabel} has an invalid condition: ${condValidation.error}`,
                            relatedId: key,
                            location: 'description',
                            context: { suggestion: 'Write the condition as a complete sentence (e.g., "If the credentials are invalid.").' }
                        });
                    }
                }

                const response = (typeof flow?.response === 'string' ? flow.response : '').trim();
                if (!response) {
                    issues.push({
                        type: 'description',
                        severity: 'error',
                        code: 'ALT_FLOW_EMPTY_RESPONSE',
                        message: `${altLabel} has no system response. Describe what the system does in this path.`,
                        relatedId: key,
                        location: 'description',
                        context: { suggestion: 'Add the system response, e.g., "The system displays an error message."' }
                    });
                } else {
                    const respValidation = this.validateSentence(response);
                    if (!respValidation.isValid) {
                        issues.push({
                            type: 'description',
                            severity: 'error',
                            code: 'ALT_FLOW_INVALID_SENTENCE',
                            message: `${altLabel} has an invalid system response: ${respValidation.error}`,
                            relatedId: key,
                            location: 'description',
                            context: { suggestion: 'Write the system response as a complete sentence.' }
                        });
                    }
                }
            });
        });
    }

    /**
     * Detect descriptions that are not linked to any use case in the diagram.
     * A description is considered orphaned when its key matches no use case id
     * AND its useCaseName matches no use case label.
     */
    static validateOrphanDescriptions(descriptions, issues, analysis) {
        if (!descriptions) return;

        const { useCases, useCaseLabels } = analysis;
        const useCaseIds = new Set(useCases.map((uc) => uc.id));
        const useCaseLabelsNorm = useCases.map((uc) => {
            const label = useCaseLabels.get(uc.id) || '';
            return { id: uc.id, labelNorm: normalizeName(label) };
        }).filter((x) => x.labelNorm);

        Object.entries(descriptions).forEach(([key, desc]) => {
            if (!desc) return;

            // Description keyed to an existing use case id is linked
            if (useCaseIds.has(key)) return;

            // Check if description name matches any use case label (name-based linkage)
            const nameNorm = normalizeName(desc.useCaseName);
            if (nameNorm) {
                const matchedByName = useCaseLabelsNorm.some(
                    (x) => x.labelNorm === nameNorm ||
                        evaluateFunctionMatch(desc.useCaseName, useCaseLabels.get(x.id)).matchType !== 'NONE'
                );
                if (matchedByName) return;
            }

            // If the description uses a relatedId/useCaseId inside itself, check that too
            const innerId = desc.useCaseId || desc.relatedId || desc.useCaseNodeId;
            if (innerId && useCaseIds.has(innerId)) return;

            issues.push({
                type: 'consistency',
                severity: 'warning',
                code: 'DESCRIPTION_ORPHAN',
                message: `Description "${desc.useCaseName || 'Unnamed'}" is not linked to any use case in the diagram.`,
                relatedId: key,
                location: 'description',
                context: {
                    suggestion: 'Remove this description or link it to the corresponding use case in the Use Case Diagram.'
                }
            });
        });
    }

    static validateSequenceDiagramStructure(sequenceDiagrams, classDiagram, issues, analysis) {
        if (!sequenceDiagrams) return;

        const { useCases, useCaseLabels } = analysis;

        useCases.forEach((uc) => {
            const ucName = this.getUseCaseName(uc.id, useCaseLabels);
            const rawSeq = sequenceDiagrams[uc.id];
            if (!rawSeq) return;

            const { semanticData } = this.processSequenceData(rawSeq);
            if (!semanticData?.messages?.length) return;

            const lifelineLabels = new Set();
            (semanticData.lifelines || []).forEach((ll) => {
                const lower = (ll.label || '').trim().toLowerCase();
                if (lower && lifelineLabels.has(lower)) {
                    issues.push({
                        type: 'sequence-diagram', severity: 'warning', location: 'sequence-diagram',
                        code: 'DUPLICATE_LIFELINE',
                        message: `Duplicate lifeline "${ll.label}" in Sequence Diagram for "${ucName}".`,
                        relatedId: uc.id,
                        context: { suggestion: 'Remove the duplicate lifeline. Each participant should appear once.' }
                    });
                }
                if (lower) lifelineLabels.add(lower);
            });

            const callMap = new Set();
            const returnMap = new Set();
            semanticData.messages.forEach((msg) => {
                if (msg.isReturn || msg.type === 'return') {
                    returnMap.add(msg.name);
                } else {
                    callMap.add(msg.name);
                }
            });

            callMap.forEach((callName) => {
                const baseName = callName.split('(')[0];
                const hasReturn = Array.from(returnMap).some((r) => {
                    const rBase = r.split('(')[0];
                    return rBase.includes(baseName) || baseName.includes(rBase);
                });
                if (!hasReturn) {
                    issues.push({
                        type: 'sequence-diagram', severity: 'warning', location: 'sequence-diagram',
                        code: 'SEQUENCE_MISSING_RETURN',
                        message: `Synchronous call "${callName}" in Sequence Diagram for "${ucName}" has no matching return message.`,
                        relatedId: uc.id,
                        context: { suggestion: `Add a return message for "${callName}".` }
                    });
                }
            });
        });
    }

    static extractClassDiagramModel(classDiagram) {
        const classes = [];
        const methods = [];
        if (!classDiagram?.nodes) return { classes, methods };

        classDiagram.nodes.forEach((node) => {
            if (node.type !== 'class' && node.type !== 'interface') return;
            const label = (node.data?.label || '').trim();
            if (!label) return;
            classes.push({ id: node.id, label, type: node.type });
            (node.data?.methods || []).forEach((raw) => {
                const signature = parseMethodSignature(raw);
                if (!signature || !signature.name) return;
                methods.push({
                    className: label,
                    // Backward-compatible bare lowercased name for existing consumers.
                    methodName: signature.name.toLowerCase(),
                    name: signature.name,
                    visibility: signature.visibility,
                    parameters: signature.parameters,
                    returnType: signature.returnType,
                    raw: String(raw)
                });
            });
        });
        return { classes, methods };
    }

    static parseLifelineClassName(label) {
        const raw = (label || '').trim();
        const instanceMatch = raw.match(/^instance\s*:\s*(.+)$/i);
        if (instanceMatch) return instanceMatch[1].trim();
        if (raw.toLowerCase().startsWith(':')) return raw.slice(1).trim();
        return raw;
    }

    static normalizeToken(text) {
        return normalizeToken(text);
    }

    static fuzzyIncludes(haystack, needle) {
        return fuzzyIncludes(haystack, needle);
    }

    static validateClassDiagram(classDiagram, issues, analysis, descriptions, ssds) {
        const { useCases, useCaseLabels } = analysis;
        const { classes, methods } = this.extractClassDiagramModel(classDiagram);

        if (!classDiagram?.nodes?.length) {
            issues.push({
                type: 'class-diagram',
                severity: 'error',
                code: 'CLASS_DIAGRAM_EMPTY',
                message: 'Class Diagram is empty.',
                location: 'class-diagram',
                context: { suggestion: 'Add classes that represent domain entities from your use cases.' }
            });
            return;
        }

        if (classes.length === 0) {
            issues.push({
                type: 'class-diagram',
                severity: 'error',
                code: 'NO_CLASSES',
                message: 'No classes or interfaces defined in the Class Diagram.',
                location: 'class-diagram'
            });
        }

        classes.forEach((cls) => {
            const lower = cls.label.toLowerCase();
            if (PLACEHOLDER_CLASS_NAMES.has(lower)) {
                issues.push({
                    type: 'class-diagram',
                    severity: 'error',
                    code: 'CLASS_NAME_PLACEHOLDER',
                    message: `Class "${cls.label}" uses a placeholder name.`,
                    location: 'class-diagram',
                    context: { suggestion: 'Rename to a domain entity (e.g., Order, Student, Payment).' }
                });
            }
        });

        if (methods.length === 0) {
            issues.push({
                type: 'class-diagram',
                severity: 'warning',
                code: 'NO_METHODS',
                message: 'No operations/methods defined on any class.',
                location: 'class-diagram',
                context: { suggestion: 'Add public operations that correspond to SSD messages and scenario steps.' }
            });
        }

        useCases.forEach((uc) => {
            const desc = (descriptions || {})[uc.id];
            if (!desc?.mainFlow?.length) return;
            const ucName = this.getUseCaseName(uc.id, useCaseLabels, descriptions);
            const nouns = new Set();
            desc.mainFlow.forEach((step) => {
                const words = (step.action || '').split(/\s+/);
                words.forEach((w) => {
                    const clean = w.replace(/[^a-zA-Z]/g, '');
                    if (clean.length > 3 && !STOP_WORDS.has(clean.toLowerCase()) && clean.toLowerCase() !== 'system') {
                        nouns.add(clean);
                    }
                });
            });
            nouns.forEach((noun) => {
                const hasClass = classes.some((c) => this.fuzzyIncludes(c.label, noun));
                if (!hasClass) {
                    issues.push({
                        type: 'consistency',
                        severity: 'info',
                        code: 'CLASS_ENTITY_SUGGESTION',
                        message: `Consider a class for "${noun}" (from "${ucName}" scenario).`,
                        relatedId: uc.id,
                        location: 'class-diagram'
                    });
                }
            });
        });
    }

    /**
     * Class diagram structural validation (Phase 12). Only rules that fit this
     * application's modeling format are applied (nodes carry label/attributes/
     * methods; edges carry one of the relationship types below). Deliberately
     * NOT added: aggregation-vs-composition multiplicity semantics, because the
     * editor does not capture multiplicities to reason over.
     *
     * Checks:
     *   - invalid class names                     → CLASS_NAME_INVALID
     *   - attribute types missing                 → CLASS_ATTRIBUTE_TYPE_MISSING
     *   - attribute visibility missing            → CLASS_ATTRIBUTE_VISIBILITY
     *   - duplicate method signatures per class   → CLASS_DUPLICATE_METHOD
     *   - dangling relationship endpoints         → CLASS_RELATIONSHIP_DANGLING
     *   - circular inheritance                    → CLASS_INHERITANCE_CYCLE
     *   - realization targeting a non-interface   → CLASS_IMPLEMENTATION_TARGET_NOT_INTERFACE
     */
    static validateClassDiagramStructure(classDiagram, issues, analysis) {
        if (!classDiagram?.nodes?.length) return;

        const classNodes = (classDiagram.nodes || []).filter((n) => n.type === 'class' || n.type === 'interface');
        if (classNodes.length === 0) return;

        const nodesById = new Map(classNodes.map((n) => [n.id, n]));
        const labelOf = (id) => nodesById.get(id)?.data?.label || id;

        // ── Invalid class names ────────────────────────────────────────────
        classNodes.forEach((node) => {
            const label = (node.data?.label || '').trim();
            if (!label) return;
            if (!/^[A-Z][A-Za-z0-9_]*$/.test(label)) {
                issues.push({
                    type: 'class-diagram',
                    severity: 'warning',
                    code: 'CLASS_NAME_INVALID',
                    message: `Class name "${label}" is not a valid UML class name.`,
                    location: 'class-diagram',
                    context: {
                        suggestion: 'Use PascalCase with no spaces, starting with an uppercase letter (e.g., Order, Student, PaymentService).'
                    }
                });
            }
        });

        // ── Per-class attributes and methods ───────────────────────────────
        classNodes.forEach((node) => {
            const label = (node.data?.label || '').trim();
            if (!label) return;

            (node.data?.attributes || []).forEach((attrRaw) => {
                const attr = parseClassAttribute(attrRaw);
                if (!attr) return;
                if (!attr.type) {
                    issues.push({
                        type: 'class-diagram',
                        severity: 'warning',
                        code: 'CLASS_ATTRIBUTE_TYPE_MISSING',
                        message: `Attribute "${attr.name}" on class "${label}" has no declared type.`,
                        location: 'class-diagram',
                        context: { suggestion: `Declare a type, e.g. - ${attr.name}: String.` }
                    });
                }
                if (!attr.visibility) {
                    issues.push({
                        type: 'class-diagram',
                        severity: 'info',
                        code: 'CLASS_ATTRIBUTE_VISIBILITY',
                        message: `Attribute "${attr.name}" on class "${label}" has no visibility marker.`,
                        location: 'class-diagram',
                        context: {
                            suggestion: `Prepend a visibility marker: + public, - private, # protected, ~ package (e.g. - ${attr.name}: String).`
                        }
                    });
                }
            });

            const seen = new Set();
            (node.data?.methods || []).forEach((raw) => {
                const sig = parseMethodSignature(raw);
                if (!sig || !sig.name) return;
                const paramNames = (sig.parameters || []).map((p) => p.name).join(',');
                const key = `${sig.name.toLowerCase()}(${paramNames})`;
                if (seen.has(key)) {
                    issues.push({
                        type: 'class-diagram',
                        severity: 'warning',
                        code: 'CLASS_DUPLICATE_METHOD',
                        message: `Duplicate operation "${sig.name}(${paramNames})" on class "${label}".`,
                        location: 'class-diagram',
                        context: { suggestion: `Remove the duplicate operation; each class should declare each operation once.` }
                    });
                }
                seen.add(key);
            });
        });

        // ── Relationship edges ─────────────────────────────────────────────
        const edges = classDiagram.edges || [];
        const inheritance = [];

        edges.forEach((edge) => {
            const src = edge.source;
            const tgt = edge.target;
            const type = edge.data?.type || edge.type || 'association';

            if (!nodesById.has(src) || !nodesById.has(tgt)) {
                issues.push({
                    type: 'class-diagram',
                    severity: 'error',
                    code: 'CLASS_RELATIONSHIP_DANGLING',
                    message: `Relationship (${type}) references a class that no longer exists.`,
                    location: 'class-diagram',
                    context: { suggestion: 'Delete the orphaned relationship or reconnect it to existing classes.' }
                });
                return;
            }

            if (type === 'inheritance') {
                inheritance.push([src, tgt]);
                if (src === tgt) {
                    issues.push({
                        type: 'class-diagram',
                        severity: 'error',
                        code: 'CLASS_INHERITANCE_CYCLE',
                        message: `Circular inheritance: "${labelOf(src)}" inherits from itself.`,
                        location: 'class-diagram',
                        context: { suggestion: 'Remove the self-inheritance edge.' }
                    });
                }
            }

            if (type === 'implementation') {
                const tgtNode = nodesById.get(tgt);
                if (tgtNode.type !== 'interface') {
                    issues.push({
                        type: 'class-diagram',
                        severity: 'warning',
                        code: 'CLASS_IMPLEMENTATION_TARGET_NOT_INTERFACE',
                        message: `Implementation/realization edge targets "${labelOf(tgt)}", which is not an interface.`,
                        location: 'class-diagram',
                        context: {
                            suggestion: 'Point the realization arrow at an interface, or use inheritance for class-to-class specialization.'
                        }
                    });
                }
            }
        });

        this._emitInheritanceCycles(inheritance, nodesById, issues);
    }

    /**
     * Report circular inheritance. An edge src→tgt participates in a cycle
     * iff the target can reach the source via other inheritance edges.
     */
    static _emitInheritanceCycles(edges, nodesById, issues) {
        if (edges.length === 0) return;

        const graph = new Map();
        edges.forEach(([src, tgt]) => {
            if (!graph.has(src)) graph.set(src, []);
            graph.get(src).push(tgt);
        });

        const reaches = (from, target, visited) => {
            if (from === target) return true;
            if (visited.has(from)) return false;
            visited.add(from);
            for (const nbr of graph.get(from) || []) {
                if (reaches(nbr, target, visited)) return true;
            }
            return false;
        };

        const labelOf = (id) => nodesById.get(id)?.data?.label || id;
        const reported = new Set();

        edges.forEach(([src, tgt]) => {
            if (tgt === src) return; // self-inheritance reported separately
            if (reaches(tgt, src, new Set())) {
                const key = [src, tgt].sort().join('|');
                if (!reported.has(key)) {
                    reported.add(key);
                    issues.push({
                        type: 'class-diagram',
                        severity: 'error',
                        code: 'CLASS_INHERITANCE_CYCLE',
                        message: `Circular inheritance detected between "${labelOf(src)}" and "${labelOf(tgt)}".`,
                        location: 'class-diagram',
                        context: { suggestion: 'Break the cycle so each class has a single, acyclic inheritance chain.' }
                    });
                }
            }
        });
    }

    /**
     * SSD operation <-> Class operation full-signature validation (Phase 10).
     * For every SSD message this validates (in order):
     *   1. An appropriate class exists            → MISSING_CLASS
     *   2. The operation exists                    → MISSING_CLASS_OPERATION
     *   3. The operation is semantically equivalent → CLASS_OPERATION_SEMANTIC_MATCH
     *   4. Parameters are present & aligned        → CLASS_PARAMETER_MISMATCH
     *   5. Parameter types are declared             → CLASS_PARAMETER_TYPE_MISSING
     *   6. Return type is declared where required   → CLASS_RETURN_TYPE_MISSING
     *   7. Visibility is valid                      → CLASS_METHOD_VISIBILITY
     *   8. Parameter names are reasonable           → (baked into check 4)
     *
     * (Responsibility placement — check 9 — is delegated to
     * `validateSSDClassResponsibility`, which is a single general,
     * evidence-based rule, not a per-keyword special case.)
     *
     * Each issue carries a `context.result` label from the granular taxonomy:
     * PASS | STRONG_MATCH | PARTIAL_MATCH | MISSING_CLASS | MISSING_METHOD |
     * PARAMETER_MISMATCH | SEMANTIC_METHOD_MISMATCH | RESPONSIBILITY_WARNING
     */
    static validateSSDClassOperations(classDiagram, ssds, issues, analysis) {
        if (!ssds) return;

        const { classes, methods } = this.extractClassDiagramModel(classDiagram);
        const useCaseLabels = analysis.useCaseLabels || new Map();

        Object.entries(ssds).forEach(([ucId, rawSSD]) => {
            const { semanticData } = this.processSSDData(rawSSD);
            if (!semanticData?.messages?.length) return;
            const ucLabel = useCaseLabels.get(ucId) || ucId;

            semanticData.messages.forEach((msg) => {
                if (msg.isReturn) return;
                const msgName = (msg.name || '').trim();
                if (!msgName) return;
                const cleanMsg = msgName.split('(')[0].trim();
                if (!cleanMsg || cleanMsg.length <= 2) return;

                const semantic = semanticProcessor.processSSDMessage(msg, ucId);

                // Check 1 — an appropriate class exists.
                if (classes.length === 0) {
                    issues.push({
                        type: 'consistency',
                        severity: 'error',
                        code: 'MISSING_CLASS',
                        message: `SSD operation "${cleanMsg}()" in "${ucLabel}" has no corresponding class in the Class Diagram.`,
                        relatedId: ucId,
                        location: 'class-diagram',
                        context: {
                            result: 'MISSING_CLASS',
                            suggestion: `Add a class that owns this operation, e.g. ${cleanMsg.charAt(0).toUpperCase() + cleanMsg.slice(1)}Service.`
                        }
                    });
                    return;
                }

                // Checks 2 & 3 — the operation exists and is semantically equivalent.
                let best = null;
                methods.forEach((m) => {
                    const mSemantic = SemanticRepresentation.fromClassMethod(m);
                    if (!mSemantic) return;
                    const verdict = semanticProcessor.compareClassOperation(semantic, mSemantic);
                    if (!best || verdict.score > best.verdict.score) {
                        best = { method: m, semantic: mSemantic, verdict };
                    }
                });

                if (!best || best.verdict.score < 0.45) {
                    issues.push({
                        type: 'consistency',
                        severity: 'error',
                        code: 'MISSING_CLASS_OPERATION',
                        message: `SSD function "${msgName}" has no corresponding operation in the Class Diagram.`,
                        relatedId: ucId,
                        location: 'class-diagram',
                        context: {
                            result: 'MISSING_METHOD',
                            suggestion: `Add an operation such as + ${cleanMsg}(credentials) to the appropriate class.`,
                            confidence: best ? best.verdict.score : 0
                        }
                    });
                    return;
                }

                const { method, verdict } = best;
                const paramNames = (method.parameters || []).map((p) => p.name).join(', ');

                // Check 4 — parameters present & aligned (takes precedence over name nuance).
                if (!verdict.checks.parameters.matched) {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'CLASS_PARAMETER_MISMATCH',
                        message: `SSD operation "${msgName}" parameters do not match class operation "${method.className}.${method.name}(${paramNames})".`,
                        relatedId: ucId,
                        location: 'class-diagram',
                        context: {
                            result: 'PARAMETER_MISMATCH',
                            ssdParameters: semantic.parameters || [],
                            methodParameters: (method.parameters || []).map((p) => p.name),
                            reason: verdict.checks.parameters.reason,
                            suggestion: `Update "${method.className}.${method.name}" to accept the parameters used by the SSD message: ${(semantic.parameters || []).join(', ') || 'none'}.`
                        }
                    });
                } else if (verdict.result === 'SEMANTIC_METHOD_MISMATCH') {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'CLASS_OPERATION_SEMANTIC_MATCH',
                        message: `SSD message "${msgName}" partially matches operation "${method.className}.${method.name}()" (Confidence: ${(verdict.score * 100).toFixed(0)}%).`,
                        relatedId: ucId,
                        location: 'class-diagram',
                        context: {
                            result: 'SEMANTIC_METHOD_MISMATCH',
                            suggestion: `Consider renaming "${method.name}()" to "${cleanMsg}()" for exact alignment.`,
                            confidence: verdict.score
                        }
                    });
                }

                // Check 6 — return type defined where required.
                if (verdict.checks.returnType.required && !verdict.checks.returnType.present) {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'CLASS_RETURN_TYPE_MISSING',
                        message: `Operation "${method.className}.${method.name}()" performs "${cleanMsg}" but declares no return type.`,
                        relatedId: ucId,
                        location: 'class-diagram',
                        context: {
                            result: 'PARTIAL_MATCH',
                            suggestion: `Declare a return type, e.g. + ${method.name}(${paramNames}): Boolean.`
                        }
                    });
                }

                // Check 5 — parameter types declared where required.
                if (verdict.checks.paramTypes.missing.length > 0) {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'CLASS_PARAMETER_TYPE_MISSING',
                        message: `Parameters [${verdict.checks.paramTypes.missing.join(', ')}] on "${method.className}.${method.name}()" are missing explicit types.`,
                        relatedId: ucId,
                        location: 'class-diagram',
                        context: {
                            result: 'PARTIAL_MATCH',
                            suggestion: `Declare types for each parameter, e.g. + ${method.name}(${(method.parameters || []).map((p) => `${p.name}: String`).join(', ')}).`
                        }
                    });
                }

                // Check 7 — visibility valid for an actor-invoked operation.
                if (!verdict.checks.visibility.valid) {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'CLASS_METHOD_VISIBILITY',
                        message: `Operation "${method.className}.${method.name}()" is ${method.visibility === '-' ? 'private' : 'protected'}, but "${cleanMsg}()" is invoked by the actor.`,
                        relatedId: ucId,
                        location: 'class-diagram',
                        context: {
                            result: 'PARTIAL_MATCH',
                            suggestion: `Make "${method.name}()" public: + ${method.name}(${paramNames}).`
                        }
                    });
                }
            });
        });
    }

    /**
     * Derive evidence-based alternative responsibility homes from an operation's
     * object noun. Purely constructive — these are the classes a student might
     * reasonably create for that domain (Payment → Payment/PaymentService/...).
     */
    static _suggestResponsibilityClasses(noun) {
        const base = String(noun || '')
            .trim()
            .toLowerCase()
            .replace(/ies$/, 'y')
            .replace(/s$/, '');
        if (!base || base.length < 3) return [];
        const cap = base.charAt(0).toUpperCase() + base.slice(1);
        return [cap, `${cap}Service`, `${cap}Controller`, `${cap}Manager`];
    }

    /**
     * SSD <-> Class responsibility placement (Step 3 -> Step 4). GENERAL rule —
     * not hardcoded to any single domain (payment, auth, orders, ...).
     *
     * For each SSD operation:
     *   1. Extract the operation's object noun(s) from the function name.
     *   2. Find existing classes whose domain semantically matches that noun
     *      (evidence the operation has a more natural home).
     *   3. If the operation is owned by a class outside those candidates,
     *      surface an INFO/WARNING hint with evidence-based suggestions.
     *
     * Emits CLASS_RESPONSIBILITY_MISMATCH (info). Never escalates to error.
     */
    static validateSSDClassResponsibility(classDiagram, ssds, issues, analysis) {
        if (!classDiagram?.nodes?.length || !ssds) return;

        const { useCaseLabels } = analysis;
        const classes = (classDiagram.nodes || [])
            .filter((n) => n.type === 'class' || n.type === 'interface')
            .map((n) => ({ id: n.id, label: (n.data?.label || '').trim() }))
            .filter((c) => c.label);

        const classMethods = [];
        classes.forEach((cls) => {
            (classDiagram.nodes.find((n) => n.id === cls.id)?.data?.methods || []).forEach((raw) => {
                const signature = parseMethodSignature(raw);
                if (!signature || !signature.name) return;
                classMethods.push({
                    className: cls.label,
                    methodName: signature.name.toLowerCase(),
                    name: signature.name
                });
            });
        });

        Object.entries(ssds).forEach(([ucId, rawSSD]) => {
            const { semanticData } = this.processSSDData(rawSSD);
            if (!semanticData?.messages?.length) return;
            const ucLabel = useCaseLabels.get(ucId) || ucId;

            semanticData.messages.forEach((msg) => {
                if (msg.isReturn) return;
                const msgName = (msg.name || '').trim();
                if (!msgName) return;
                const cleanMsg = msgName.split('(')[0].trim();
                if (!cleanMsg || cleanMsg.length <= 2) return;

                // Object noun(s) of the operation: function-name tokens minus the verb.
                const funcTokens = cleanMsg
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .toLowerCase()
                    .split(/\s+/)
                    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
                    .map(lemmatizeToken);
                const verb = funcTokens[0] || null;
                const nouns = funcTokens.slice(1).filter((n) => n !== verb);
                if (nouns.length === 0) return;

                // Evidence: existing classes whose domain matches the object noun(s).
                const candidateClasses = classes.filter((cls) => {
                    const clsLower = cls.label.toLowerCase();
                    return nouns.some((noun) => this.fuzzyIncludes(clsLower, noun));
                });
                if (candidateClasses.length === 0) return;

                // Which class currently owns the best-matching operation?
                let bestOwner = null;
                let bestScore = 0;
                classMethods.forEach((m) => {
                    const evalRes = evaluateFunctionMatch(cleanMsg, m.methodName);
                    if (evalRes.score > bestScore) {
                        bestScore = evalRes.score;
                        bestOwner = m.className;
                    }
                });

                if (!bestOwner || bestScore < 0.45) return;

                const isInCandidate = candidateClasses.some((c) => c.label.toLowerCase() === bestOwner.toLowerCase());
                if (!isInCandidate) {
                    const suggestedClass = candidateClasses[0].label;
                    const noun = nouns[0];
                    // Evidence-based possible homes: existing candidates first,
                    // then derived alternatives — never the current owner.
                    const suggestedClasses = [];
                    const seen = new Set();
                    candidateClasses.forEach((c) => {
                        if (c.label.toLowerCase() !== bestOwner.toLowerCase() && !seen.has(c.label.toLowerCase())) {
                            seen.add(c.label.toLowerCase());
                            suggestedClasses.push(c.label);
                        }
                    });
                    this._suggestResponsibilityClasses(noun).forEach((alt) => {
                        const key = alt.toLowerCase();
                        if (key !== bestOwner.toLowerCase() && !seen.has(key)) {
                            seen.add(key);
                            suggestedClasses.push(alt);
                        }
                    });

                    issues.push({
                        type: 'consistency',
                        severity: 'info',
                        code: 'CLASS_RESPONSIBILITY_MISMATCH',
                        message: `Operation "${cleanMsg}()" in "${ucLabel}" is owned by "${bestOwner}", but semantically relates to class "${suggestedClass}".`,
                        relatedId: ucId,
                        location: 'class-diagram',
                        context: {
                            result: 'RESPONSIBILITY_WARNING',
                            ssdOperation: cleanMsg,
                            ownerClass: bestOwner,
                            objectNoun: noun,
                            suggestedClasses,
                            suggestion: `Consider moving "${cleanMsg}()" to "${suggestedClass}" for stronger domain alignment.`
                        }
                    });
                }
            });
        });
    }

    static processSequenceData(seqData) {
        if (!seqData) return { semanticData: null, diagramData: null };

        let rawData = seqData;
        if (typeof seqData === 'string') {
            try { rawData = JSON.parse(seqData); } catch (e) {
                return { semanticData: null, diagramData: null };
            }
        }

        let semanticData = rawData.semanticData;
        let diagramData = rawData.diagramData || null;

        // Support direct semantic structure { lifelines: [...], messages: [...] }
        if (!semanticData && (rawData.lifelines || rawData.messages)) {
            semanticData = rawData;
        }

        if (!semanticData && (rawData.nodes || rawData.edges)) {
            diagramData = { nodes: rawData.nodes, edges: rawData.edges };
        }

        if (!semanticData && diagramData) {
            semanticData = this.convertSequenceToSemantic(diagramData);
        }

        return { semanticData, diagramData };
    }

    static convertSequenceToSemantic(diagramData) {
        try {
            const lifelines = (diagramData.nodes || []).map((node) => ({
                id: node.id,
                label: node.data?.label || node.data?.name || 'Unknown',
                type: node.data?.isActor || node.type === 'actor' ? 'actor' : 'object'
            }));

            const messages = (diagramData.edges || []).map((edge, index) => {
                const msgType = edge.data?.type || edge.data?.messageType || 'sync';
                const isReturn = msgType === 'reply' || msgType === 'return' || !!edge.data?.isReturn;
                const name = edge.data?.label || edge.data?.text || edge.data?.name || edge.label || '';
                return {
                    id: edge.id,
                    order: index + 1,
                    fromLifelineId: edge.source || edge.data?.fromLifelineId,
                    toLifelineId: edge.target || edge.data?.toLifelineId,
                    name,
                    type: isReturn ? 'return' : (msgType === 'async' ? 'asynchronous' : 'synchronous'),
                    isReturn
                };
            });

            return { lifelines, messages };
        } catch (error) {
            console.error('Error converting sequence diagram:', error);
            return { lifelines: [], messages: [] };
        }
    }

    static validateSequenceDiagrams(sequenceDiagrams, issues, analysis, descriptions, ssds, classDiagram, targetId = null) {
        if (!sequenceDiagrams) return;

        const { useCases, useCaseLabels } = analysis;
        const classModel = this.extractClassDiagramModel(classDiagram);

        useCases.forEach((uc) => {
            const ucId = uc.id;
            if (targetId && ucId !== targetId) return;

            const ucName = this.getUseCaseName(ucId, useCaseLabels, descriptions);
            const desc = (descriptions || {})[ucId];
            const rawSeq = sequenceDiagrams[ucId];

            if (!rawSeq) {
                if (desc) {
                    issues.push({
                        type: 'sequence-diagram',
                        severity: 'error',
                        code: 'SEQUENCE_DIAGRAM_MISSING',
                        message: `Sequence Diagram for "${ucName}" is missing.`,
                        relatedId: ucId,
                        location: 'sequence-diagram'
                    });
                }
                return;
            }

            const { semanticData } = this.processSequenceData(rawSeq);
            if (!semanticData?.lifelines?.length) {
                issues.push({
                    type: 'sequence-diagram',
                    severity: 'error',
                    code: 'SEQUENCE_DIAGRAM_EMPTY',
                    message: `Sequence Diagram for "${ucName}" is empty.`,
                    relatedId: ucId,
                    location: 'sequence-diagram'
                });
                return;
            }

            if (semanticData.lifelines.length < 2) {
                issues.push({
                    type: 'sequence-diagram',
                    severity: 'error',
                    code: 'SEQUENCE_INCOMPLETE',
                    message: `Sequence Diagram for "${ucName}" needs at least two lifelines.`,
                    relatedId: ucId,
                    location: 'sequence-diagram'
                });
            }

            if (!semanticData.messages?.length) {
                issues.push({
                    type: 'sequence-diagram',
                    severity: 'error',
                    code: 'SEQUENCE_NO_MESSAGES',
                    message: `Sequence Diagram for "${ucName}" has no messages.`,
                    relatedId: ucId,
                    location: 'sequence-diagram'
                });
            }

            const lifelineMap = new Map(semanticData.lifelines.map((l) => [l.id, l]));
            semanticData.lifelines.forEach((ll) => {
                if (ll.type === 'actor') return;
                const className = this.parseLifelineClassName(ll.label);
                const matched = classModel.classes.some((c) => this.fuzzyIncludes(c.label, className));
                if (!matched && className && className.toLowerCase() !== 'unknown') {
                    issues.push({
                        type: 'consistency',
                        severity: 'error',
                        code: 'SEQUENCE_OBJECT_NOT_DEFINED',
                        message: `Lifeline object "${ll.label}" in Sequence Diagram is not defined in the Class Diagram.`,
                        relatedId: ucId,
                        location: 'sequence-diagram',
                        context: { suggestion: `Define class "${className}" in the Class Diagram (Step 4) or update lifeline label.` }
                    });
                }
            });

            semanticData.messages.forEach((msg) => {
                const msgName = (msg.name || '').trim();
                if (!msgName) return;
                const cleanMsg = msgName.split('(')[0].trim();
                const sender = lifelineMap.get(msg.fromLifelineId);
                const receiver = lifelineMap.get(msg.toLifelineId);

                let inClass = false;
                if (classModel.methods.length > 0) {
                    inClass = classModel.methods.some((m) => evaluateFunctionMatch(cleanMsg, m.methodName).score >= 0.45);
                }

                if (!inClass && classModel.methods.length > 0) {
                    issues.push({
                        type: 'consistency',
                        severity: 'error',
                        code: 'SEQUENCE_OPERATION_NOT_DEFINED',
                        message: `Sequence message "${msgName}" is not defined as an operation on any class in the Class Diagram.`,
                        relatedId: ucId,
                        location: 'sequence-diagram',
                        context: { suggestion: `Add operation + ${cleanMsg}() to the appropriate class in Step 4.` }
                    });
                }
            });

            const ssdRaw = (ssds || {})[ucId];
            if (ssdRaw) {
                const { semanticData: ssdSemantic } = this.processSSDData(ssdRaw);
                if (ssdSemantic?.messages?.length && semanticData.messages?.length) {
                    ssdSemantic.messages.filter((m) => !m.isReturn).forEach((ssdMsg) => {
                        const ssdClean = (ssdMsg.name || '').split('(')[0].trim();
                        const found = semanticData.messages.some((m) => {
                            const mClean = (m.name || '').split('(')[0].trim();
                            return evaluateFunctionMatch(ssdClean, mClean).score >= 0.45;
                        });
                        if (!found && ssdClean.length > 2) {
                            issues.push({
                                type: 'consistency',
                                severity: 'error',
                                code: 'SEQUENCE_MISSING_SSD_MESSAGE',
                                message: `SSD message "${ssdMsg.name}" is not reflected in Sequence Diagram for "${ucName}".`,
                                relatedId: ucId,
                                location: 'sequence-diagram',
                                context: { suggestion: `Add "${ssdMsg.name}" to the sequence diagram (Step 5).` }
                            });
                        }
                    });
                }
            }

            // ── Phase 14 structural checks (data-supported by the editor model) ──
            // Duplicate lifelines: same participant drawn twice in one interaction.
            const seenLifelines = new Map();
            semanticData.lifelines.forEach((ll) => {
                const norm = (ll.label || '').trim().toLowerCase().replace(/\s+/g, ' ');
                if (!norm) return;
                if (seenLifelines.has(norm)) {
                    issues.push({
                        type: 'sequence-diagram',
                        severity: 'warning',
                        code: 'SEQUENCE_DUPLICATE_LIFELINE',
                        message: `Duplicate lifeline "${ll.label}" in Sequence Diagram for "${ucName}".`,
                        relatedId: ucId,
                        location: 'sequence-diagram',
                        context: { suggestion: 'Remove the duplicate lifeline; a participant should appear only once per interaction.' }
                    });
                } else {
                    seenLifelines.set(norm, ll.id);
                }
            });

            // Duplicate messages: identical message (same name, sender and receiver) sent more than once.
            // Parameterized variants and messages to different receivers are NOT flagged.
            const seenMessages = new Map();
            semanticData.messages.forEach((msg) => {
                const name = (msg.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!name) return;
                const key = `${name}|${msg.fromLifelineId}|${msg.toLifelineId}`;
                if (seenMessages.has(key)) {
                    issues.push({
                        type: 'sequence-diagram',
                        severity: 'warning',
                        code: 'SEQUENCE_DUPLICATE_MESSAGE',
                        message: `Duplicate message "${msg.name}" in Sequence Diagram for "${ucName}".`,
                        relatedId: ucId,
                        location: 'sequence-diagram',
                        context: { suggestion: 'Remove the duplicated message or differentiate its parameters.' }
                    });
                } else {
                    seenMessages.set(key, msg.id);
                }
            });

            // Dangling endpoints: a message references a lifeline that does not exist.
            semanticData.messages.forEach((msg) => {
                if (!lifelineMap.has(msg.fromLifelineId) || !lifelineMap.has(msg.toLifelineId)) {
                    issues.push({
                        type: 'sequence-diagram',
                        severity: 'error',
                        code: 'SEQUENCE_MESSAGE_DANGLING_LIFELINE',
                        message: `Sequence message "${msg.name}" references a lifeline that does not exist in the diagram for "${ucName}".`,
                        relatedId: ucId,
                        location: 'sequence-diagram',
                        context: { suggestion: 'Reconnect the message to an existing lifeline or add the missing participant.' }
                    });
                }
            });

            if (desc && semanticData.messages) {
                this.validateSequenceInteractionFlow(semanticData, desc, ucId, ucName, issues, analysis);
            }
        });
    }

    static validateSequenceInteractionFlow(seq, desc, ucId, ucName, issues, analysis) {
        const messages = [...(seq.messages || [])].sort((a, b) => a.order - b.order);
        const steps = desc.mainFlow || [];
        const lifelines = seq.lifelines || [];
        const lifelineMap = new Map(lifelines.map((l) => [l.id, l]));

        const sortedUCs = [...(analysis.useCases || [])].sort((a, b) => {
            const posA = a.position || { x: 0, y: 0 };
            const posB = b.position || { x: 0, y: 0 };
            return (posA.y - posB.y) || (posA.x - posB.x);
        });
        const ucIndex = sortedUCs.findIndex((uc) => uc.id === ucId);
        const displayNum = ucIndex !== -1 ? (ucIndex + 1) : (ucId.split('-').pop());
        const mappingRef = `Description 2.${displayNum}`;

        const matchedMessages = new Set();
        let expectedMessageIdx = 0;

        steps.forEach((step, stepIdx) => {
            const stepNo = stepIdx + 1;
            const stepTextOrig = step.action || (typeof step === 'string' ? step : '');
            if (!stepTextOrig || stepTextOrig.toLowerCase().startsWith('if') || stepTextOrig.toLowerCase().startsWith('else')) return;

            const parsedStep = parseScenarioStep(stepTextOrig);
            let matchedMsgIdx = -1;

            for (let offset = 0; offset < messages.length; offset++) {
                const i = (expectedMessageIdx + offset) % messages.length;
                if (matchedMessages.has(i)) continue;
                const msg = messages[i];
                const msgClean = (msg.name || '').split('(')[0].trim();
                if (!msgClean) continue;

                const matchEval = evaluateFunctionMatch(parsedStep.messageName, msgClean);
                if (matchEval.score >= 0.4 || fuzzyMatch(stepTextOrig, msgClean)) {
                    matchedMsgIdx = i;
                    break;
                }
            }

            if (matchedMsgIdx !== -1) {
                matchedMessages.add(matchedMsgIdx);
                expectedMessageIdx = Math.max(expectedMessageIdx, matchedMsgIdx + 1);
                const msg = messages[matchedMsgIdx];
                const sender = lifelineMap.get(msg.fromLifelineId);

                if (desc.primaryActor && sender?.type === 'actor') {
                    const senderLabelLower = (sender.label || '').trim().toLowerCase();
                    const descActorLower = (desc.primaryActor || '').trim().toLowerCase();
                    if (senderLabelLower !== descActorLower && !senderLabelLower.includes(descActorLower)) {
                        issues.push({
                            type: 'consistency',
                            severity: 'error',
                            code: 'SEQ_CONSISTENCY_ACTOR_MISMATCH',
                            message: `Sequence 5.${displayNum}: first actor lifeline "${sender.label}" does not match ${mappingRef} primary actor "${desc.primaryActor}".`,
                            relatedId: ucId,
                            location: 'sequence-diagram'
                        });
                    }
                }
            } else {
                const sg = suggestFromSentence(stepTextOrig);
                issues.push({
                    type: 'consistency',
                    severity: 'error',
                    code: 'SEQ_CONSISTENCY_MISSING_MESSAGE',
                    message: `Missing sequence message for Step ${stepNo} in "${ucName}".`,
                    relatedId: ucId,
                    location: 'sequence-diagram',
                    context: {
                        stepNumber: `${stepNo}`,
                        problem: `Step ${stepNo} has no mapped message in Sequence Diagram 5.${displayNum}.`,
                        suggestion: `Add "${sg.nearestFunctionWithParam}" to the sequence diagram.`,
                        suggestions: sg
                    }
                });
            }
        });

        messages.forEach((msg, msgIdx) => {
            if (matchedMessages.has(msgIdx) || !(msg.name || '').trim()) return;

            const sender = lifelineMap.get(msg.fromLifelineId);
            const receiver = lifelineMap.get(msg.toLifelineId);

            // SECTION 11 & 12: Internal implementation calls between objects are VALID decomposition
            const isInternalCall = sender?.type !== 'actor' && receiver?.type !== 'actor';
            if (isInternalCall) {
                // Classified as INTERNAL_IMPLEMENTATION_CALL -> DO NOT report error!
                return;
            }

            issues.push({
                type: 'consistency',
                severity: 'warning',
                code: 'SEQ_CONSISTENCY_EXTRA_MESSAGE',
                message: `Extra sequence message "${msg.name}" in "${ucName}" is not directly mapped to the Main Success Scenario steps.`,
                relatedId: ucId,
                location: 'sequence-diagram'
            });
        });
    }

    /**
     * Sequence <-> Class receiver ownership semantics (Step 5 -> Step 4).
     * For each non-return message targeting an object lifeline, the operation
     * should be owned by the class that the receiver lifeline maps to.
     */
    static validateSequenceClassOwnership(sequenceDiagrams, classDiagram, issues, analysis) {
        if (!sequenceDiagrams || !classDiagram?.nodes?.length) return;

        const { useCases, useCaseLabels } = analysis;
        const classModel = this.extractClassDiagramModel(classDiagram);
        if (classModel.methods.length === 0) return;

        useCases.forEach((uc) => {
            const rawSeq = sequenceDiagrams[uc.id];
            if (!rawSeq) return;

            const { semanticData } = this.processSequenceData(rawSeq);
            if (!semanticData?.lifelines?.length || !semanticData?.messages?.length) return;

            const ucName = this.getUseCaseName(uc.id, useCaseLabels);
            const lifelineMap = new Map(semanticData.lifelines.map((l) => [l.id, l]));

            semanticData.messages.forEach((msg) => {
                if (msg.isReturn) return;
                const msgName = (msg.name || '').trim();
                if (!msgName) return;

                const receiver = lifelineMap.get(msg.toLifelineId);
                if (!receiver || receiver.type === 'actor') return;

                const receiverClassName = this.parseLifelineClassName(receiver.label);
                if (!receiverClassName || receiverClassName.toLowerCase() === 'unknown') return;

                const cleanMsg = msgName.split('(')[0].trim();
                if (!cleanMsg || cleanMsg.length <= 2) return;

                // Find the best-matching class operation for this message
                let bestMethod = null;
                let bestScore = 0;
                classModel.methods.forEach((m) => {
                    const evalRes = evaluateFunctionMatch(cleanMsg, m.methodName);
                    if (evalRes.score > bestScore) {
                        bestScore = evalRes.score;
                        bestMethod = m;
                    }
                });

                if (!bestMethod || bestScore < 0.45) return;

                // Does the receiver class semantically match the operation's owner?
                const receiverLower = receiverClassName.toLowerCase();
                const ownerLower = bestMethod.className.toLowerCase();
                const semanticallyOwned = receiverLower === ownerLower ||
                    this.fuzzyIncludes(receiverClassName, bestMethod.className);

                if (!semanticallyOwned) {
                    issues.push({
                        type: 'consistency',
                        severity: 'warning',
                        code: 'SEQUENCE_OPERATION_RECEIVER_MISMATCH',
                        message: `Sequence message "${msgName}" in "${ucName}" targets lifeline "${receiver.label}", but the matching operation "${bestMethod.methodName}()" is owned by class "${bestMethod.className}".`,
                        relatedId: uc.id,
                        location: 'sequence-diagram',
                        context: {
                            suggestion: `Move "${cleanMsg}()" to "${receiverClassName}" or change the message receiver to "${bestMethod.className}".`,
                            confidence: bestScore
                        }
                    });
                }
            });
        });
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

                const rawFrom = edge.data?.fromLifelineId || edge.source || '';
                const rawTo = edge.data?.toLifelineId || edge.target || '';
                const rawLabel = edge.label || edge.data?.text || edge.data?.label || '';

                return {
                    id: edge.id,
                    order: index + 1,
                    fromLifelineId: (rawFrom || '').replace(/^lifeline-/, ''),
                    toLifelineId: (rawTo || '').replace(/^lifeline-/, ''),
                    name: rawLabel,
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
