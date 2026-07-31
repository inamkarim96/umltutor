"use strict";

const constants = require('./constants');
const similarity = require('./similarity');
const sentenceUtils = require('./sentenceUtils');

module.exports = {
  ...constants,
  ...similarity,
  ...sentenceUtils,
  constants,
  similarity: {
    ...similarity,
    levenshteinDistance: similarity.levenshteinDistance,
    similarity: similarity.similarity,
    bestMatch: similarity.bestMatch,
    fuzzyMatch: similarity.fuzzyMatch,
    normalizeToken: similarity.normalizeToken,
    fuzzyIncludes: similarity.fuzzyIncludes,
    extractKeywords: similarity.extractKeywords,
  },
  sentenceUtils,
};
