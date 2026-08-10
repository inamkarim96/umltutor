"use strict";



const { STOP_WORDS, VERB_DICTIONARY } = require('./constants');
const {
  extractKeywords,
  lemmatizeToken,
  evaluateFunctionMatch,
} = require('./similarity');

// Words that are generic system descriptors — they should never form the
// backbone of a suggested system name.
const GENERIC_SYS_WORDS = new Set([
  'system', 'systems', 'software', 'application', 'applications', 'platform',
  'portals', 'portal', 'website', 'web', 'webapp', 'app', 'apps', 'tool',
  'module', 'information', 'info', 'data', 'service', 'services', 'site',
]);

// Role / human nouns that describe WHO interacts, never WHAT the system is.
const ROLE_WORDS = new Set([
  'student', 'students', 'staff', 'staffs', 'faculty', 'faculties', 'teacher',
  'teachers', 'professor', 'professors', 'administrator', 'administrators',
  'admin', 'admins', 'manager', 'managers', 'librarian', 'librarians', 'user',
  'users', 'member', 'members', 'person', 'people', 'client', 'clients',
  'customer', 'customers', 'operator', 'operators', 'accountant', 'cashier',
  'doctor', 'patient', 'receptionist', 'supplier', 'vendor', 'employee',
  'employers', 'applicant', 'buyer', 'seller', 'guest', 'borrower',
]);

// Time / context words that repeat in requirement text but are poor system names.
const TIME_AND_CONTEXT_WORDS = new Set([
  'semester', 'semesters', 'year', 'years', 'month', 'months', 'week', 'weeks',
  'day', 'days', 'session', 'term', 'quarter', 'time', 'times', 'date',
  'period', 'start', 'next', 'current', 'after', 'before',
]);

// Words that appear in nearly every assignment preamble.
const FRAMING_WORDS = new Set([
  'asked', 'develop', 'developed', 'building', 'build', 'required', 'requires',
  'needs', 'will', 'must', 'should', 'would', 'can', 'could', 'able', 'also',
  'include', 'includes', 'including', 'make', 'ensure', 'system', 'the', 'new',
]);

// Place/context nouns that qualify a system ("Department Notice ...") but are
// a poor primary on their own ("Department System" is not descriptive enough).
const CONTEXT_WORDS = new Set([
  'department', 'departments', 'departmental', 'faculty', 'faculties',
  'college', 'colleges', 'school', 'schools', 'university', 'universities',
  'institute', 'institutes', 'office', 'officer', 'centre', 'centers',
  'center', 'centres', 'council', 'board', 'committee', 'division',
  'section', 'unit',
]);

