"use strict";

const { INTERNAL_VERBS, EXTERNAL_VERBS, STOP_WORDS, VERB_DICTIONARY, SSD_VERBS, RETURN_KEYWORDS } = require('./constants');
const { lemmatizeToken } = require('./similarity');

function validateSentence(text) {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Content is missing.' };
  }

  const trimmed = text.trim();
  if (trimmed.length < 5) {
    return { isValid: false, error: 'Content is too short (minimum 5 characters).' };
  }

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 2) {
    return { isValid: false, error: 'Please provide a complete sentence (at least 2 words).' };
  }

  if (!/^[a-zA-Z]/.test(trimmed)) {
    return { isValid: false, error: 'Sentence must start with a letter.' };
  }

  if (!/[aeiouyAEIOUY]/.test(trimmed)) {
    return { isValid: false, error: 'Content seems meaningless or invalid.' };
  }

  return { isValid: true, error: null };
}

function classifySystemStep(stepText) {
  const s = (stepText || '').trim().toLowerCase();
  if (!s.startsWith('system')) return 'actor';

  const rest = s.replace(/^system\s+/, '');
  const words = rest.split(/\s+/);
  const verb = words[0] || '';

  if (INTERNAL_VERBS.has(verb)) return 'self';
  if (EXTERNAL_VERBS.has(verb)) return 'external';

  for (const w of words) {
    if (INTERNAL_VERBS.has(w)) return 'self';
    if (EXTERNAL_VERBS.has(w)) return 'external';
  }

  // Unclassified system processing is treated as an INTERNAL operation (self-loop),
  // NOT as an external response. This avoids false positives where valid internal
  // processing (e.g. "System handles the request") is wrongly flagged as needing
  // a System → Actor return arrow.
  return 'self';
}

function suggestFromSentence(sentence) {
  const raw = (sentence || '').replace(/\./g, '').trim();
  const words = raw.split(/\s+/).filter((w) => w.length > 0);
  const contentWords = words.slice(1);

  const meaningful = contentWords
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  if (meaningful.length === 0) {
    const fallback = raw.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim() || 'newMessage';
    return {
      nearestMessage: fallback,
      nearestFunction: fallback.replace(/\s+(\w)/g, (_, c) => c.toUpperCase()),
      nearestFunctionWithParam: fallback.replace(/\s+(\w)/g, (_, c) => c.toUpperCase()) + '()',
    };
  }

  const verb = meaningful[0];
  const objectWords = meaningful.slice(1);
  const nearestMessage = [verb, ...objectWords].join(' ');
  const camelParts = [verb, ...objectWords];
  const nearestFunction = camelParts
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
  const param = objectWords.length > 0 ? objectWords[objectWords.length - 1] : '';
  const nearestFunctionWithParam = param
    ? `${nearestFunction}(${param})`
    : `${nearestFunction}()`;

  return { nearestMessage, nearestFunction, nearestFunctionWithParam };
}

function validateUseCaseName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Use case name is required.' };
  }

  const words = name.trim().split(/\s+/);

  if (words.length < 2) {
    return { isValid: false, error: 'Use case name must contain a verb followed by an object.' };
  }

  const firstWord = words[0].toLowerCase();
  const isFirstWordVerb = VERB_DICTIONARY.has(firstWord);

  if (!isFirstWordVerb) {
    return { isValid: false, error: 'Use case name must start with a verb.' };
  }

  return { isValid: true, error: null };
}

function validateActorName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Actor name is required.' };
  }

  const normalizedName = name.toLowerCase().trim();
  if (normalizedName === 'system' || normalizedName.includes('system')) {
    return { isValid: false, error: 'Actor name cannot be "System".' };
  }

  return { isValid: true, error: null };
}

/**
 * Parse a full class-diagram method signature such as
 *   "+ validateCredentials(username: String, password: String): Boolean"
 * into its structural components: visibility, name, parameters (name + type),
 * and return type. Previously the engine discarded everything after the name,
 * so parameter/return/visibility mismatches were invisible.
 *
 * Returns null for empty/meaningless signatures.
 */
