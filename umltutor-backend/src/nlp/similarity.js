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

function areSynonyms(wordA, wordB) {
  const a = lemmatizeToken(wordA);
  const b = lemmatizeToken(wordB);
  if (a === b) return true;

  for (const group of (SYNONYM_GROUPS || [])) {
    if (group.has(a) && group.has(b)) return true;
  }
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

  const objA = keywordsA.slice(1).join(' ');
  const objB = keywordsB.slice(1).join(' ');
  const objMatch = objA && objB ? (objA === objB || fuzzyIncludes(objA, objB)) : true;

  if (verbMatch && objMatch) {
    return { score: 0.88, matchType: 'STRONG', reason: 'Verb synonym and object match' };
  }

  let matchedCount = 0;
  for (const kwA of keywordsA) {
    for (const kwB of keywordsB) {
      if (areSynonyms(kwA, kwB) || fuzzyIncludes(kwA, kwB)) {
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
};
