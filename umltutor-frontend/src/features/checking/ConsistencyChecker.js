import { STOP_WORDS, VERB_DICTIONARY } from './grammarRules';
import { normalizeName } from '../../nlp/similarity';

/**
 * Consistency Checking Engine — Keyword-based matching between
 * Use Case Description (Main Success Scenario) and System Sequence Diagram.
 *
 * FALLBACK-ONLY - NOT authoritative.
 * The backend `/api/check` + `/api/submissions/:id/run-check` report is the
 * authoritative consistency source (it runs the full rule engine, emitting
 * the UCD-, SSD-, MAP-, CD- and SEQ- prefixed rule codes). This local engine
 * exists solely as a no-backend fallback for tutorial and read-only preview
 * modes, where the backend report is unavailable. Do not use its
 * CONSISTENCY_* verdicts for grading or scoring.
 */

// ─── Sentence Parser ──────────────────────────────────────────────────────────
export const parseScenarioStep = (stepText, availableActors = []) => {
    if (!stepText || stepText.trim().length === 0) return null;

    const rawWords = stepText.trim().split(/\s+/);
    const words = rawWords.map(w => w.replace(/[.,!?;:]/g, ''));

    let actor = '';
    let actorIndex = -1;

    // 1. Actor Detection — first word is checked against known actors and verbs
    const lowerVerbs = VERB_DICTIONARY.map(v => v.toLowerCase());
    for (let i = 0; i < Math.min(words.length, 2); i++) {
        const wordLower = words[i].toLowerCase();
        if (STOP_WORDS.includes(wordLower)) continue;

        // Check if this is a known actor
        const matchingActor = availableActors.find(a => a.toLowerCase().trim() === wordLower);
        if (matchingActor) {
            actor = matchingActor.trim();
            actorIndex = i;
            break;
        }

        // "System" is always treated as the system actor
        if (wordLower === 'system') {
            actor = 'System';
            actorIndex = i;
            break;
        }

        // If the first word looks like a verb, it probably isn't an actor
        const looksLikeVerb = lowerVerbs.includes(wordLower) || wordLower.endsWith('s') || wordLower.endsWith('ed') || wordLower.endsWith('ing');
        if (i === 0 && looksLikeVerb) {
            actor = '';
            actorIndex = -1;
            break;
        }

        // If not a verb and not a known actor, treat as unknown actor word
        if (!actor && i === 0) {
            actor = words[i];
            actorIndex = i;
            break;
        }
    }

    // 2. Extract remaining words (the action)
    let remainingWords = actorIndex === -1 ? words : words.slice(actorIndex + 1);
    const lowerRemaining = remainingWords.map(w => w.toLowerCase());
    if (lowerRemaining.length === 0) return null;

    // 3. Determine if this is a return/response step
    const isSystemActor = actor.toLowerCase() === 'system';
    const returnKeywords = ['return', 'returns', 'show', 'shows', 'display', 'displays',
        'respond', 'responds', 'provide', 'provides', 'confirm', 'confirms',
        'present', 'presents', 'notify', 'notifies', 'send', 'sends',
        'generate', 'generates', 'output', 'outputs'];
    const isReturn = isSystemActor || lowerRemaining.some(w => returnKeywords.includes(w));

    // 4. Extract meaningful words (strip stop words)
    const meaningfulWords = lowerRemaining
        .map(w => w.replace(/[^a-z0-9]/g, ''))
        .filter(w => w.length > 1 && !STOP_WORDS.includes(w));

    if (meaningfulWords.length === 0) return null;

    // 5. Build message name
    let verb = meaningfulWords[0];
    // Normalize verb (remove trailing 's'/'es')
    if (verb.endsWith('es') && !['process', 'guess', 'pass'].includes(verb)) {
        verb = verb.slice(0, -2);
    } else if (verb.endsWith('s') && !['is', 'has', 'pays'].includes(verb)) {
        verb = verb.slice(0, -1);
    }

    const objects = meaningfulWords.slice(1);
    const messageName = verb + objects.map(o => o.charAt(0).toUpperCase() + o.slice(1)).join('');

    // 6. Build keywords for matching (all meaningful content words)
    const keywords = meaningfulWords.map(w => w.toLowerCase());

    return {
        actor: actor.trim(),
        isReturn,
        messageName,
        keywords,
        parameters: [],
        fullExpected: `${messageName}()`
    };
};

