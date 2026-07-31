"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

// Centralized NLP Semantic Processing Service
// Provides a shared source of truth for semantic extraction across all validation phases

const {
  VERB_DICTIONARY,
  INTERNAL_VERBS,
  EXTERNAL_VERBS,
  STOP_WORDS,
  MATCH_THRESHOLD,
  PARTIAL_THRESHOLD,
  SYNONYM_GROUPS,
  LEMMATIZATION_MAP,
  SSD_VERBS,
  RETURN_KEYWORDS,
  SYSTEM_INVALID_NAMES
} = require('./constants');

const {
  normalizeToken,
  fuzzyIncludes,
  lemmatizeToken,
  areSynonyms,
  evaluateFunctionMatch,
  extractKeywords
} = require('./similarity');

const {
  validateSentence,
  classifySystemStep,
  suggestFromSentence,
  parseScenarioStep: parseScenarioStepUtils
} = require('./sentenceUtils');

class SemanticRepresentation {
  constructor(data = {}) {
    // Core semantic components
    this.subject = data.subject || null;
    this.action = data.action || null;
    this.verb = data.verb || null;
    this.object = data.object || null;
    this.target = data.target || null;
    this.keywords = data.keywords || [];
    this.semanticKeywords = data.semanticKeywords || [];

    // Function and message naming
    this.functionName = data.functionName || null;
    this.messageName = data.messageName || null;
    this.parameters = data.parameters || [];

    // System context
    this.sender = data.sender || null;
    this.receiver = data.receiver || null;
    this.isReturn = data.isReturn || false;
    this.systemClass = data.systemClass || null;

    // Semantic confidence and metadata
    this.semanticHash = data.semanticHash || this.calculateSemanticHash();
    this.sourceStep = data.sourceStep || null;
    this.sourceUCFId = data.sourceUCFId || null;
    this.confidence = data.confidence || 1.0;
    this.reasoning = data.reasoning || '';
  }

