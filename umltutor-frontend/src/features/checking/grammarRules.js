// Re-export from centralized NLP module to eliminate frontend/backend drift
import { VERB_DICTIONARY, STOP_WORDS } from '../../nlp/constants';
import { validateSentence } from '../../nlp/sentenceUtils';
import { levenshteinDistance, similarity, bestMatch, fuzzyMatch, normalizeToken, fuzzyIncludes, normalizeName } from '../../nlp/similarity';

export { VERB_DICTIONARY, STOP_WORDS, validateSentence };
export { levenshteinDistance, similarity, bestMatch, fuzzyMatch, normalizeToken, fuzzyIncludes, normalizeName };

import { validateUseCaseName, validateActorName, suggestFromSentence } from '../../nlp/sentenceUtils';
export { validateUseCaseName, validateActorName, suggestFromSentence };

export const VERB_DICTIONARY_ARRAY = Array.from(VERB_DICTIONARY);
export const STOP_WORDS_ARRAY = Array.from(STOP_WORDS);
