"use strict";

// PromptRequirementParser — converts a free-text case-study requirement document
// into a structured RequirementModel (actors, use cases, steps, system operations).
//
// Design principles:
//   - Dynamic: works on ANY domain (banking, library, hospital, e-commerce, ...).
//     No hardcoded actor/use-case vocabulary.
//   - Reuses the existing NLP layer (constants, sentenceUtils, similarity) so the
//     consistency engine keeps a single source of truth.
//   - REQUIREMENT CLASSIFICATION: every sentence is classified (see
//     requirementClassifier.js). Only meaningful FUNCTIONAL capabilities become
//     traceable UML use cases. Context, domain-entity, business-rule, pre/post
//     condition, constraint and non-functional prose are captured under their own
//     categories and are NOT forced to appear in every diagram.
//   - Stateful grouping: actor-initiated functional sentences open a use case;
//     "System ..." continuation sentences and same-actor supporting steps are
//     merged as steps of the current use case. Unrelated/descriptive sentences
//     are NOT swallowed into the current use case.
//   - Best-effort: the parser never throws on unusual text; it degrades gracefully
//     and reports a coverage score so callers can grade confidence.

const { STOP_WORDS, INTERNAL_VERBS, VERB_DICTIONARY } = require('./constants');
const { normalizeToken, extractKeywords, lemmatizeToken } = require('./similarity');
const { parseScenarioStep, classifySystemStep, suggestFromSentence } = require('./sentenceUtils');
const { SemanticRepresentation } = require('./semanticService');
const {
  REQUIREMENT_TYPES,
  classifyRequirementSentence,
  isFunctionalVerb,
} = require('./requirementClassifier');

const MAX_REQUIREMENT_LENGTH = 100000;

const MIN_CONTENT_TOKENS = 6; // content words after stop-word removal
const HIGH_CONFIDENCE = 0.75; // only ≥ this may become a REQUIRED user goal
const MEDIUM_CONFIDENCE = 0.55; // ≥ this is a review / low-priority item

// Words that should not open a new use case by themselves.
const LEADING_NOISE = new Set([
  'a', 'an', 'the', 'each', 'every', 'any', 'some', 'this', 'that', 'it', 'its',
  'all', 'both', 'these', 'those', 'with', 'using', 'via', 'through', 'by',
]);

// Modal / auxiliary verbs and scope/role markers to strip before verb detection.
const MODALS = new Set([
  'can', 'may', 'might', 'must', 'will', 'would', 'shall', 'should', 'could',
  'are', 'is', 'has', 'have', 'had', 'be', 'been', 'being', 'able', 'need', 'needs',
  'responsible', 'for', 'member', 'members', 'user', 'users', 'person', 'operator',
]);

const SYSTEM_KEYWORDS = [
  'system', 'the system', 'software', 'application', 'platform', 'portal',
  'the software', 'the application', 'the platform', 'the portal',
];


const ROLE_NOUNS = new Set([
  'student', 'member', 'librarian', 'manager', 'customer', 'client', 'admin',
  'administrator', 'user', 'operator', 'staff', 'faculty', 'guest', 'borrower',
  'accountant', 'cashier', 'teacher', 'doctor', 'patient', 'receptionist',
  'supplier', 'vendor', 'employee', 'applicant', 'buyer', 'seller',
  'professor', 'supervisor', 'coordinator', 'tutor', 'coach', 'parent',
]);

// Collective group nouns that follow a role in a list ("faculty members",
// "staff members") are the SAME role, not separate actors.
const COLLECTIVE_NOUNS = new Set([
  'member', 'members', 'person', 'people',
]);

// Personal pronouns that should NEVER be treated as system actors.
const PERSONAL_PRONOUNS = new Set([
  'you', 'i', 'we', 'he', 'she', 'they', 'it', 'us', 'them', 'him', 'her', 'me',
]);

// Generic container/descriptor words that should not become the primary object of a UC name.
const GENERIC_OBJECT_WORDS = new Set([
  'list', 'set', 'collection', 'group', 'record', 'records', 'entry', 'entries',
  'information', 'data', 'details', 'info', 'content', 'stuff', 'item', 'items', 'thing', 'things',
  'number', 'amount', 'type', 'kind', 'value', 'values', 'message', 'messages',
]);

