"use strict";

// Suggestion Engine
// Generates concrete, actionable repair suggestions for issues detected by the
// consistency engine. Each suggestion includes a step, target, and example so
// the frontend can guide students toward a fix.

const { semanticProcessor } = require('../nlp/semanticService');
const { evaluateFunctionMatch, fuzzyMatch } = require('../nlp/similarity');

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
    const rawSuggestions = [];
    const elementsToKeep = new Set();

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
        rawSuggestions.push({ ...base, type: 'REPAIR', action: context.suggestion });
      }

      if (context.suggestedSignature) {
        const sig = context.suggestedSignature.endsWith('()') ? context.suggestedSignature : `${context.suggestedSignature}()`;
        rawSuggestions.push({
          ...base,
          type: 'REPAIR',
          action: `Add message "${sig}" to align with the scenario flow.`
        });
        const cleanName = sig.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (cleanName) elementsToKeep.add(cleanName);
      }

      if (context.suggestedName && issue.code === 'CLASS_ENTITY_SUGGESTION') {
        rawSuggestions.push({
          ...base,
          type: 'SUGGESTION',
          action: `Consider adding class "${context.suggestedName}" to the Class Diagram.`
        });
        const cleanName = context.suggestedName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (cleanName) elementsToKeep.add(cleanName);
      }

      if (context.suggestedOperation) {
        const op = context.suggestedOperation.endsWith('()') ? context.suggestedOperation : `${context.suggestedOperation}()`;
        const targetClass = context.className ? ` on class "${context.className}"` : '';
        rawSuggestions.push({
          ...base,
          type: 'REPAIR',
          action: `Define operation "${op}"${targetClass} in the Class Diagram.`
        });
        const cleanName = op.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (cleanName) elementsToKeep.add(cleanName);
      }

      const nearest = context.suggestions || {};
      if (nearest.nearestFunction || nearest.nearestFunctionWithParam || nearest.nearestMessage) {
        const candidateName = nearest.nearestFunctionWithParam || nearest.nearestFunction || nearest.nearestMessage;
        rawSuggestions.push({
          ...base,
          type: 'NAMING',
          action: `Consider naming it "${candidateName}".`
        });
        const cleanName = candidateName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (cleanName) elementsToKeep.add(cleanName);
      }

      // Track elements recommended to add, keep, or rename to
      if (context.suggestion) {
        const match = context.suggestion.match(/["']([a-zA-Z0-9_()]+)["']/);
        if (match) {
          const clean = match[1].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          if (clean && !context.suggestion.toLowerCase().includes('remove') && !context.suggestion.toLowerCase().includes('delete')) {
            elementsToKeep.add(clean);
          }
        }
      }

      // Handle CLASS_ATTRIBUTE_MISSING - suggest adding the missing attribute
      if (issue.code === 'CLASS_ATTRIBUTE_MISSING' && context.className && context.attribute) {
        const attrDecl = `- ${context.attribute}: String`;
        rawSuggestions.push({
          ...base,
          type: 'REPAIR',
          action: `Add attribute "${attrDecl}" to class "${context.className}".`
        });
        elementsToKeep.add(context.attribute.toLowerCase());
      }

      // Handle CLASS_ASSOCIATION_MISSING - suggest adding the missing association
      if (issue.code === 'CLASS_ASSOCIATION_MISSING' && context.source && context.target) {
        rawSuggestions.push({
          ...base,
          type: 'REPAIR',
          action: `Add an association line between "${context.source}" and "${context.target}" in the Class Diagram.`
        });
        elementsToKeep.add(`${context.source}-${context.target}`.toLowerCase());
      }

      // Handle CLASS_INHERITANCE_MISSING - suggest adding the missing inheritance
      if (issue.code === 'CLASS_INHERITANCE_MISSING' && context.child && context.parent) {
        rawSuggestions.push({
          ...base,
          type: 'REPAIR',
          action: `Add an inheritance (generalization) arrow from "${context.child}" to "${context.parent}".`
        });
        elementsToKeep.add(`${context.child}-${context.parent}`.toLowerCase());
      }

      // Handle CLASS_INHERITANCE_REDUNDANT_ATTR - suggest removing redundant attribute
      if (issue.code === 'CLASS_INHERITANCE_REDUNDANT_ATTR' && context.child && context.attribute) {
        rawSuggestions.push({
          ...base,
          type: 'REPAIR',
          action: `Remove attribute "${context.attribute}" from class "${context.child}"; it is already inherited from "${context.parent}".`
        });
      }
    });

    // Deduplicate and suppress contradictory repair actions
    const seenActions = new Set();
    const finalSuggestions = [];

    for (const s of rawSuggestions) {
      const actionText = String(s.action || '').trim();
      if (!actionText) continue;

      const normAction = actionText.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Deduplicate identical action texts regardless of issue code
      if (seenActions.has(normAction)) continue;

      // Suppress contradictory repair actions (e.g. suggesting deleting a message that another check validates or suggests adding/keeping)
      const isDestructive = actionText.toLowerCase().includes('delete') || actionText.toLowerCase().includes('remove');
      if (isDestructive) {
        let isContradictory = false;
        for (const elem of elementsToKeep) {
          if (elem.length > 3 && normAction.includes(elem)) {
            isContradictory = true;
            break;
          }
        }
        if (isContradictory) continue;
      }

      seenActions.add(normAction);
      finalSuggestions.push(s);
    }

    return finalSuggestions;
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