  calculateSemanticHash() {
    const hashComponents = [
      this.action || '',
      this.object || '',
      this.verb || '',
      this.subject || '',
      this.keywords?.join(',') || ''
    ].sort().join('|');

    return this.hashString(hashComponents);
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  static fromSentence(sentence, options = {}) {
    const parsed = parseScenarioStepUtils(sentence, options.availableActors || []);

    return new SemanticRepresentation({
      subject: parsed.subject,
      action: parsed.action,
      verb: parsed.verb,
      object: parsed.object,
      keywords: parsed.keywords,
      messageName: parsed.messageName,
      functionName: parsed.functionName,
      sender: parsed.sender,
      receiver: parsed.receiver,
      isReturn: parsed.isReturn,
      semanticKeywords: extractKeywords(sentence)
    });
  }

  static fromSSDMessage(message, options = {}) {
    const text = message.name || message.text || message.label || '';
    const parameters = message.parameters || [];
    const isAsync = message.isAsync || message.type === 'asynchronous';
    const isReturn = message.isReturn || message.type === 'return';

    const parsed = parseScenarioStepUtils(text, options.availableActors || []);

    // Extract semantic function name with parameters
    const funcName = parsed.functionName || parsed.messageName;
    const camelCaseFunc = this.generateFunctionName(text);

    return new SemanticRepresentation({
      subject: parsed.subject,
      action: parsed.action,
      verb: parsed.verb,
      object: parsed.object,
      keywords: parsed.keywords,
      messageName: parsed.messageName || funcName,
      functionName: camelCaseFunc,
      parameters: parameters,
      sender: message.senderLabel || message.senderId,
      receiver: message.receiverLabel || message.receiverId,
      isReturn: isReturn || parsed.isReturn,
      systemClass: options.className,
      semanticKeywords: extractKeywords(text),
      sourceStep: message.stepNo || message.order,
      sourceUCFId: options.ucId,
      confidence: this.calculateMessageConfidence(message)
    });
  }

  static generateFunctionName(sentence) {
    const words = sentence.trim().toLowerCase().split(/\s+/);
    const contentWords = words.filter(w => !STOP_WORDS.has(w));

    if (contentWords.length === 0) {
      return sentence.replace(/\s+(\w)/g, (_, c) => c.toUpperCase()) + '()';
    }

    const verb = contentWords[0];
    const objects = contentWords.slice(1);
    const camelParts = [verb, ...objects.map(w => w.charAt(0).toUpperCase() + w.slice(1))];

    return camelParts.join('') + '()';
  }

  static calculateMessageConfidence(message) {
    let confidence = 1.0;

    // Boost confidence if message has standard format (action(parameters))
    if (message.name && typeof message.name === 'string') {
      if (message.name.includes('(') && message.name.includes(')')) {
        confidence = 0.95;
      }
    }

    // Increase confidence for sync messages
    if (message.type === 'synchronous') {
      confidence = confidence * 0.9;
    } else if (message.type === 'external') {
      confidence = confidence * 0.85;
    } else if (message.type === 'self') {
      confidence = confidence * 0.8;
    }

    // Decrease confidence for unknown message types
    if (['lost', 'found', 'create', 'delete'].includes(message.type)) {
      confidence = confidence * 0.85;
    }

    return Math.min(confidence, 1.0);
  }

  compareSemantic(other, options = {}) {
    if (!other) return { score: 0, type: 'UNRELATED', reason: 'Target is empty' };

    const matchOptions = {
      allowParameterDiff: options.allowParameterDiff || false,
      allowSubjectDiff: options.allowSubjectDiff || false,
      actionWeight: options.actionWeight || 0.4,
      objectWeight: options.objectWeight || 0.3,
      verbWeight: options.verbWeight || 0.3,
      ...options
    };

    // Direct identifier match
    if (this.semanticHash === other.semanticHash) {
      return { score: 1.0, type: 'EXACT', reason: 'Exact semantic match' };
    }

    // Check if both are the same action + object
    const actionMatch = this.action.toLowerCase() === other.action?.toLowerCase();
    const verbMatch = this.verb?.toLowerCase() === other.verb?.toLowerCase();
    const objectMatch = this.object?.toLowerCase() === other.object?.toLowerCase();

    if (actionMatch && objectMatch) {
      return { score: 0.95, type: 'SEMANTIC_EXACT', reason: 'Identical action and object' };
    }

    // Calculate weighted similarity score
    let score = 0;
    let reason = '';

    if (verbMatch) {
      score += matchOptions.verbWeight * 0.9;
      reason += 'Verb match; ';
    }

    if (objectMatch) {
      score += matchOptions.objectWeight * 0.95;
      reason += 'Object match; ';
    }

    const actionSimilarity = this.calculateSemanticSimilarity(this.action, other.action);
    score += matchOptions.actionWeight * actionSimilarity;
    reason += `Action similarity (${(actionSimilarity * 100).toFixed(1)}%); `;

    // Filter out noise words from reason
    reason = reason
      .replace(/^Semi ?, /gi, '')
      .replace(/^ and, /gi, '')
      .replace(/^; \s*$/, '');

    if (score >= 0.8) {
      return { score, type: 'STRONG_SEMANTIC', reason: reason.trim() || 'Strong semantic match' };
    } else if (score >= 0.5) {
      return { score, type: 'SEMANTIC', reason: reason.trim() || 'Semantic match' };
    } else if (score >= 0.25) {
      return { score, type: 'PARTIAL_SEMANTIC', reason: 'Partial semantic match' };
    } else {
      return { score, type: 'WEAK_SEMANTIC', reason: 'Weak semantic similarity' };
    }
  }

  /**
   * Compare this semantic representation to another purely on keyword overlap.
   * Returns a 0..1 score. Used to catch cases where structured fields are
   * sparse but the raw vocabulary still aligns (or clearly diverges).
   */
  compareKeywords(other, options = {}) {
    if (!other) return 0;

    const a = (this.semanticKeywords || []).map((k) => String(k).toLowerCase());
    const b = (other.semanticKeywords || []).map((k) => String(k).toLowerCase());
    if (a.length === 0 || b.length === 0) return 0;

    let matched = 0;
    a.forEach((ka) => {
      if (b.some((kb) => areSynonyms(ka, kb) || fuzzyIncludes(ka, kb))) {
        matched++;
      }
    });

    const maxLen = Math.max(a.length, b.length);
    return matched / maxLen;
  }

  calculateSemanticSimilarity(actionA, actionB) {
    if (!actionA || !actionB) return 0;

    const normA = actionA.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normB = actionB.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normA === normB) return 1.0;

    // Check if one is the root of the other
    const isRoot = (a, b) => b.startsWith(a) || a.startsWith(b);
    if (isRoot(normA, normB)) return 0.9;

    // Calculate Levenshtein similarity
    const maxLen = Math.max(normA.length, normB.length);
    if (maxLen === 0) return 1;

    const distance = this.levenshteinDistance(normA, normB);
    return 1 - distance / maxLen;
  }