function parseMethodSignature(raw) {
  const str = String(raw || '').trim();
  if (!str) return null;

  // Visibility prefix: + public, - private, # protected, ~ package
  let visibility = null;
  let body = str;
  const visMatch = str.match(/^([+\-#~])\s*/);
  if (visMatch) {
    visibility = visMatch[1];
    body = str.slice(visMatch[0].length).trim();
  }

  // Return type: "name(params): Type" — find the top-level colon (depth 0).
  let returnType = null;
  let namePart = body;
  {
    let depth = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ':' && depth === 0) {
        namePart = body.slice(0, i).trim();
        returnType = body.slice(i + 1).trim();
        break;
      }
    }
  }

  if (!namePart) return null;

  // Extract method name and the parenthesized parameter list.
  const openParen = namePart.indexOf('(');
  let name = namePart;
  let paramsStr = '';
  if (openParen !== -1) {
    name = namePart.slice(0, openParen).trim();
    const closeParen = namePart.lastIndexOf(')');
    paramsStr = closeParen > openParen ? namePart.slice(openParen + 1, closeParen) : namePart.slice(openParen + 1);
  }

  if (!name) return null;

  const parameters = (paramsStr ? paramsStr.split(',') : [])
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const colonIdx = p.indexOf(':');
      if (colonIdx === -1) return { name: p, type: null };
      return { name: p.slice(0, colonIdx).trim(), type: p.slice(colonIdx + 1).trim() || null };
    });

  return { visibility, name, parameters, returnType, raw: str };
}

/**
 * Parse a class-diagram attribute such as "- id: int" or "+ price: BigDecimal"
 * into { visibility, name, type }. Attribute names are free text (they may
 * contain spaces), so only the trailing ": type" part is separated out.
 * Returns null for empty/meaningless attributes.
 */
function parseClassAttribute(raw) {
  const str = String(raw || '').trim();
  if (!str) return null;

  let visibility = null;
  let body = str;
  const visMatch = str.match(/^([+\-#~])\s*/);
  if (visMatch) {
    visibility = visMatch[1];
    body = str.slice(visMatch[0].length).trim();
  }

  const colonIdx = body.indexOf(':');
  let name = body;
  let type = null;
  if (colonIdx !== -1) {
    name = body.slice(0, colonIdx).trim();
    type = body.slice(colonIdx + 1).trim() || null;
  }

  if (!name) return null;
  return { visibility, name, type, raw: str };
}

function parseScenarioStep(stepText, availableActors = []) {
  const result = {
    subject: null,
    actor: null,
    action: null,
    verb: null,
    object: null,
    keywords: [],
    messageName: '',
    functionName: '',
    isReturn: false,
  };

  if (!stepText) return result;

  const text = stepText.trim();
  const textLower = text.toLowerCase();

  // Function-call message names, e.g. "submitPayment(payment)" or "enterLoginCredentials()".
  // Parsed before actor detection so parameters never leak into the object words.
  const funcCallMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*$/.exec(text);
  if (funcCallMatch) {
    const baseName = funcCallMatch[1];
    const paramsString = funcCallMatch[2] || '';
    const parameters = paramsString.split(',').map(p => p.trim()).filter(Boolean);

    const words = baseName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const filteredWords = words.filter((w) => !STOP_WORDS.has(w));
    result.keywords = filteredWords.map(lemmatizeToken);
    result.messageName = baseName;
    result.functionName = parameters.length > 0
      ? `${baseName}(${parameters.join(', ')})`
      : `${baseName}()`;
    result.parameters = parameters;

    if (filteredWords.length > 0) {
      result.verb = lemmatizeToken(filteredWords[0].toLowerCase());
      result.object = filteredWords.slice(1).map(lemmatizeToken).join(' ');
    }
    return result;
  }

  for (const actor of availableActors) {
    if (actor && textLower.startsWith(actor.toLowerCase())) {
      result.subject = actor;
      result.actor = actor;
      result.action = text.slice(actor.length).trim();
      break;
    }
  }

  if (!result.actor && textLower.startsWith('system')) {
    result.subject = 'System';
    result.actor = 'System';
    result.action = text.slice(6).trim();
  }

  if (!result.actor) {
    result.action = text;
  }

  const retWords = result.action ? result.action.toLowerCase().split(/\s+/) : [];
  result.isReturn = (result.actor === 'System') || retWords.some((w) => Array.from(RETURN_KEYWORDS).includes(w));

  const words = (result.action || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const filteredWords = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
  result.keywords = filteredWords.map(lemmatizeToken);

  if (filteredWords.length > 0) {
    const rawVerb = filteredWords[0].toLowerCase();
    result.verb = lemmatizeToken(rawVerb);
    
    const objWords = filteredWords.slice(1).map(lemmatizeToken);
    result.object = objWords.join(' ');

    const camelObj = objWords
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');

    result.messageName = result.verb + camelObj;
    result.functionName = `${result.messageName}()`;
  }

  return result;
}

module.exports = {
  validateSentence,
  classifySystemStep,
  suggestFromSentence,
  validateUseCaseName,
  validateActorName,
  parseScenarioStep,
  parseMethodSignature,
  parseClassAttribute,
};
