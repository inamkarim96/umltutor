"use strict";

const { MATCH_THRESHOLD, PARTIAL_THRESHOLD, SYNONYM_GROUPS, LEMMATIZATION_MAP, STOP_WORDS } = require('./constants');

function levenshteinDistance(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = [];
  for (let i = 0; i <= bn; i++) matrix[i] = [i];
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      const cost = (a[j - 1] === b[i - 1]) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[bn][an];
}

function similarity(a, b) {
  const maxLen = Math.max(a ? a.length : 0, b ? b.length : 0);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function bestMatch(target, candidates) {
  let best = { score: 0, candidate: null, index: -1 };
  candidates.forEach((c, i) => {
    const score = similarity(target, c);
    if (score > best.score) best = { score, candidate: c, index: i };
  });
  return best;
}

function fuzzyMatch(stepText, messageName) {
  const stepNorm = (stepText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const msgNorm = (messageName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!stepNorm || !msgNorm) return false;
  if (stepNorm.includes(msgNorm) || msgNorm.includes(stepNorm)) return true;
  const sim = similarity(stepNorm, msgNorm);
  if (sim >= MATCH_THRESHOLD) return true;
  return false;
}

function normalizeToken(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fuzzyIncludes(haystack, needle) {
  const h = normalizeToken(haystack);
  const n = normalizeToken(needle);
  if (!h || !n) return false;
  return h.includes(n) || n.includes(h);
}

function extractKeywords(text) {
  const raw = (text || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  const words = raw
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return words.filter((w) => !STOP_WORDS.has(w));
}

function normalizeName(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lemmatizeToken(token) {
  const norm = (token || '').toLowerCase().trim();
  if (LEMMATIZATION_MAP[norm]) return LEMMATIZATION_MAP[norm];
  if (norm.endsWith('es') && !['process', 'guess', 'pass'].includes(norm)) {
    return norm.slice(0, -2);
  }
  if (norm.endsWith('s') && !['is', 'has', 'status', 'process'].includes(norm)) {
    return norm.slice(0, -1);
  }
  return norm;
}


function normalizeRoleToken(text) {
  let s = String(text || '').toLowerCase().trim();
  s = s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/^actor\s+|\s+actor\s*$/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+(?:member|members|user|users|person|people|client|clients)\s*$/i, '').trim();
  s = s.replace(/['\u2019]s$/, '').trim();
  return s;
}


function actorRoleSimilarity(roleA, roleB) {
  const a = normalizeRoleToken(roleA);
  const b = normalizeRoleToken(roleB);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const lemmaA = lemmatizeToken(a);
  const lemmaB = lemmatizeToken(b);
  if (lemmaA === lemmaB) return 0.97;

  const tokensA = a.split(/\s+/);
  const tokensB = b.split(/\s+/);

  // Multi-word role where one is a sub-phrase of the other ("staff member" vs "staff").
  if (tokensA.length > 1 || tokensB.length > 1) {
    const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
    const longer = tokensA.length <= tokensB.length ? tokensB : tokensA;
    if (shorter.every((t) => longer.some((lt) => lemmatizeToken(lt) === lemmatizeToken(t)))) {
      return 0.9;
    }
  }

  // Best per-token match; require the full shorter role to be covered.
  const shorterTokens = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longerTokens = tokensA.length <= tokensB.length ? tokensB : tokensA;
  let covered = 0;
  const used = new Set();
  for (const st of shorterTokens) {
    let best = 0;
    let bestIdx = -1;
    for (let i = 0; i < longerTokens.length; i++) {
      if (used.has(i)) continue;
      const lt = longerTokens[i];
      const ls = lemmatizeToken(st);
      const ll = lemmatizeToken(lt);
      let s = 0;
      if (ls === ll) s = 1;
      else if (areSynonyms(ls, ll)) s = 0.92;
      else if (fuzzyIncludes(ls, ll)) s = 0.85;
      else s = similarity(ls, ll);
      if (s > best) { best = s; bestIdx = i; }
    }
    if (best >= 0.72) { used.add(bestIdx); covered += best; }
  }
  if (shorterTokens.length > 0) {
    const avg = covered / shorterTokens.length;
    return Number(avg.toFixed(2));
  }
  return 0;
}

function classifyUseCaseMatch(studentLabel, reqLabel) {
  const match = evaluateFunctionMatch(String(studentLabel), String(reqLabel));
  if (match.score >= 0.85) return { ...match, kind: 'MATCH' };
  if (match.score >= 0.5 && (match.matchType === 'STRONG' || match.matchType === 'PARTIAL')) {
    const verbA = extractKeywords(String(studentLabel))[0];
    const verbB = extractKeywords(String(reqLabel))[0];
    const helpWords = ['delete', 'add', 'create', 'insert', 'update', 'edit', 'modify',
      'remove', 'cancel', 'change', 'register', 'view', 'see', 'show', 'save', 'publish'];
    const isOpposing = helpWords.includes(verbA) && helpWords.includes(verbB) && verbA !== verbB && !areSynonyms(verbA, verbB);
    if (isOpposing) return { score: match.score, kind: 'CONFLICT', reason: 'Opposing verb' };
    return { ...match, kind: 'PARTIAL' };
  }
  return { ...match, kind: 'UNRELATED' };
}

function fuzzy(a, b) {
  const na = String(a || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nb = String(b || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!na || !nb) return 0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  return similarity(na, nb);
}

function areSynonyms(wordA, wordB) {
  const a = lemmatizeToken(wordA);
  const b = lemmatizeToken(wordB);
  if (a === b) return true;

  for (const group of (SYNONYM_GROUPS || [])) {
    if (group.has(a) && group.has(b)) return true;
  }
  return false;
}

/**
 * Detect whether two function/sentence strings match via a phrasal verb,
 * e.g. "sign in" vs "login", "check out" vs "checkout", "log in" vs "login".
 * Scans the full raw text (before stop-word removal) for multi-word verbs.
 */
function checkPhrasalVerbMatch(funcA, funcB) {
  const a = (funcA || '').toLowerCase();
  const b = (funcB || '').toLowerCase();
  if (!a || !b) return false;

  const partsA = a.split(/\s+/);
  const partsB = b.split(/\s+/);

  const twoWordA = partsA.slice(0, 2).join(' ');
  const twoWordB = partsB.slice(0, 2).join(' ');

  if (areSynonyms(twoWordA, twoWordB)) return true;
  if (areSynonyms(twoWordA, partsB[0])) return true;
  if (areSynonyms(partsA[0], twoWordB)) return true;
  return false;
}

function evaluateFunctionMatch(funcA, funcB) {
  const cleanA = (funcA || '').split('(')[0].trim();
  const cleanB = (funcB || '').split('(')[0].trim();

  if (!cleanA || !cleanB) {
    return { score: 0, matchType: 'NONE', reason: 'Empty function name' };
  }

  if (cleanA.toLowerCase() === cleanB.toLowerCase()) {
    return { score: 1.0, matchType: 'EXACT', reason: 'Exact string match' };
  }

  const normA = normalizeToken(cleanA);
  const normB = normalizeToken(cleanB);
  if (normA === normB) {
    return { score: 0.95, matchType: 'EXACT', reason: 'Normalized string match' };
  }

  const keywordsA = extractKeywords(cleanA).map(lemmatizeToken);
  const keywordsB = extractKeywords(cleanB).map(lemmatizeToken);

  if (keywordsA.length === 0 || keywordsB.length === 0) {
    const sim = similarity(normA, normB);
    return {
      score: Number(sim.toFixed(2)),
      matchType: sim >= 0.75 ? 'STRONG' : (sim >= 0.5 ? 'PARTIAL' : 'NONE'),
      reason: 'Levenshtein similarity'
    };
  }

  const verbA = keywordsA[0];
  const verbB = keywordsB[0];
  const verbMatch = areSynonyms(verbA, verbB);

  // Phrasal verb detection: "sign in" == "login", "check out" == "checkout"
  // Operates on the raw normalized text so stop-word removal doesn't hide
  // multi-word verbs such as "sign in".
  const phrasalMatch = checkPhrasalVerbMatch(cleanA, cleanB);

  const objA = keywordsA.slice(1).join(' ');
  const objB = keywordsB.slice(1).join(' ');
  const objMatch = objA && objB ? (objA === objB || fuzzyIncludes(objA, objB)) : true;

  if (verbMatch && objMatch) {
    return { score: 0.88, matchType: 'STRONG', reason: 'Verb synonym and object match' };
  }

  if (phrasalMatch && objMatch) {
    return { score: 0.88, matchType: 'STRONG', reason: 'Phrasal verb synonym and object match' };
  }

  let matchedCount = 0;
  for (const kwA of keywordsA) {
    for (const kwB of keywordsB) {
      if (areSynonyms(kwA, kwB) || fuzzyIncludes(kwA, kwB) || similarity(kwA, kwB) >= 0.75) {
        matchedCount++;
        break;
      }
    }
  }

  const ratio = matchedCount / Math.max(keywordsA.length, keywordsB.length);

  if (ratio >= 0.7) {
    return { score: Number((0.7 + ratio * 0.2).toFixed(2)), matchType: 'STRONG', reason: 'High keyword overlap' };
  } else if (ratio >= 0.35 || verbMatch) {
    return { score: Number((0.4 + ratio * 0.3).toFixed(2)), matchType: 'PARTIAL', reason: 'Partial keyword overlap' };
  }

  const sim = similarity(normA, normB);
  return {
    score: Number(sim.toFixed(2)),
    matchType: sim >= 0.7 ? 'STRONG' : (sim >= 0.45 ? 'PARTIAL' : 'NONE'),
    reason: 'Fuzzy string match'
  };
}

module.exports = {
  levenshteinDistance,
  similarity,
  bestMatch,
  fuzzyMatch,
  normalizeToken,
  fuzzyIncludes,
  extractKeywords,
  normalizeName,
  lemmatizeToken,
  areSynonyms,
  evaluateFunctionMatch,
  checkPhrasalVerbMatch,
  normalizeRoleToken,
  actorRoleSimilarity,
  classifyUseCaseMatch,
  fuzzy,
};