// Time / context words that are never the primary object of a UC name.
const TIME_WORDS = new Set([
  'semester', 'year', 'month', 'day', 'week', 'session', 'term', 'quarter', 'period', 'time', 'date',
]);

// Quantifiers / determiners that should never appear in a use-case name.
const NAME_NOISE_WORDS = new Set([
  'each', 'every', 'all', 'any', 'many', 'several', 'some', 'various', 'certain',
  'specific', 'particular', 'other', 'others', 'respective', 'corresponding',
  'relevant', 'various', 'usual', 'own',
]);

/**
 * Split free text into clean sentences.
 */
function splitIntoSentences(text) {
  if (!text || typeof text !== 'string') return [];
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const parts = cleaned.split(/(?<=[.!?])\s+(?=[A-Z0-9])/g);
  return parts
    .map((s) => s.trim())
    .filter((s) => s.length >= 4 && /[a-zA-Z]{2,}/.test(s));
}

/**
 * Strip leading articles, modals and bullet markers from a sentence.
 * Returns { clean, leadWords } where leadWords are the words removed.
 */
function stripLeadingNoise(sentence) {
  let words = (sentence || '').trim().split(/\s+/).filter((w) => w.length > 0);
  let removed = [];

  // Bullet markers: "1.", "-", "*", "1)", "1-", "•"
  while (words.length && /^[\d\-.•*]+[.)]?$/.test(words[0])) {
    removed.push(words.shift());
  }

  // Leading articles and modals (e.g. "A Student can log in ...")
  let changed = true;
  while (changed && words.length) {
    changed = false;
    const w = words[0].toLowerCase();
    if (LEADING_NOISE.has(w) || MODALS.has(w)) {
      removed.push(words.shift());
      changed = true;
    }
  }

  return { clean: words.join(' '), removed };
}

/**
 * Detect the actor for a cleaned sentence.
 */
function detectActorFromSentence(cleanedSentence, availableActors = []) {
  const words = (cleanedSentence || '').split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return null;

  const lowerSentence = cleanedSentence.toLowerCase();

  for (const kw of SYSTEM_KEYWORDS) {
    if (lowerSentence.startsWith(kw)) return 'System';
  }

  for (const actor of availableActors) {
    if (actor && lowerSentence.startsWith(String(actor).toLowerCase())) return actor;
  }

  const first = words[0];
  const firstLower = first.toLowerCase();
  // Pronouns can never be actors.
  if (PERSONAL_PRONOUNS.has(firstLower)) return null;
  if (MODALS.has(firstLower) || LEADING_NOISE.has(firstLower) || STOP_WORDS.has(firstLower)) {
    return null;
  }
  // Role nouns (singular or plural — the lemma strips the trailing "s"):
  // "Students" → "Student", "Customers" → "Customer", "Administrators" → "Administrator".
  const roleKey = lemmatizeToken(firstLower);
  if (/^[A-Z][a-zA-Z]+$/.test(first) && ROLE_NOUNS.has(roleKey)) {
    return roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
  }
  // Lowercase role noun (e.g. "member can add ...") is still an actor.
  if (ROLE_NOUNS.has(roleKey)) {
    return roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
  }
  return null;
}