// ─── SSD Message Parser ───────────────────────────────────────────────────────
export const parseSSDMessage = (messageText) => {
    if (!messageText) return null;
    const regex = /^([a-zA-Z0-9_]+)\s*(?:\((.*)?\))?$/;
    const match = messageText.trim().match(regex);
    if (!match) return { messageName: messageText.trim(), parameters: [] };
    const messageName = match[1];
    const paramsString = match[2] || '';
    const parameters = paramsString.split(',').map(p => p.trim()).filter(p => p.length > 0);
    return { messageName, parameters };
};

// ─── Keyword Extraction from SSD message text ─────────────────────────────────
const extractKeywords = (text) => {
    if (!text) return [];
    return text
        .replace(/[()]/g, ' ')             // strip parens
        .split(/(?=[A-Z])|_|\s+/)            // split on camelCase, underscore, or spaces
        .map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(w => w.length > 1 && !STOP_WORDS.includes(w));
};

// ─── Keyword Match Scoring ────────────────────────────────────────────────────
const scoreKeywordMatch = (stepKeywords, msgKeywords) => {
    if (stepKeywords.length === 0 || msgKeywords.length === 0) return 0;

    let matchCount = 0;
    for (const sw of stepKeywords) {
        for (const mw of msgKeywords) {
            // Fuzzy: substring containment in either direction
            if (sw.includes(mw) || mw.includes(sw)) {
                matchCount++;
                break; // count each step keyword at most once
            }
        }
    }

    return matchCount / stepKeywords.length; // ratio 0..1
};