  levenshteinDistance(a, b) {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = (b.charCodeAt(i - 1) === a.charCodeAt(j - 1)) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[b.length][a.length];
  }

  toJSON() {
    return {
      subject: this.subject,
      action: this.action,
      verb: this.verb,
      object: this.object,
      target: this.target,
      keywords: this.keywords,
      semanticKeywords: this.semanticKeywords,
      functionName: this.functionName,
      messageName: this.messageName,
      parameters: this.parameters,
      sender: this.sender,
      receiver: this.receiver,
      isReturn: this.isReturn,
      systemClass: this.systemClass,
      semanticHash: this.semanticHash,
      sourceStep: this.sourceStep,
      sourceUCFId: this.sourceUCFId,
      confidence: this.confidence
    };
  }

  static fromJSON(data) {
    return new SemanticRepresentation(data);
  }
}

class SemanticProcessor {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
    this.classTokensCache = new Map();
  }

  // Main entry point for processing use case description steps
  processDescriptionStep(stepText, useCaseId, availableActors = []) {
    const cacheKey = `desc-step:${useCaseId}:${stepText}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const semantic = SemanticRepresentation.fromSentence(stepText, {
      availableActors,
      ucId: useCaseId
    });

    this.cache.set(cacheKey, semantic);
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return semantic;
  }

  // Process entire description for a use case
  processDescription(descriptionData, useCaseId) {
    const result = {
      useCaseId,
      semantics: [],
      functionNames: [],
      messages: []
    };

    if (!descriptionData.mainFlow || !Array.isArray(descriptionData.mainFlow)) {
      return result;
    }

    descriptionData.mainFlow.forEach((step, index) => {
      const semantic = this.processDescriptionStep(
        step.action || step,
        useCaseId,
        [] // Could pass available actors from diagram
      );

      result.semantics.push(semantic);
      if (semantic.functionName) {
        result.functionNames.push(semantic.functionName);
      }
      if (semantic.messageName) {
        result.messages.push(semantic.messageName);
      }
    });

    return result;
  }

  // Process SSD message
  processSSDMessage(message, useCaseId, className = null) {
    const cacheKey = `ssd-msg:${useCaseId}:${message.name || message.id}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const semantic = SemanticRepresentation.fromSSDMessage(message, {
      ucId: useCaseId,
      className
    });

    this.cache.set(cacheKey, semantic);
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return semantic;
  }

  // Process entire SSD for a use case
  processSSD(ssdData, useCaseId) {
    const result = {
      useCaseId,
      semantics: [],
      functionNames: [],
      messages: [],
      lifelineMappings: {}
    };

    if (!ssdData.lifelines || !ssdData.messages) {
      return result;
    }

    // Build lifeline mapping
    ssdData.lifelines.forEach(lifeline => {
      result.lifelineMappings[lifeline.id] = lifeline;
    });

    // Process messages
    ssdData.messages.forEach(message => {
      const semantic = this.processSSDMessage(message, useCaseId);
      result.semantics.push(semantic);

      if (semantic.functionName) {
        result.functionNames.push(semantic.functionName);
      }
      if (semantic.messageName) {
        result.messages.push(semantic.messageName);
      }
    });

    return result;
  }

  // Convert entire use case description to semantic representations
  extractAllSemanticsFromDescriptions(descriptions, diagramAnalysis = {}) {
    const result = {};

    Object.entries(descriptions).forEach(([useCaseId, description]) => {
      result[useCaseId] = this.processDescription(description, useCaseId);
    });

    return result;
  }

  // Convert entire SSD collection to semantic representations
  extractAllSemanticsFromSSDs(ssds, diagramAnalysis = {}) {
    const result = {};

    Object.entries(ssds).forEach(([useCaseId, ssdData]) => {
      result[useCaseId] = this.processSSD(ssdData, useCaseId);
    });

    return result;
  }

  // Find best semantic match between description and SSD
  findBestSemanticMatch(descSemantics, ssdSemantics, options = {}) {
    const matches = [];

    descSemantics.forEach(descSemantic => {
      let bestMatch = null;
      let bestScore = 0;

      ssdSemantics.forEach(ssdSemantic => {
        const comparison = descSemantic.compareSemantic(ssdSemantic, options);

        if (comparison.score > bestScore) {
          bestScore = comparison.score;
          bestMatch = {
            descriptionSemantic: descSemantic,
            ssdSemantic: ssdSemantic,
            score: comparison.score,
            type: comparison.type,
            reason: comparison.reason
          };
        }
      });

      if (bestMatch && bestScore > 0) {
        matches.push(bestMatch);
      }
    });

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Find best semantic match between description steps and SSD messages
   * using combined structured + keyword-overlap scoring.
   */
  findBestStepMessageMatch(stepSemantics, messageSemantics, options = {}) {
    const matches = [];
    const threshold = options.threshold || 0;

    stepSemantics.forEach((stepSemantic, stepIdx) => {
      let bestMatch = null;
      let bestScore = 0;

      messageSemantics.forEach((msgSemantic, msgIdx) => {
        const structured = stepSemantic.compareSemantic(msgSemantic, options);
        const keywordScore = stepSemantic.compareKeywords(msgSemantic, options);
        const combined = Math.max(structured.score, keywordScore);

        if (combined > bestScore) {
          bestScore = combined;
          bestMatch = {
            stepIndex: stepIdx,
            messageIndex: msgIdx,
            score: combined,
            structuredScore: structured.score,
            keywordScore,
            type: structured.type,
            reason: structured.reason || 'Best keyword match'
          };
        }
      });

      if (bestMatch && bestScore >= threshold) {
        matches.push(bestMatch);
      }
    });

    return matches.sort((a, b) => b.score - a.score);
  }

  // Extract all unique function names from semantic data
  extractFunctionNames(semantics) {
    const functionSet = new Set();
    const messageSet = new Set();

    semantics.forEach(semantic => {
      if (semantic.functionName) {
        functionSet.add(semantic.functionName);
      }
      if (semantic.messageName) {
        messageSet.add(semantic.messageName);
      }
    });

    return {
      functions: Array.from(functionSet),
      messages: Array.from(messageSet)
    };
  }

  /**
   * Build a full semantic traceability report across all 5 artifact stages
   * (ucd → description → ssd → class → sequence). Extracts semantic tokens
   * per stage, then checks each adjacent stage pair for token coverage.
   */
  buildTraceabilityReport(useCaseId, stages = {}, options = {}) {
    const stageNames = ['ucd', 'description', 'ssd', 'class', 'sequence'];
    const tokenMap = {};
    const roleWords = new Set((options.actorLabels || []).map((a) => String(a).toLowerCase()));

    stageNames.forEach((name) => {
      const tokens = this._extractStageTokens(name, stages[name]);
      tokenMap[name] = new Set(
        tokens.filter((t) => t && t.length > 2 && !roleWords.has(t) && !this._isRoleWord(t))
      );
    });

    const links = [];
    const gaps = [];

    for (let i = 0; i < stageNames.length - 1; i++) {
      const fromStage = stageNames[i];
      const toStage = stageNames[i + 1];

      const fromTokens = Array.from(tokenMap[fromStage] || []);
      const toTokens = Array.from(tokenMap[toStage] || []);

      fromTokens.forEach((token) => {
        const covered = toTokens.some((cand) =>
          areSynonyms(token, cand) || fuzzyIncludes(token, cand)
        );
        links.push({
          token,
          fromStage,
          toStage,
          covered
        });
        if (!covered) {
          gaps.push({
            token,
            fromStage,
            toStage,
            suggestion: `Semantic token "${token}" in ${fromStage} has no counterpart in ${toStage}.`
          });
        }
      });
    }

    const totalLinks = links.length;
    const coveredLinks = links.filter((l) => l.covered).length;

    return {
      useCaseId,
      coverage: {
        totalLinks,
        coveredLinks,
        coverageRatio: totalLinks === 0 ? 1 : coveredLinks / totalLinks
      },
      links,
      gaps
    };
  }

  _isRoleWord(token) {
    const norm = String(token).toLowerCase();
    return ['user', 'system', 'actor', 'admin', 'student', 'teacher', 'customer', 'shopper', 'seller', 'doctor', 'patient', 'receptionist', 'tech', 'maintenance'].includes(norm);
  }

  _extractStageTokens(stageName, stageData) {
    if (!stageData) return [];

    switch (stageName) {
      case 'ucd':
        return this._tokensFromNames([stageData.label || stageData.name]);
      case 'description':
        return this._tokensFromSteps(stageData);
      case 'ssd':
        return this._tokensFromMessages(stageData);
      case 'class':
        return this._tokensFromClasses(stageData);
      case 'sequence':
        return this._tokensFromMessages(stageData);
      default:
        return [];
    }
  }

  _tokensFromNames(names) {
    const tokens = [];
    (names || []).forEach((n) => {
      if (!n) return;
      const rep = SemanticRepresentation.fromSentence(String(n));
      tokens.push(...(rep.semanticKeywords || []).map((k) => String(k).toLowerCase()));
    });
    return tokens;
  }

  _tokensFromSteps(description) {
    const tokens = [];
    (description?.mainFlow || []).forEach((step) => {
      const text = step.action || step;
      if (!text) return;
      const rep = SemanticRepresentation.fromSentence(String(text));
      tokens.push(...(rep.semanticKeywords || []).map((k) => String(k).toLowerCase()));
    });
    return tokens;
  }

  _tokensFromMessages(semanticData) {
    const tokens = [];
    (semanticData?.messages || []).forEach((m) => {
      const name = m.name || m.text || m.label;
      if (!name) return;
      const rep = SemanticRepresentation.fromSSDMessage(m, {});
      tokens.push(...(rep.semanticKeywords || []).map((k) => String(k).toLowerCase()));
    });
    return tokens;
  }

  _tokensFromClasses(classDiagram) {
    if (!classDiagram?.nodes?.length) return [];

    const signature = JSON.stringify((classDiagram.nodes || []).map((n) => ({
      t: n.type,
      l: n.data?.label || n.label || '',
      m: n.data?.methods || []
    })));

    if (this.classTokensCache.has(signature)) {
      return this.classTokensCache.get(signature);
    }

    const tokens = [];
    (classDiagram.nodes || []).forEach((node) => {
      if (node.type !== 'class' && node.type !== 'interface') return;
      const rep = SemanticRepresentation.fromSentence(node.data?.label || node.label || '');
      tokens.push(...(rep.semanticKeywords || []).map((k) => String(k).toLowerCase()));
      (node.data?.methods || []).forEach((raw) => {
        const methodName = String(raw).replace(/^[\+\-\#~]\s*/, '').split('(')[0].trim();
        if (!methodName) return;
        const methodRep = SemanticRepresentation.fromSentence(methodName);
        tokens.push(...(methodRep.semanticKeywords || []).map((k) => String(k).toLowerCase()));
      });
    });

    if (this.classTokensCache.size > 20) {
      const firstKey = this.classTokensCache.keys().next().value;
      this.classTokensCache.delete(firstKey);
    }
    this.classTokensCache.set(signature, tokens);
    return tokens;
  }

  // Generate validation suggestions based on semantic mismatches
  generateValidationSuggestions(mismatchInfo, context = {}) {
    const suggestions = [];

    if (mismatchInfo.type === 'SEMANTIC_FUNCTION_MISSING') {
      suggestions.push({
        type: 'MISSING_CLASS_OPERATION',
        severity: 'error',
        message: `SSD contains \`${mismatchInfo.ssdFunction}\`, but no matching function found in semantic database.`,
        suggestion: `Add \`${mismatchInfo.ssdFunction}\` to the appropriate class based on semantic intent.`,
        example: `Class: ${mismatchInfo.suggestedClass} + ${mismatchInfo.ssdFunction}(${mismatchInfo.parameters?.join(', ') || ''})`
      });
    }

    if (mismatchInfo.type === 'SEMANTIC_TRAIL_GAP') {
      suggestions.push({
        type: 'SEMANTIC_TRACEABILITY_GAP',
        severity: 'warning',
        message: `Semantic chain broken between ${mismatchInfo.fromStage} and ${mismatchInfo.toStage}.`,
        suggestion: `Review the semantic intent of steps in ${mismatchInfo.stage} and ensure consistent naming conventions.`
      });
    }

    return suggestions;
  }
}

const semanticProcessor = new SemanticProcessor();

module.exports = {
  SemanticRepresentation,
  SemanticProcessor,
  semanticProcessor
};