function titleCase(str) {
  return String(str || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}


function rankDomainWords(requirementModel) {
  const sources = requirementModel?.sources || [];
  const text = sources.join(' ');

  const buckets = new Map(); // lemma -> { display, count, rawFreq }
  for (const raw of extractKeywords(text)) {
    const w = String(raw).toLowerCase();
    if (!w || w.length < 3) continue;
    if (STOP_WORDS.has(w)) continue;
    if (VERB_DICTIONARY.has(lemmatizeToken(w))) continue;
    if (ROLE_WORDS.has(w)) continue;
    if (TIME_AND_CONTEXT_WORDS.has(w)) continue;
    if (GENERIC_SYS_WORDS.has(w) || FRAMING_WORDS.has(w)) continue;

    const lemma = lemmatizeToken(w);
    const b = buckets.get(lemma) || { display: w, count: 0, rawFreq: new Map() };
    b.count += 1;
    b.rawFreq.set(w, (b.rawFreq.get(w) || 0) + 1);
    if ((b.rawFreq.get(w) || 0) > (b.rawFreq.get(b.display) || 0)) b.display = w;
    buckets.set(lemma, b);
  }

  return Array.from(buckets.values())
    .sort((a, b2) => b2.count - a.count)
    .map((b) => b.display);
}


function deriveSystemNameCandidates(requirementModel) {
  const ranked = rankDomainWords(requirementModel).slice(0, 4);
  if (ranked.length === 0) return [];
  const primary = ranked.find((w) => !CONTEXT_WORDS.has(String(w).toLowerCase()));
  const context = ranked.find((w) => CONTEXT_WORDS.has(String(w).toLowerCase()));

  const fallback = (w) => [titleCase(w) + ' System', titleCase(w) + ' Management System'];
  if (!primary) return fallback(ranked[0]);

  const candidates = [
    `${titleCase(primary)} System`,
    `${titleCase(primary)} Management System`,
  ];
  if (context && String(context).toLowerCase() !== String(primary).toLowerCase()) {
    candidates.push(`${titleCase(context)} ${titleCase(primary)} System`);
  } else {
    const secondary = ranked.find((w) => w !== primary && !CONTEXT_WORDS.has(String(w).toLowerCase()));
    if (secondary) candidates.push(`${titleCase(primary)} ${titleCase(secondary)} System`);
  }
  return Array.from(new Set(candidates)).slice(0, 4);
}

function listOf(items, quote) {
  const wrapped = items.map((s) => (quote ? `"${s}"` : s));
  if (wrapped.length === 0) return '';
  if (wrapped.length === 1) return wrapped[0];
  return `${wrapped.slice(0, -1).join(', ')} and ${wrapped[wrapped.length - 1]}`;
}

function listOfNames(items, quote) {
  return listOf(items, quote);
}

/**
 * Produce an assignment-aware suggestion string for a given issue, or null.
 */
function generateAssignmentSuggestion(issue, requirementModel) {
  if (!requirementModel) return null;
  const code = issue?.code || '';
  const context = issue?.context || {};
  // The NLP case-study findings carry a canonical specCode alias; fall back to
  // the legacy CASE_STUDY_* code so both naming schemes enrich identically.
  const effective = context.specCode || code;

  const actors = requirementModel.actors || [];
  const useCases = requirementModel.useCases || [];
  const systemCandidates = deriveSystemNameCandidates(requirementModel);
  const primarySystem = systemCandidates[0];

  // ── System Boundary / Name ─────────────────────────────────────────────
  if (/^SYSTEM_NAME_/.test(effective) || /^(CASE_STUDY_)?SYSTEM_NAME_MISMATCH$/.test(effective)) {
    if (systemCandidates.length) {
      const quoted = listOfNames(systemCandidates.slice(0, 2), true);
      return `Name the system according to the assignment. Try something like ${quoted}.`;
    }
  }

  if (effective === 'MISSING_SYSTEM_NAME') {
    return primarySystem
      ? `Name the system boundary after the assignment topic. Try "${primarySystem}" or "${systemCandidates[1] || primarySystem}".`
      : 'Name the system boundary after the assignment topic (e.g. a "System Name" label).';
  }

  if (/^SYSTEM_BOUNDARY_MISSING$/.test(code)) {
    const example = primarySystem ? `, e.g. "${primarySystem}"` : '';
    return `Add a System Boundary to your diagram and name the system${example}. It represents the scope of the system described in the assignment.`;
  }

  // ---- Actors ────────────────────────────────────────────────────────────
  if (/^NO_ACTORS$/.test(code)) {
    if (actors.length) {
      return `Add the actors described in the assignment: ${listOf(actors, true)}. Each actor represents the people or systems that interact with the ${primarySystem || 'system'}.`;
    }
  }

  if (/^ACTOR_NO_NAME$/.test(code)) {
    const hint = actors.length ? `Use a role from the assignment, e.g. "${actors[0]}".` : 'Give this actor a descriptive role name (e.g. "Student").';
    return `Name this actor meaningfully. ${hint}`;
  }

  if (/^ACTOR_INVALID_NAME$/.test(code)) {
    const hint = actors.length ? `Use a role from the assignment, e.g. "${actors[0]}" or "${actors[1] || actors[0]}".` : 'Use a human-readable role name.';
    return `An actor cannot be named "System". ${hint}`;
  }

  if (/^ACTOR_NOT_CONNECTED$/.test(code)) {
    return `Connect this actor to at least one use case. The assignment expects ${actors.length ? listOf(actors.slice(0, 2)) : 'actors'} to perform the required functions.`;
  }

  if (/^CASE_STUDY_ACTOR_MISSING$/.test(effective) || effective === 'MISSING_ACTOR') {
    return `Add the actor "${context.actor || 'the required actor'}" that the assignment mentions${primarySystem ? ` (the assignment is about the ${primarySystem})` : ''}.`;
  }

  if (effective === 'ACTOR_NAME_QUALITY') {
    return `The diagram uses "${context.submitted || 'this actor name'}", but the assignment mentions "${context.expected || 'a similar role'}". Use the exact role name from the assignment to avoid ambiguity.`;
  }

  if (effective === 'ACTOR_NAME_MISMATCH') {
    return `The actor "${context.submitted || 'this actor'}" is close to the assignment role "${context.expected || 'a required role'}". Rename it to the exact role name used in the assignment.`;
  }

  if (effective === 'UNSUPPORTED_ACTOR') {
    const name = context.actor || context.label || 'This actor';
    const ref = actors.length ? ` The assignment roles are: ${listOf(actors.slice(0, 4), true)}.` : '';
    return `${name} is not part of the assignment.${ref} Remove it or align its name with a role in the assignment.`;
  }

  if (/^CASE_STUDY_USE_CASE_MISSING$/.test(effective) || effective === 'MISSING_REQUIRED_USE_CASE') {
    const name = context.useCase || context.expected || 'this functionality';
    const actor = context.expectedActor || 'the relevant actor';
    return `Add a use case for "${name}" and connect it to "${actor}", as described by the assignment.`;
  }

  if (/^CASE_STUDY_ACTOR_USE_CASE_MISMATCH$/.test(effective) || effective === 'ACTOR_RESPONSIBILITY_MISMATCH') {
    return `The assignment assigns "${context.useCase || 'this function'}" to "${context.expectedActor || 'the expected actor'}", but the diagram connects it to "${context.submittedActor || 'a different actor'}".`;
  }

  // ---- Use Cases ─────────────────────────────────────────────────────────
  if (/^NO_USE_CASES$/.test(effective)) {
    const ucNames = useCases.slice(0, 4).map((uc) => uc.name);
    if (ucNames.length) {
      return `Add the use cases described in the assignment, e.g. ${ucNames.join(', ')}. These are the core functions of the system.`;
    }
  }

  if (/^USE_CASE_NO_NAME$/.test(effective)) {
    if (useCases.length) {
      return `Give this use case a Verb + Noun name described in the assignment, e.g. "${useCases[0].name}".`;
    }
  }

  if (/^USE_CASE_INVALID_NAME$/.test(effective)) {
    const closest = findUseCaseForLabelFromContext(context, useCases);
    const ref = closest ? `E.g. a valid name from the assignment is "${closest.name}" (associated with ${closest.primaryActor || 'the actor'}).` : `Use "Verb + Noun", e.g. "${requiredUCAnswer(useCases)}".`;
    return `Use case names follow the format Verb + Noun. ${ref}`;
  }

  if (/^CASE_STUDY_USE_CASE_UNSUPPORTED$/.test(effective) || effective === 'UNSUPPORTED_USE_CASE') {
    const name = context.useCase || context.label || 'This use case';
    const ref = useCases.length
      ? `The assignment describes: ${useCases.slice(0, 3).map((u) => u.name).join(', ')}.`
      : '';
    return `${name} is not described in the assignment. ${ref} Remove it or adjust its name to match a required function.`;
  }

  if (/^USE_CASE_NOT_CONNECTED$/.test(effective)) {
    const closest = findUseCaseForLabelFromContext(context, useCases);
    const ref = closest && closest.primaryActor
      ? `The assignment associates "${closest.name}" with the "${closest.primaryActor}".`
      : 'The assignment lists which actors perform each function.';
    return `Draw an association line from an actor to this use case. ${ref}`;
  }

  if (/^USE_CASE_OUTSIDE_BOUNDARY$/.test(effective)) {
    const primary = primarySystemName(requirementModel, systemCandidates);
    return `Drag this use case inside the ${primary || 'system'} boundary. All use cases must be within the system.`;
  }

  // ---- Class Diagram ─────────────────────────────────────────────────────
  if (/^CLASS_NAME_PLACEHOLDER/.test(code)) {
    const top = rankDomainWords(requirementModel).slice(0, 3);
    if (top.length) {
      return `Replace the placeholder with a domain entity from the assignment, e.g. "${titleCase(top[0])}"${top[1] ? ` or "${titleCase(top[1])}"` : ''}.`;
    }
  }

  if (/^CLASS_NAME_INVALID/.test(code)) {
    const top = rankDomainWords(requirementModel).slice(0, 2);
    if (top.length) {
      return `Use a PascalCase domain entity from the assignment, e.g. "${top.map((w) => titleCase(w)).join('')}".`;
    }
  }

  // ---- Description ───────────────────────────────────────────────────────
  if (/^INVALID_PRIMARY_ACTOR$/.test(code) || /^NO_PRIMARY_ACTOR$/.test(code)) {
    if (actors.length) {
      return `Set the primary actor to one of the roles in the assignment: ${listOf(actors.slice(0, 4), true)}.`;
    }
  }

  // ---- SSD / sequence lifelines and messages ─────────────────────────────
  if (/^(SSD|SEQUENCE).*ACTOR/i.test(code)) {
    if (actors.length) {
      return `Use the actor names from the assignment: ${listOf(actors.slice(0, 4), true)}.`;
    }
  }

  return null;
}

function primarySystemName(requirementModel, systemCandidates) {
  return systemCandidates?.[0] || rankDomainWords(requirementModel)[0] || 'system';
}

function findUseCaseForLabelFromContext(context, useCases) {
  const probe = context.useCaseLabel || context.useCaseId || context.relatedId || null;
  if (!probe || !useCases.length) return useCases[0] || null;
  let best = null;
  let bestScore = 0;
  for (const uc of useCases) {
    const score = evaluateFunctionMatch(String(probe), String(uc.name)).score;
    if (score > bestScore) {
      bestScore = score;
      best = uc;
    }
  }
  return (best && bestScore >= 0.3 ? best : useCases[0]) || null;
}

function requiredUCAnswer(useCases) {
  return useCases[0]?.name || 'Add Item';
}

/**
 * Try to replace an issue's generic suggestion with an assignment-aware one.
 * Returns the number of issues enriched (for tests).
 */
function enrichIssueSuggestions(issues, requirementModel) {
  if (!requirementModel || !Array.isArray(issues)) return 0;
  let enriched = 0;
  for (const issue of issues) {
    const assignmentSuggestion = generateAssignmentSuggestion(issue, requirementModel);
    if (!assignmentSuggestion) continue;
    issue.context = { ...(issue.context || {}) };
    issue.context.suggestion = assignmentSuggestion;
    issue.context.fromRequirement = true;
    enriched++;
  }
  return enriched;
}

module.exports = {
  SuggestionGenerator: {
    rankDomainWords,
    deriveSystemNameCandidates,
    generateAssignmentSuggestion,
    enrichIssueSuggestions,
  },
  rankDomainWords,
  deriveSystemNameCandidates,
  generateAssignmentSuggestion,
  enrichIssueSuggestions,
};