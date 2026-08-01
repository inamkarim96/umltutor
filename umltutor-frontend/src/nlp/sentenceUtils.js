import { VERB_DICTIONARY, INTERNAL_VERBS, EXTERNAL_VERBS, STOP_WORDS } from './constants';

export function validateSentence(text) {
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

export function classifySystemStep(stepText) {
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
  // Unclassified system processing is internal (self-loop), NOT an external response.
  return 'self';
}

export function suggestFromSentence(sentence) {
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

export function validateUseCaseName(name) {
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

export function validateActorName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Actor name is required.' };
  }
  const normalizedName = name.toLowerCase().trim();
  if (normalizedName === 'system' || normalizedName.includes('system')) {
    return { isValid: false, error: 'Actor name cannot be "System".' };
  }
  return { isValid: true, error: null };
}

export function parseMethodSignature(raw) {
  const str = String(raw || '').trim();
  if (!str) return null;

  let visibility = null;
  let body = str;
  const visMatch = str.match(/^([+\-#~])\s*/);
  if (visMatch) {
    visibility = visMatch[1];
    body = str.slice(visMatch[0].length).trim();
  }

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

export function parseClassAttribute(raw) {
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
