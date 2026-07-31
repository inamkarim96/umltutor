"use strict";

// Suggestion Engine
// Generates concrete, actionable repair suggestions for issues detected by the
// consistency engine. Each suggestion includes a step, target, and example so
// the frontend can guide students toward a fix.

const { semanticProcessor } = require('../nlp/semanticService');
const { evaluateFunctionMatch } = require('../nlp/similarity');

class SuggestionEngine {
  static ROLE_WORDS = new Set([
    'user', 'system', 'actor', 'admin', 'student', 'teacher', 'customer',
    'shopper', 'seller', 'doctor', 'patient', 'receptionist', 'tech',
    'maintenance', 'bank', 'clerk'
  ]);

  /**
   * Produce a camelCase function name suggestion from a natural-language step.
   * Delegates to the centralized semantic processor for consistent naming.
   */
  static suggestFunctionName(stepText) {
    if (!stepText) return null;
    const semantic = semanticProcessor.processDescriptionStep(stepText, 'suggestion');
    const keywords = (semantic.keywords || []).map((k) => String(k).toLowerCase());
    const verbIdx = keywords.findIndex((k) => !SuggestionEngine.ROLE_WORDS.has(k));
    const verb = verbIdx !== -1 ? keywords[verbIdx] : (semantic.verb || '');
    const object = keywords.filter((k, i) => i !== verbIdx && !SuggestionEngine.ROLE_WORDS.has(k)).join(' ');
    if (!verb) return null;

    const nearestMessage = [verb, object].filter(Boolean).join(' ');
    const camelParts = [verb, ...object.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1))];
    const nearestFunction = camelParts.join('') + '()';

    return {
      nearestMessage,
      nearestFunction,
      nearestFunctionWithParam: nearestFunction
    };
  }

  /**
   * Given the check result, attach a `suggestions` array built from each
   * issue's context (suggestion text, nearest function names, etc).
   */
  static generateSuggestions(result) {
    const suggestions = [];

    (result.issues || []).forEach((issue) => {
      const context = issue.context || {};

      const base = {
        code: issue.code,
        severity: issue.severity,
        message: issue.message,
        relatedId: issue.relatedId || null,
        location: issue.location || null
      };

      if (context.suggestion) {
        suggestions.push({ ...base, type: 'REPAIR', action: context.suggestion });
      }

      const nearest = context.suggestions || {};
      if (nearest.nearestFunction || nearest.nearestFunctionWithParam || nearest.nearestMessage) {
        suggestions.push({
          ...base,
          type: 'NAMING',
          action: `Consider naming it "${nearest.nearestFunctionWithParam || nearest.nearestFunction || nearest.nearestMessage}".`
        });
      }
    });

    // Deduplicate identical (code, action) pairs
    const seen = new Set();
    return suggestions.filter((s) => {
      const key = `${s.code}:${s.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Suggest which class should own an SSD/sequence message operation based on
   * semantic object matching against the available class names.
   */
  static suggestOperationOwner(messageName, classes = []) {
    if (!messageName || classes.length === 0) return null;

    const semantic = semanticProcessor.processSSDMessage({ name: messageName }, 'suggestion');
    const nouns = (semantic.semanticKeywords || [])
      .map((k) => String(k).toLowerCase());

    let bestClass = null;
    let bestScore = 0;

    classes.forEach((cls) => {
      const clsLower = (cls.label || cls.name || '').toLowerCase();
      const clsTokens = clsLower.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/);
      let score = 0;
      clsTokens.forEach((token) => {
        if (nouns.some((n) => n.includes(token) || token.includes(n))) score++;
      });
      if (score > bestScore) {
        bestScore = score;
        bestClass = cls;
      }
    });

    if (!bestClass || bestScore === 0) return null;

    const clean = messageName.split('(')[0].trim();
    return {
      className: bestClass.label || bestClass.name,
      operation: `${clean}()`,
      reason: `Class "${bestClass.label || bestClass.name}" best matches the semantic intent of "${messageName}".`
    };
  }
}

module.exports = { SuggestionEngine };
