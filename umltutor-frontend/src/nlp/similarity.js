import { MATCH_THRESHOLD, STOP_WORDS } from './constants';

export function levenshteinDistance(a, b) {
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

export function similarity(a, b) {
  const maxLen = Math.max(a ? a.length : 0, b ? b.length : 0);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

export function bestMatch(target, candidates) {
  let best = { score: 0, candidate: null, index: -1 };
  candidates.forEach((c, i) => {
    const score = similarity(target, c);
    if (score > best.score) best = { score, candidate: c, index: i };
  });
  return best;
}

export function fuzzyMatch(stepText, messageName) {
  const stepNorm = (stepText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const msgNorm = (messageName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!stepNorm || !msgNorm) return false;
  if (stepNorm.includes(msgNorm) || msgNorm.includes(stepNorm)) return true;
  const sim = similarity(stepNorm, msgNorm);
  if (sim >= MATCH_THRESHOLD) return true;
  return false;
}

export function normalizeToken(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function fuzzyIncludes(haystack, needle) {
  const h = normalizeToken(haystack);
  const n = normalizeToken(needle);
  if (!h || !n) return false;
  return h.includes(n) || n.includes(h);
}

export function normalizeName(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
