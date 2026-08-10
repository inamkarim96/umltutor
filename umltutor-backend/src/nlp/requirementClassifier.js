"use strict";



const {
  VERB_DICTIONARY,
  INTERNAL_VERBS,
  EXTERNAL_VERBS,
} = require('./constants');
const { lemmatizeToken } = require('./similarity');

const REQUIREMENT_TYPES = Object.freeze({
  FUNCTIONAL: 'FUNCTIONAL',
  SYSTEM_STEP: 'SYSTEM_STEP',
  SUPPORTING_STEP: 'SUPPORTING_STEP',
  ACTOR: 'ACTOR',
  DOMAIN_ENTITY: 'DOMAIN_ENTITY',
  DATA_ATTRIBUTE: 'DATA_ATTRIBUTE',
  BUSINESS_RULE: 'BUSINESS_RULE',
  PRECONDITION: 'PRECONDITION',
  POSTCONDITION: 'POSTCONDITION',
  CONSTRAINT: 'CONSTRAINT',
  NON_FUNCTIONAL: 'NON_FUNCTIONAL',
  CONTEXT: 'CONTEXT',
  AMBIGUOUS: 'AMBIGUOUS',
});

// ─── Functional verb vocabulary (base + inflected forms) ──────────────────────
const FUNCTIONAL_VERBS = new Set();
(function buildFunctionalVerbs() {
  const add = (v) => {
    FUNCTIONAL_VERBS.add(v);
    FUNCTIONAL_VERBS.add(lemmatizeToken(v));
  };
  [...VERB_DICTIONARY, ...INTERNAL_VERBS, ...EXTERNAL_VERBS].forEach(add);
  // Common capabilities that may appear in a case study without being in the
  // existing dictionaries (kept deliberately small to avoid over-matching).
  ['login', 'log', 'logout', 'register', 'view', 'add', 'create', 'delete',
    'update', 'search', 'book', 'pay', 'checkout', 'submit', 'upload',
    'list', 'download', 'approve', 'reject', 'manage', 'generate', 'send', 'receive',
    'track', 'place', 'purchase', 'withdraw', 'make', 'edit', 'remove',
    'cancel', 'save', 'display', 'show', 'validate', 'verify', 'process',
    'confirm', 'print', 'export', 'import', 'order', 'rent', 'borrow',
    'return', 'reserve', 'review', 'rate', 'comment', 'maintain', 'announce',
    'post', 'publish', 'browse', 'access', 'enrol', 'enroll', 'approve',
    'amend', 'modify', 'insert'].forEach(add);
})();

// Verbs that describe sub-actions WITHIN a use case rather than a distinct
// top-level capability. These merge into the current use case as steps.
const SUPPORTING_VERBS = new Set(
  ['enter', 'input', 'provide', 'select', 'choose', 'fill', 'specify',
    'set', 'give', 'type', 'scan', 'insert', 'confirm'].map(lemmatizeToken)
);

// ─── Classification patterns (checked before verb-based logic) ────────────────
const NON_FUNCTIONAL_PATTERNS = [
  /\b(performance|performant|scalab|reliab|availab|secure|security|user-?friend|easy to use|responsiv|fast|quick|efficient|usab)\w*\b/i,
];

const PRECONDITION_PATTERNS = [
  /\b(prerequisite|before\s+.+\s+can|in order to|must\s+(?:be|first|have))\b/i,
];

const POSTCONDITION_PATTERNS = [
  /\b(once\s+.+\s+(?:is|has)|after\s+.+\s+(?:is|has|was)|as a result|post-?condition|subsequent\s+)\b/i,
];

const CONSTRAINT_PATTERNS = [
  /\b(cannot|can not|may not|must not|not allowed|not permitted|limited to|restricted|restriction|no more than|no less than)\b/i,
];

const BUSINESS_RULE_PATTERNS = [
  /\b(must|shall|only|requires?|required|at least|at most|maximum|minimum|must be)\b/i,
];

const DOMAIN_ENTITY_PATTERNS = [
  /\b(includ\w*|contain\w*|consist\w*|compris\w*|hold\w*|store\w*|keep\w*|record\w*|track\w*)\b/i,
  /\b(information|data|details|attributes|fields|entity|entities|about the)\b/i,
];

const CONTEXT_PATTERNS = [
  /\b(asked|asked to|responsible for|the purpose|the aim|the goal|this (?:system|website|application|project|case study)|the case study|intended|designed|developed for|to develop|objective|overview|introduction|background|the project|the assignment)\b/i,
];

// Strong scope / project-level overview phrases that describe the assignment scope itself.
const STRONG_CONTEXT_PATTERNS = [
  /\b(asked (?:me|us|to)|to develop|designed (?:for|to)|the purpose|the aim|the goal|this case study|this assignment|this project)\b/i,
];

const ACTOR_PATTERNS = [
  /\b(actor|user|person|client|operator|administrator|staff|student|member|librarian|manager|customer|guest|admin)\b/i,
];

function isFunctionalVerb(verb) {
  if (!verb) return false;
  return FUNCTIONAL_VERBS.has(verb) || FUNCTIONAL_VERBS.has(lemmatizeToken(verb));
}

function isSupportingVerb(verb) {
  if (!verb) return false;
  return SUPPORTING_VERBS.has(lemmatizeToken(verb));
}