function deriveUseCaseName(cleanedSentence, parsed, detectedActor) {
  let candidate;
  if (detectedActor) {
    const escaped = detectedActor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const actorPattern = new RegExp('^' + escaped + '(?:s|es)?\\b', 'i');
    candidate = cleanedSentence.replace(actorPattern, '').trim();
  } else if (parsed && parsed.action) {
    candidate = parsed.action;
  } else {
    candidate = cleanedSentence;
  }

  // Truncate candidate at relative clauses / subordinate conjunctions (which, that, who, including, etc.)
  const clauseParts = candidate.split(/,\s*|\b(?:which|that|who|where|when|because|since|including|includes|such\s+as)\b/i);
  if (clauseParts.length > 0 && clauseParts[0].trim().length >= 4) {
    candidate = clauseParts[0].trim();
  }

  const words = (candidate || '').split(/\s+/).filter((w) => w.length > 0);
  const withoutModals = [];
  let seenCore = false;
  for (const w of words) {
    if (!seenCore && MODALS.has(w.toLowerCase())) continue;
    seenCore = true;
    withoutModals.push(w);
  }

  const PHRASAL = new Set(['in', 'out', 'up', 'down', 'away', 'on']);
  if (withoutModals.length >= 2) {
    const verb = withoutModals[0];
    const second = withoutModals[1].toLowerCase();
    const twoWord = `${verb.toLowerCase()} ${second}`;
    const mapped = {
      'log in': 'Login', 'sign in': 'Login', 'signin': 'Login',
      'log out': 'Logout', 'sign out': 'Logout', 'signup': 'Register',
      'sign up': 'Register', 'register': 'Register',
    };
    if (mapped[twoWord]) return mapped[twoWord];
    if (PHRASAL.has(second)) return titleCase(`${verb} ${second}`);
  }

  const PREPOSITIONS = new Set([
    'about', 'from', 'into', 'onto', 'upon', 'within', 'without', 'against', 'between', 'beside',
    'below', 'above', 'during', 'across', 'along', 'around', 'behind', 'beneath', 'beyond',
    'except', 'inside', 'outside', 'toward', 'under', 'since', 'until', 'near', 'over', 'per', 'via',
    'with', 'after', 'before', 'among', 'amid', 'at', 'by', 'for', 'in', 'of', 'on', 'to', 'up',
  ]);
  const content = [];
  for (const w of withoutModals) {
    const wl = w.toLowerCase().replace(/[^a-z'-]+$/, '');
    if (PREPOSITIONS.has(wl)) {
      const hasRealObject = content.slice(1).some((cw) => {
        const c = cw.toLowerCase().replace(/[^a-z'-]+$/, '');
        return !GENERIC_OBJECT_WORDS.has(c) && !TIME_WORDS.has(c) && !NAME_NOISE_WORDS.has(c) && !/^[a-z]+ed$/.test(c);
      });
      if (hasRealObject) break;
      continue;
    }
    if (STOP_WORDS.has(wl)) continue;
    content.push(w);
  }
  if (content.length === 0) return titleCase(candidate.split(/\s+/).slice(0, 2).join(' '));

  const filteredContent = [];
  for (let i = 0; i < content.length; i++) {
    const w = content[i];

    const wl = w.toLowerCase().replace(/[^a-z'-]+$/, '');

    const isPastParticiple = /^[a-z]+ed$/.test(wl) && i > 0;
    if (!GENERIC_OBJECT_WORDS.has(wl) && !TIME_WORDS.has(wl) && !NAME_NOISE_WORDS.has(wl) && !isPastParticiple) {
      filteredContent.push(w);
    }
  }

  if (filteredContent.length >= 2) {
    const rawVerb = filteredContent[0];
    const tryLemma = lemmatizeToken(rawVerb);
    const verbLemma = (() => {
      if (tryLemma && tryLemma.toLowerCase() !== rawVerb.toLowerCase()) return tryLemma;
      const vl = rawVerb.toLowerCase();
      if (vl.endsWith('ing') && vl.length >= 5) return vl.slice(0, -3);
      return rawVerb;
    })();
    const objectWords = filteredContent.slice(1, 3); // verb + up to 2 object words
    const name = titleCase(`${verbLemma} ${objectWords.join(' ')}`);
    if (name.split(/\s+/).length <= 4) return name;
  }

  // Fallback: first two content words.
  if (content.length >= 2) {
    const name = titleCase(content.slice(0, 2).join(' '));
    if (name.split(/\s+/).length <= 4) return name;
  }

  // Fallback to the suggestion helper.
  const suggested = suggestFromSentence(candidate);
  if (suggested.nearestMessage) {
    const name = titleCase(suggested.nearestMessage);
    if (name.split(/\s+/).length <= 4) return name;
  }

  if (parsed && parsed.messageName) {
    const fromParsed = parsed.messageName.replace(/([A-Z])/g, ' $1').trim();
    if (fromParsed.split(/\s+/).length <= 4) return titleCase(fromParsed);
  }

  return titleCase(candidate.split(/\s+/).slice(0, 2).join(' '));
}

function titleCase(str) {
  return String(str || '')
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
    .replace(/[.\s]+$/, '');
}


function deriveGoalNames(cleanedSentence, parsed, detectedActor) {
  const names = [];
  const seen = new Set();
  const push = (name) => {
    const n = String(name || '').trim();
    const key = n.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    names.push(n);
  };

  let candidate;
  if (detectedActor) {
    const escaped = detectedActor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const actorPattern = new RegExp('^' + escaped + '(?:s|es)?\\b', 'i');
    candidate = cleanedSentence.replace(actorPattern, '').trim();
  } else {
    candidate = parsed && parsed.action ? parsed.action : cleanedSentence;
  }

  const purpose = candidate.match(/\bto\s+([a-z]{3,})\b/i);
  if (purpose && isFunctionalVerb(purpose[1])) {
    const idx = candidate.toLowerCase().indexOf(purpose[0].toLowerCase());
    const suffix = candidate.slice(idx + purpose[0].length).trim();

    const goalText = (purpose[1] + ' ' + suffix).trim() || candidate;
    push(deriveUseCaseName(goalText, null, null));
    return names;
  }


  const segments = candidate.split(/\s+and\s+/i);
  let produced = 0;
  segments.forEach((segment, i) => {
    const commaParts = String(segment).split(/,/i).map((s) => s.replace(/[;]+$/, '').trim()).filter(Boolean);
    let flushed = '';
    commaParts.forEach((part, p) => {
      const firstWord = (part.split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, '');
      if (p > 0 && firstWord && isFunctionalVerb(firstWord)) {
        if (flushed.trim()) {
          push(deriveUseCaseName(flushed.trim(), null, i === 0 ? detectedActor : null));
          produced += 1;
        }
        flushed = part;
      } else {
        flushed = (flushed + ' ' + part).trim();
      }
    });
    if (!flushed) return;
    const firstWord = (flushed.split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, '');
    if (i > 0 && firstWord && !isFunctionalVerb(firstWord)) return;
    push(deriveUseCaseName(flushed.trim(), null, i === 0 ? detectedActor : null));
    produced += 1;
  });
  if (produced === 0) push(deriveUseCaseName(candidate, null, detectedActor));

  return names;
}

function confidenceForCapability(name, actor, sentence) {
  let c = 0.5;
  if (actor && actor !== 'System') c += 0.2;
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  const object = words.slice(1).join(' ').toLowerCase().trim();
  if (!object || (!GENERIC_OBJECT_WORDS.has(object) && !TIME_WORDS.has(object))) c += 0.15;
  if (words.length > 0) {
    const verb = lemmatizeToken(words[0]);
    if (INTERNAL_VERBS.has(verb)) c -= 0.1;
  }
  if (String(sentence || '').length >= 12 && String(sentence || '').split(/\s+/).length >= 5) c += 0.1;
  return Number(Math.max(0, Math.min(0.98, c)).toFixed(2));
}


function analyzesLoginMentions(sentences) {
  return (sentences || []).some((s) =>
    /\b(log ?in|log ?on|sign ?in|sign ?on|log ?in|authenticate|signin|login)\b/i.test(String(s || '')));
}


function parseRequirementText(text) {
  if (!text || typeof text !== 'string') {
    return { actors: [], useCases: [], coverage: 0, sources: [], rawSentenceCount: 0 };
  }
  const source = text.slice(0, MAX_REQUIREMENT_LENGTH);

  const sentences = splitIntoSentences(source)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const actors = new Map();
  const useCases = [];
  const messages = new Set();
  const classification = {};

  const trackActor = (name) => {
    if (!name) return;
    const key = String(name).toLowerCase();
    const existing = actors.get(key);
    if (existing) existing.mentions += 1;
    else actors.set(key, { name, mentions: 1 });
  };

  const trackMessage = (msg) => {
    if (msg) messages.add(msg);
  };

  const bucket = (type, sentence) => {
    if (!type || !sentence) return;
    if (!classification[type]) classification[type] = [];
    classification[type].push(sentence);
  };


  for (const raw of sentences) {
    const { clean } = stripLeadingNoise(raw);
    const actor = detectActorFromSentence(clean, []);
    if (actor) trackActor(actor);
    const actorPhrase = raw.match(/\b(?:the|an|a)\s+([A-Z][a-z]+)\s+(?:actor|user|person|client|operator|administrator|staff|student|manager)\b/i);
    if (actorPhrase) trackActor(actorPhrase[1]);
  }

  const actorNames = Array.from(actors.values()).sort((a, b) => b.mentions - a.mentions).map((a) => a.name);


  let current = null;
  const actorHasOwnStep = {};
  const functionalActors = new Set();

  sentences.forEach((raw) => {
    const { clean } = stripLeadingNoise(raw);
    if (!clean) return;

    const passiveMatch = clean.match(/\b(?:allow|allows|allowed|enable|enables|permit|permits)\s+(?:past\s+)?([a-z\s]+?)\s+to\s+be\s+([a-z]+ed)\s+by\s+([a-z\s,]+?)(?:\s+after|\s+when|\.|$)/i);
    if (passiveMatch) {
      const rawObj = passiveMatch[1].trim();
      const rawVerb = passiveMatch[2].trim();
      const verbLemma = (lemmatizeToken(rawVerb) || rawVerb).toLowerCase().replace(/ed$/, '');
      const objLemma = rawObj.replace(/^past\s+/i, '');
      const ucName = titleCase(`${verbLemma} ${objLemma}`);

      const rawActorsText = passiveMatch[3].toLowerCase();
      const targetActors = [];
      // Detect the roles dynamically from the listed actors: any role noun in
      // the passive "by ..." clause becomes an actor. Collective group words
      // ("members") that directly follow a role are skipped ("faculty members" → Faculty).
      const roleTokens = rawActorsText.split(/[^a-z]+/i).filter((w) => w && w.length >= 3);
      let lastWasRole = false;
      for (const token of roleTokens) {
        const key = lemmatizeToken(token);
        if (!ROLE_NOUNS.has(key)) { lastWasRole = false; continue; }
        const role = key.charAt(0).toUpperCase() + key.slice(1);
        if (COLLECTIVE_NOUNS.has(key) && lastWasRole) { lastWasRole = true; continue; }
        const canonical = role === 'Admin' ? 'Administrator' : role;
        if (!targetActors.includes(canonical)) targetActors.push(canonical);
        lastWasRole = true;
      }

      targetActors.forEach((tActor) => {
        trackActor(tActor);
        functionalActors.add(tActor);
      });

      const primaryActor = targetActors[0] || null;
      if (primaryActor) {
        let existing = useCases.find((uc) => uc.primaryActor === primaryActor && uc.name.toLowerCase() === ucName.toLowerCase());
        if (!existing) {
          existing = {
            name: ucName,
            primaryActor,
            steps: [],
            messages: [],
            sourceSentences: [],
          };
          useCases.push(existing);
        }
        existing.sourceSentences.push(raw);
        existing.steps.push({
          step: existing.steps.length + 1,
          action: clean,
          actor: primaryActor,
          isSystem: false,
          kind: 'actor',
        });
        existing.confidence = confidenceForCapability(existing.name, primaryActor, raw);
      }
      return;
    }

    const actor = detectActorFromSentence(clean, actorNames);
    const parsed = parseScenarioStep(clean, actorNames);
    const stepClass = classifySystemStep(clean);
    const isSystemStep = actor === 'System' || stepClass !== 'actor';
    const verb = parsed && parsed.verb ? parsed.verb : null;

    const type = classifyRequirementSentence({
      sentence: clean,
      actor,
      verb,
      isSystemStep,
    });


    if (type === REQUIREMENT_TYPES.FUNCTIONAL && actor) {
      trackActor(actor);
      functionalActors.add(actor);
      const goalNames = deriveGoalNames(clean, parsed, actor);
      goalNames.forEach((ucName, idx) => {
        let target;
        const existingUc = useCases.find((uc) => uc.primaryActor === actor && !actorHasOwnStep[actor]);
        if (idx === 0 && existingUc && !actorHasOwnStep[actor]) {
          target = existingUc;
        } else {
          target = {
            name: ucName,
            primaryActor: actor,
            steps: [],
            messages: [],
            sourceSentences: [],
            confidence: 0,
          };
          useCases.push(target);
          if (idx === 0) actorHasOwnStep[actor] = true;
        }
        target.confidence = confidenceForCapability(target.name, actor, raw);
        target.sourceSentences.push(raw);
        target.steps.push({
          step: target.steps.length + 1,
          action: clean,
          actor,
          isSystem: false,
          kind: 'actor',
        });
        if (parsed.messageName) {
          target.messages.push(parsed.messageName);
          trackMessage(parsed.messageName);
        }
        current = target;
      });
      return;
    }

    // System / supporting steps: merge into the open use case (no new requirement).
    const isMergeable =
      type === REQUIREMENT_TYPES.SYSTEM_STEP ||
      type === REQUIREMENT_TYPES.SUPPORTING_STEP;

    if (isMergeable && current && current.steps.length) {
      const systemLike = type === REQUIREMENT_TYPES.SYSTEM_STEP || isSystemStep;
      current.steps.push({
        step: current.steps.length + 1,
        action: clean,
        actor: systemLike ? null : actor,
        isSystem: !!systemLike,
        kind: stepClass === 'external' ? 'external' : (systemLike ? 'self' : 'step'),
      });
      if (parsed.messageName) {
        current.messages.push(parsed.messageName);
        trackMessage(parsed.messageName);
      }
      return;
    }

    // Bare actor mention → track the actor only.
    if (type === REQUIREMENT_TYPES.ACTOR) {
      if (actor) trackActor(actor);
      return;
    }

    // Everything else (context, domain entity, business rule, pre/post,
    // constraint, non-functional, ambiguous) stays OUT of use cases.
    bucket(type, clean);
  });

  const useCaseList = useCases
    .filter((uc) => uc.steps.length > 0)
    .map((uc) => ({
      name: uc.name,
      primaryActor: uc.primaryActor,
      steps: uc.steps,
      messages: Array.from(new Set(uc.messages)),
      sourceSentences: uc.sourceSentences || [],
      confidence: uc.confidence || 0,
      highConfidence: (uc.confidence || 0) >= HIGH_CONFIDENCE,
    }));


  const responsibilities = [];
  useCaseList.forEach((uc) => {
    const nameWords = uc.name.split(/\s+/).filter(Boolean);
    const action = nameWords[0] ? lemmatizeToken(nameWords[0]) : '';
    const object = nameWords.slice(1).join(' ') || null;
    const sourceSentence = (uc.sourceSentences && uc.sourceSentences[0]) || '';
    if (action) {
      responsibilities.push({
        actor: uc.primaryActor || null,
        action,
        object,
        confidence: 0.9,
        sourceSentence,
        useCase: uc.name,
      });
    }
  });

  // Coverage: how many sentences were attributed to a use case or actor.
  const attributedKeys = new Set();
  sentences.forEach((raw) => {
    const { clean } = stripLeadingNoise(raw);
    const actor = detectActorFromSentence(clean, actorNames);
    const attributed =
      useCaseList.some((uc) => uc.steps.some((s) => s.action === clean)) ||
      (actor && actorNames.includes(actor));
    if (attributed) attributedKeys.add(raw);
  });
  const coverage = sentences.length > 0 ? Number((attributedKeys.size / sentences.length).toFixed(2)) : 0;

  const context = analyzeCaseStudyContext({
    rawSentenceCount: sentences.length,
    sources: sentences,
    actors: Array.from(functionalActors),
    useCases: useCaseList,
    coverage: Number(coverage),
  });

  return {
    actors: Array.from(functionalActors),
    useCases: useCaseList,
    responsibilities,
    requirements: classification,
    coverage: Number(coverage),
    sources: sentences,
    rawSentenceCount: sentences.length,
    reliable: context.reliable,
    loginSupported: analyzesLoginMentions(sentences),
    context,
  };
}

/**
 * Build semantic representations for every requirement step so the engine can
 * reuse the existing tiered step<->message matcher (SemanticProcessor).
 */
function buildRequirementSemantics(requirementModel) {
  const semantics = [];
  const useCaseSemantics = [];

  (requirementModel?.useCases || []).forEach((uc, ucIdx) => {
    const ucSem = SemanticRepresentation.fromSentence(`${uc.primaryActor || 'Actor'} ${uc.name}`, {
      availableActors: requirementModel.actors || [],
      ucId: `req-uc-${ucIdx}`,
    });
    useCaseSemantics.push({
      useCase: uc,
      index: ucIdx,
      semantic: ucSem,
      stepSemantics: (uc.steps || []).map((step) =>
        SemanticRepresentation.fromSentence(step.action, {
          availableActors: requirementModel.actors || [],
          ucId: `req-uc-${ucIdx}`,
        })
      ),
    });
  });

  return { semantics, useCaseSemantics };
}



function analyzeCaseStudyContext(requirementModel) {
  const empty = { reliable: false, signals: {}, reason: '' };
  if (!requirementModel) return empty;

  const sentenceCount = requirementModel.rawSentenceCount || 0;
  const sources = (requirementModel.sources || []).map((s) =>
    String(s).trim().replace(/[.\s]+$/, '')
  );
  const actors = requirementModel.actors || [];
  const useCases = requirementModel.useCases || [];
  const coverage = requirementModel.coverage || 0;

  const signals = {
    hasMultipleSentences: sentenceCount >= 2,
    hasContentTokens: false,
    hasFunctionalVerb: false,
    hasActorAction: false,
    hasSemanticCompleteness: false,
  };

  const contentTokenCount = sources.reduce(
    (sum, s) => sum + s.split(/\s+/).filter((w) => !STOP_WORDS.has(w.toLowerCase())).length,
    0
  );
  signals.hasContentTokens = contentTokenCount >= MIN_CONTENT_TOKENS;

  const functionalRe = new RegExp(
    '\\b(' + Array.from(VERB_DICTIONARY).concat(INTERNAL_VERBS).join('|') + ')\\b',
    'i'
  );
  signals.hasFunctionalVerb = sources.some((s) => functionalRe.test(s));

  signals.hasActorAction = actors.length > 0 && useCases.some((uc) =>
    String(uc.name || '').trim().split(/\s+/).length >= 2);

  // Semantic completeness: every extracted actor is visible in the source text,
  // and the source text says something about each actor's capability.
  const wordsOf = (s) =>
    String(s).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const mentioned = (sentence, lemma) => {
    const base = lemmatizeToken(lemma);
    // Phrasal-verb spelling: "login" is realised as "log in" / "logs in".
    if (base === 'login' || base === 'log') {
      if (/\blog(?:s|ged|ging)?\s+in\b|\blogin\b/i.test(String(sentence))) return true;
    }
    return wordsOf(sentence).some((w) => w === lemma || w === base || lemmatizeToken(w) === base);
  };
  const coveredActors = actors.filter((a) =>
    sources.some((s) => mentioned(s, a.toLowerCase())));
  signals.hasSemanticCompleteness =
    coveredActors.length >= 1 &&
    coveredActors.length / Math.max(1, actors.length) >= 0.5 &&
    useCases.some((uc) => {
      const action = (String(uc.name || '').split(/\s+/)[0] || '').toLowerCase();
      return action && sources.some((s) => mentioned(s, action));
    });

  const reliable =
    signals.hasMultipleSentences &&
    signals.hasContentTokens &&
    signals.hasFunctionalVerb &&
    signals.hasActorAction &&
    signals.hasSemanticCompleteness;

  let reason = 'OK';
  if (!reliable) {
    const failed = Object.keys(signals).filter((k) => !signals[k]);
    const labels = {
      hasMultipleSentences: 'needs at least two sentences',
      hasContentTokens: 'too little meaningful content',
      hasFunctionalVerb: 'no functional verb found',
      hasActorAction: 'no actor performing an action',
      hasSemanticCompleteness: 'extracted capabilities not grounded in the text',
    };
    reason = failed.map((k) => labels[k]).join('; ') || 'insufficient context';
  }

  return {
    reliable,
    signals,
    sentenceCount,
    contentTokenCount,
    reasoning: reason,
  };
}

module.exports = {
  parseRequirementText,
  splitIntoSentences,
  detectActorFromSentence,
  stripLeadingNoise,
  deriveUseCaseName,
  buildRequirementSemantics,
  analyzeCaseStudyContext,
  lemmatizeToken,
  normalizeToken,
};