// ─── Main Consistency Checker ─────────────────────────────────────────────────
// FALLBACK-ONLY: local keyword-matching verdicts for tutorial/preview modes.
// The backend run-check report is authoritative for grading and scoring.
export const checkConsistency = (scenarioSteps, ssdMessages, actors = [], primaryActor = '') => {
    const results = [];

    // Parse all scenario steps
    const parsedSteps = scenarioSteps.map((step, i) => ({
        index: i,
        raw: step.action || '',
        parsed: parseScenarioStep(step.action, actors)
    }));

    // Extract keywords from all SSD messages
    const parsedMessages = ssdMessages.map((msg, i) => ({
        index: i,
        raw: msg.text || msg.name || msg.label || '',
        keywords: extractKeywords(msg.text || msg.name || msg.label || ''),
        senderLabel: msg.senderLabel || '',
        senderType: msg.senderType || '',
        isReturn: !!msg.isReturn,
        id: msg.id
    }));

    // ─── Actor Consistency Check (Use Case Diagram ↔ SSD) ────────────────────
    // Check if SSD actor lifeline matches an actor from the Use Case Diagram
    if (actors.length > 0 && parsedMessages.length > 0) {
        // Find the first non-return message to identify the actor used in SSD
        const firstActorMsg = parsedMessages.find(m => !m.isReturn && m.senderLabel);
        if (firstActorMsg) {
            const ssdActorLabel = firstActorMsg.senderLabel.trim().toLowerCase();
            const isActorInDiagram = actors.some(a => a.trim().toLowerCase() === ssdActorLabel);
            const isSystem = ssdActorLabel === 'system' || (firstActorMsg.senderType || '').toLowerCase() === 'system';

            if (!isActorInDiagram && !isSystem) {
                results.push({
                    type: 'error',
                    severity: 'error',
                    category: 'CONSISTENCY_ACTOR_DIAGRAM_MISMATCH',
                    message: 'Actor Mismatch',
                    stepNumber: 1,
                    problem: `Actor mismatch: The actor "${firstActorMsg.senderLabel}" used in the System Sequence Diagram does not match any actor defined in the Use Case Diagram.`,
                    suggestion: `Change the actor lifeline to match one of the actors in the Use Case Diagram: ${actors.join(', ')}.`
                });
            }
        }
    }

    // ─── Keyword-Based Matching (Step → Message) ─────────────────────────────
    const MATCH_THRESHOLD = 0.5;         // ≥50% keyword overlap = matched
    const PARTIAL_THRESHOLD = 0.25;      // ≥25% = partially matched
    const matchedMsgIndices = new Set();

    parsedSteps.forEach(({ index: stepIdx, raw, parsed }) => {
        if (!parsed) return; // skip unparseable steps (empty, conditionals)
        if (!raw || raw.toLowerCase().startsWith('if') || raw.toLowerCase().startsWith('else')) return;

        const stepNo = stepIdx + 1;
        const stepKeywords = parsed.keywords;

        // Find best matching SSD message by keyword overlap
        let bestScore = 0;
        let bestMsgIdx = -1;

        parsedMessages.forEach((msg, msgIdx) => {
            if (matchedMsgIndices.has(msgIdx)) return; // already claimed
            const score = scoreKeywordMatch(stepKeywords, msg.keywords);
            if (score > bestScore) {
                bestScore = score;
                bestMsgIdx = msgIdx;
            }
        });

        if (bestMsgIdx !== -1 && bestScore >= MATCH_THRESHOLD) {
            // ✔ Matched
            matchedMsgIndices.add(bestMsgIdx);
            const msg = parsedMessages[bestMsgIdx];

            // Additional: validate sender correctness
            if (msg.senderLabel) {
                const sLabel = msg.senderLabel.trim().toLowerCase();
                const isSystemSender = (msg.senderType || '').toLowerCase() === 'system' || sLabel === 'system';

                if (parsed.isReturn && !isSystemSender) {
                    results.push({
                        type: 'error',
                        severity: 'error',
                        category: 'CONSISTENCY_ACTOR_MISMATCH',
                        message: 'Source Lifeline Mismatch',
                        stepNumber: stepNo,
                        problem: `Step ${stepNo} describes a System response, but message "${msg.raw}" starts from "${msg.senderLabel}".`,
                        suggestion: `Change the source lifeline to "System".`,
                        matchStatus: 'matched'
                    });
                } else if (!parsed.isReturn && isSystemSender) {
                    results.push({
                        type: 'error',
                        severity: 'error',
                        category: 'CONSISTENCY_ACTOR_MISMATCH',
                        message: 'Source Lifeline Mismatch',
                        stepNumber: stepNo,
                        problem: `Step ${stepNo} describes an actor action, but message "${msg.raw}" starts from "System".`,
                        suggestion: `Change the source lifeline to "${primaryActor || parsed.actor || 'Actor'}".`,
                        matchStatus: 'matched'
                    });
                }
            }

            // Check if message has a meaningful name
            const mName = (msg.raw || '').trim();
            if (!mName || mName.toLowerCase() === 'operation') {
                results.push({
                    type: 'error',
                    severity: 'error',
                    category: 'CONSISTENCY_DEFAULT_NAME',
                    message: !mName ? 'Missing Message Name' : 'Default Message Name',
                    stepNumber: stepNo,
                    problem: !mName
                        ? `The message at step ${stepNo} does not have a name.`
                        : `The message at step ${stepNo} still has the default name "operation".`,
                    suggestion: `Rename it to reflect the action (e.g., "${parsed.messageName}").`,
                    matchStatus: 'matched'
                });
            }
        } else if (bestMsgIdx !== -1 && bestScore >= PARTIAL_THRESHOLD) {
            // ⚠ Partially matched
            matchedMsgIndices.add(bestMsgIdx);
            const msg = parsedMessages[bestMsgIdx];

            results.push({
                type: 'warning',
                severity: 'warning',
                category: 'CONSISTENCY_NAME_GUIDANCE',
                message: 'Partial Match — Message Name Guidance',
                stepNumber: stepNo,
                problem: `Step ${stepNo} ("${raw.substring(0, 60)}") partially matches message "${msg.raw}" but the name does not closely match the scenario action.`,
                suggestion: `Consider renaming to "${parsed.messageName}" for better consistency.`,
                matchStatus: 'partial'
            });
        } else {
            // ❌ Missing
            const displayActor = parsed.isReturn ? 'System' : (primaryActor || parsed.actor || 'Actor');
            results.push({
                type: 'error',
                severity: 'error',
                category: parsed.isReturn ? 'CONSISTENCY_MISSING_RETURN' : 'CONSISTENCY_MISSING_MESSAGE',
                message: parsed.isReturn ? 'Missing Return Message' : 'Missing SSD Message',
                stepNumber: stepNo,
                problem: `This step from the Use Case Description is not represented in the System Sequence Diagram.`,
                suggestion: parsed.isReturn
                    ? `Add a return message (dashed line) from System to ${displayActor}. Example: ${parsed.fullExpected}`
                    : `Add a message (solid line) from ${displayActor} to the System. Example: ${parsed.fullExpected}`,
                matchStatus: 'missing',
                parsedMessage: parsed.messageName
            });
        }
    });

    // ─── Extra SSD Messages (not matched to any step) ────────────────────────
    parsedMessages.forEach((msg, msgIdx) => {
        if (matchedMsgIndices.has(msgIdx)) return;
        if (!msg.raw) return;

        results.push({
            type: 'error',
            severity: 'error',
            category: 'CONSISTENCY_EXTRA_MESSAGE',
            message: 'Extra SSD Message',
            stepNumber: '?',
            problem: `Message "${msg.raw}" in the SSD does not correspond to any step in the Main Success Scenario.`,
            suggestion: `Remove this message or update the scenario to include this interaction.`,
            messageId: msg.id,
            matchStatus: 'extra'
        });
    });

    return results;
};