function findVerbInSentence(sentence, givenVerb) {
  if (givenVerb && (isFunctionalVerb(givenVerb) || isSupportingVerb(givenVerb))) {
    return givenVerb;
  }
  const words = String(sentence || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  for (const w of words) {
    const base = lemmatizeToken(w);
    if (FUNCTIONAL_VERBS.has(base)) return base;
  }
  for (const w of words) {
    const base = lemmatizeToken(w);
    if (SUPPORTING_VERBS.has(base)) return base;
  }
  return givenVerb || null;
}

/**
 * Classify a requirement sentence into a RequirementType.
 *
 * @param {object} meta
 * @param {string} meta.sentence - original (cleaned) sentence
 * @param {string|null} meta.actor - detected actor, or 'System'
 * @param {string|null} meta.verb - parsed head verb (lemmatized)
 * @param {boolean} meta.isSystemStep - starts with "System" / is a system action
 * @returns {string} one of REQUIREMENT_TYPES
 */
function classifyRequirementSentence({ sentence, actor, verb, isSystemStep }) {
  const lower = String(sentence || '').toLowerCase();
  if (!lower) return REQUIREMENT_TYPES.AMBIGUOUS;

  // 1. Non-functional quality attributes win first.
  if (NON_FUNCTIONAL_PATTERNS.some((re) => re.test(lower))) {
    return REQUIREMENT_TYPES.NON_FUNCTIONAL;
  }

  // 2. Pre/post conditions are explicit.
  if (PRECONDITION_PATTERNS.some((re) => re.test(lower))) {
    return REQUIREMENT_TYPES.PRECONDITION;
  }
  if (POSTCONDITION_PATTERNS.some((re) => re.test(lower))) {
    return REQUIREMENT_TYPES.POSTCONDITION;
  }

  const verbBase = verb ? lemmatizeToken(verb) : null;
  const robustVerb = findVerbInSentence(sentence, verbBase);
  const hasFunctional = !!robustVerb && (isFunctionalVerb(robustVerb) || isSystemStep);
  const hasSupporting = !!robustVerb && isSupportingVerb(robustVerb);

  // 2b. Strong scope / job-duties prose wins over verb-based classification.
  if (STRONG_CONTEXT_PATTERNS.some((re) => re.test(lower))) {
    return REQUIREMENT_TYPES.CONTEXT;
  }

  // 3. Constraints.

  if (CONSTRAINT_PATTERNS.some((re) => re.test(lower))) {
    return REQUIREMENT_TYPES.CONSTRAINT;
  }

  // 4. Business rules (must / only / required) — but only when the sentence is
  //    not itself a clean functional capability (e.g. "The system must validate
  //    the credentials" is a SYSTEM_STEP, not a rule).
  if (BUSINESS_RULE_PATTERNS.some((re) => re.test(lower)) && !hasFunctional) {
    return REQUIREMENT_TYPES.BUSINESS_RULE;
  }

  // 5. System actions are steps of a use case, not standalone requirements.
  if (isSystemStep) {
    return REQUIREMENT_TYPES.SYSTEM_STEP;
  }

  // 6. Context / scope-setting prose (e.g. "You have been asked to develop...")
  if (STRONG_CONTEXT_PATTERNS.some((re) => re.test(lower)) || (CONTEXT_PATTERNS.some((re) => re.test(lower)) && !actor)) {
    return REQUIREMENT_TYPES.CONTEXT;
  }

  // 6b. "Actor is/will be responsible for VERBing X" → always FUNCTIONAL.
  const RESPONSIBILITY_FUNCTIONAL = /\b(?:is|are|will\s+be|was|were)\s+responsible\s+for\s+\w+ing\b/i;
  if (actor && RESPONSIBILITY_FUNCTIONAL.test(lower)) {
    return REQUIREMENT_TYPES.FUNCTIONAL;
  }


  const hasDomainSignal = DOMAIN_ENTITY_PATTERNS.some((re) => re.test(lower));
  const hasInformationDesc = lower.includes('information') || lower.includes('includes') || lower.includes('contains');

  const DESCRIPTION_VERBS = ['include', 'contain', 'consist', 'comprise', 'hold', 'store'];

  const mainClause = lower.split(/,|\b(?:which|that|who|where|when)\b/i)[0] || lower;
  const tokens = mainClause.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4);
  const descriptionVerbPresent = DESCRIPTION_VERBS.some((v) =>
    tokens.some((w) => {
      if (w === v || lemmatizeToken(w) === v) return true;
      const base = lemmatizeToken(w);
      // lemmatizeToken('includes') → 'includ': accept a truncated prefix of v.
      return base.length >= 4 && base.length <= v.length + 1 && v.startsWith(base);
    }));
  if (hasDomainSignal && (descriptionVerbPresent || !(actor && hasFunctional))) {
    return REQUIREMENT_TYPES.DOMAIN_ENTITY;
  }

  // 8. Functional capability: actor performing a real system action.
  if (actor && hasFunctional) {
    return REQUIREMENT_TYPES.FUNCTIONAL;
  }

  // 9. Supporting step: actor doing a sub-action of a use case.
  if (actor && hasSupporting) {
    return REQUIREMENT_TYPES.SUPPORTING_STEP;
  }

  // 10. Actor definition / mention.
  if (actor && ACTOR_PATTERNS.some((re) => re.test(lower))) {
    return REQUIREMENT_TYPES.ACTOR;
  }

  return REQUIREMENT_TYPES.AMBIGUOUS;
}

module.exports = {
  REQUIREMENT_TYPES,
  classifyRequirementSentence,
  isFunctionalVerb,
  isSupportingVerb,
  findVerbInSentence,
};
