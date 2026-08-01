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
  extractKeywords,
  levenshteinDistance,
  similarity
} = require('./similarity');

const {
  validateSentence,
  classifySystemStep,
  suggestFromSentence,
  parseScenarioStep: parseScenarioStepUtils
} = require('./sentenceUtils');

/**
 * Compare an SSD message's declared parameter list against a class method's
 * parameter list. Order-insensitive, synonym/fuzzy tolerant. Only flags a
 * mismatch when the SSD message actually declares parameters.
 */
function compareParameterLists(ssdParams, methodParams) {
  const ssd = (ssdParams || []).map((p) => String(p).trim()).filter(Boolean);
  const method = (methodParams || []).map((p) => String(p).trim()).filter(Boolean);

  if (ssd.length === 0) {
    return { matched: true, reason: 'SSD message declares no parameters' };
  }
  if (method.length === 0) {
    return { matched: false, reason: 'Class operation declares no parameters', ssdParams: ssd, methodParams: method };
  }
  if (ssd.length !== method.length) {
    return {
      matched: false,
      reason: `Parameter count mismatch (SSD: ${ssd.length}, method: ${method.length})`,
      ssdParams: ssd,
      methodParams: method
    };
  }

  const unmatched = ssd.filter((sp) => {
    const nSp = normalizeToken(sp);
    return !method.some((mp) => {
      const nMp = normalizeToken(mp);
      return (nSp && nSp === nMp) || areSynonyms(nSp, nMp) || fuzzyIncludes(sp, mp);
    });
  });

  if (unmatched.length === 0) {
    return { matched: true, reason: 'Parameters align by name', ssdParams: ssd, methodParams: method };
  }
  return {
    matched: false,
    reason: `Parameter name mismatch: ${unmatched.join(', ')}`,
    ssdParams: ssd,
    methodParams: method
  };
}

class SemanticRepresentation {
  constructor(data = {}) {
    // Core semantic components
    this.subject = data.subject || null;
    this.actor = data.actor || data.subject || null;
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
    this.messageType = data.messageType || 'synchronous';

    // Class-method signature metadata (populated by fromClassMethod)
    this.visibility = data.visibility || null;
    this.returnType = data.returnType || null;
    this.typedParameters = data.typedParameters || [];

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
      actor: parsed.actor,
      action: parsed.action,
      verb: parsed.verb,
      object: parsed.object,
      keywords: parsed.keywords,
      messageName: parsed.messageName,
      functionName: parsed.functionName,
      messageType: parsed.isReturn ? 'return' : 'synchronous',
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
    const messageType = isReturn ? 'return' : isAsync ? 'asynchronous' : 'synchronous';

    return new SemanticRepresentation({
      subject: parsed.subject,
      actor: parsed.actor || message.senderLabel || message.senderId,
      action: parsed.action,
      verb: parsed.verb,
      object: parsed.object,
      keywords: parsed.keywords,
      messageName: parsed.messageName || funcName,
      functionName: parsed.functionName || camelCaseFunc,
      parameters: parameters.length > 0 ? parameters : parsed.parameters || [],
      messageType,
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

  /**
   * Build a semantic representation from a parsed class-method signature
   * (see parseMethodSignature). Keeps visibility, return type and typed
   * parameters so the class<->SSD comparison can check more than the name.
   */
  static fromClassMethod(method, options = {}) {
    const { visibility, name, parameters, returnType } = method || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) return null;

    const paramNames = (parameters || []).map((p) => (p && p.name) || '').filter(Boolean);
    const functionName = `${cleanName}(${paramNames.join(', ')})`;
    const parsed = parseScenarioStepUtils(functionName, options.availableActors || []);

    return new SemanticRepresentation({
      action: parsed.action,
      verb: parsed.verb,
      object: parsed.object,
      keywords: parsed.keywords,
      messageName: cleanName,
      functionName,
      parameters: paramNames,
      messageType: 'synchronous',
      systemClass: options.className,
      sourceStep: options.sourceStep,
      sourceUCFId: options.ucId,
      semanticKeywords: extractKeywords(functionName),
      visibility,
      returnType,
      typedParameters: parameters || []
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
    const actionMatch = this.action?.toLowerCase() === other.action?.toLowerCase();
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

    // Calculate Levenshtein similarity (shared implementation from similarity.js)
    return similarity(normA, normB);
  }

  toJSON() {
    return {
      subject: this.subject,
      actor: this.actor,
      action: this.action,
      verb: this.verb,
      object: this.object,
      target: this.target,
      keywords: this.keywords,
      semanticKeywords: this.semanticKeywords,
      functionName: this.functionName,
      messageName: this.messageName,
      parameters: this.parameters,
      messageType: this.messageType,
      visibility: this.visibility,
      returnType: this.returnType,
      typedParameters: this.typedParameters,
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
  processDescription(descriptionData, useCaseId, availableActors = []) {
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
        availableActors
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
      result[useCaseId] = this.processDescription(description, useCaseId, diagramAnalysis.availableActors || []);
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
   * Tiered step↔message matcher. Returns a single verdict with an explicit
   * confidence score and the tier that produced it.
   *
   * Tier order (first that yields a decisive result wins):
   *   deterministic → normalization → similarity → semantic
   * (AI is intentionally not wired in — deterministic/NLP tiers cover SSDs.)
   *
   * Returns { score, confidence, tier, matchType, reason, structuredScore, keywordScore }.
   */
  matchStepToMessage(stepSemantic, messageSemantic, options = {}) {
    const threshold = options.threshold || 0;

    const stepName = (stepSemantic.functionName || stepSemantic.messageName || '').toString();
    const msgName = (messageSemantic.functionName || messageSemantic.messageName || '').toString();

    // ── Tier 1: deterministic — exact identifier equality ──────────────────
    if (stepSemantic.semanticHash && stepSemantic.semanticHash === messageSemantic.semanticHash) {
      return {
        score: 1.0, confidence: 1.0, tier: 'deterministic', matchType: 'EXACT',
        reason: 'Exact semantic hash', structuredScore: 1.0, keywordScore: 1.0
      };
    }

    // ── Tier 2: normalization — same function/message name after cleaning ──
    const stepNorm = normalizeToken(stepName);
    const msgNorm = normalizeToken(msgName);
    if (stepNorm && stepNorm === msgNorm) {
      return {
        score: 0.98, confidence: 0.98, tier: 'normalization', matchType: 'EXACT',
        reason: 'Normalized identifier match', structuredScore: 0.98, keywordScore: 1.0
      };
    }

    // ── Tier 3: similarity — evaluateFunctionMatch (verb/object, synonyms) ──
    const fnMatch = evaluateFunctionMatch(stepName, msgName);
    if (fnMatch.matchType === 'EXACT' || fnMatch.matchType === 'STRONG') {
      return {
        score: fnMatch.score, confidence: fnMatch.score, tier: 'similarity',
        matchType: fnMatch.matchType, reason: fnMatch.reason,
        structuredScore: 0, keywordScore: 0
      };
    }

    // ── Tier 4: semantic — structured + keyword-overlap comparison ─────────
    const structured = stepSemantic.compareSemantic(messageSemantic, options);
    const keywordScore = stepSemantic.compareKeywords(messageSemantic, options);
    const combined = Math.max(structured.score, keywordScore);

    if (combined >= threshold && combined >= 0.25) {
      return {
        score: combined, confidence: combined, tier: 'semantic',
        matchType: structured.type, reason: structured.reason || 'Best semantic match',
        structuredScore: structured.score, keywordScore
      };
    }

    // No decisive match — report the best weak evidence so callers can grade severity.
    return {
      score: combined, confidence: combined, tier: 'semantic',
      matchType: combined >= 0.1 ? structured.type : 'NONE',
      reason: structured.reason || 'Weak semantic similarity',
      structuredScore: structured.score, keywordScore
    };
  }

  /**
   * Compare an SSD message against a class-method semantic representation.
   * This is the Phase 10 "SSD operation → class operation" matcher: it grades
   * method-name equivalence (tiered), parameter presence/alignment, return-type
   * requirement, parameter-type declaration and visibility validity.
   *
   * Returns a verdict object:
   *   { result, score, matchType, tier, checks: {
   *       name: { score, matchType, tier },
   *       parameters: { matched, reason, ssdParams, methodParams },
   *       returnType: { required, present },
   *       paramTypes: { missing: string[] },
   *       visibility: { visibility, valid }
   *   } }
   *
   * result ∈ PASS | STRONG_MATCH | PARTIAL_MATCH | MISSING_METHOD |
   *          PARAMETER_MISMATCH | SEMANTIC_METHOD_MISMATCH
   */
  compareClassOperation(ssdSemantic, methodSemantic, options = {}) {
    const ssdName = (ssdSemantic.messageName || ssdSemantic.functionName || '').toString();
    const methodName = (methodSemantic.messageName || methodSemantic.functionName || '').toString();

    // ── Tiered method-name match (mirrors matchStepToMessage) ──────────────
    let score = 0;
    let matchType = 'NONE';
    let tier = 'semantic';

    const ssdNorm = normalizeToken(ssdName);
    const methodNorm = normalizeToken(methodName);
    if (ssdNorm && ssdNorm === methodNorm) {
      score = 0.98;
      matchType = 'EXACT';
      tier = 'normalization';
    } else {
      const fnMatch = evaluateFunctionMatch(ssdName, methodName);
      if (fnMatch.matchType === 'EXACT' || fnMatch.matchType === 'STRONG') {
        score = fnMatch.score;
        matchType = fnMatch.matchType;
        tier = 'similarity';
      } else {
        const structured = ssdSemantic.compareSemantic(methodSemantic, options);
        const keywordScore = ssdSemantic.compareKeywords(methodSemantic, options);
        score = Math.max(structured.score, keywordScore);
        matchType = structured.type || 'NONE';
        tier = 'semantic';
      }
    }

    // ── Parameter presence / alignment ─────────────────────────────────────
    const parameterCheck = compareParameterLists(
      ssdSemantic.parameters,
      methodSemantic.parameters
    );

    // ── Return-type requirement (only where the author uses signatures) ────
    const QUERY_VERBS = new Set([
      'validate', 'check', 'verify', 'get', 'fetch', 'retrieve', 'find', 'search',
      'load', 'read', 'query', 'calculate', 'compute', 'list', 'request',
      'confirm', 'determine', 'lookup', 'authenticate'
    ]);
    const verb = String(ssdSemantic.verb || '').toLowerCase();
    const usesSignatures = (ssdSemantic.parameters || []).length > 0 || (methodSemantic.parameters || []).length > 0;
    const returnTypeCheck = {
      required: usesSignatures && QUERY_VERBS.has(verb),
      present: !!methodSemantic.returnType
    };

    // ── Parameter-type declaration ─────────────────────────────────────────
    const typedParams = methodSemantic.typedParameters || [];
    const missingTypes = typedParams.filter((p) => !(p && p.type)).map((p) => p && p.name).filter(Boolean);
    const paramTypesCheck = { missing: missingTypes };

    // ── Visibility validity ────────────────────────────────────────────────
    const visibility = methodSemantic.visibility;
    const visibilityCheck = {
      visibility,
      valid: visibility === null || visibility === '+'
    };

    // ── Result resolution ──────────────────────────────────────────────────
    let result;
    if (score < 0.45) {
      result = 'MISSING_METHOD';
    } else if (!parameterCheck.matched) {
      result = 'PARAMETER_MISMATCH';
    } else if (score >= 0.85) {
      result = 'STRONG_MATCH';
    } else {
      result = 'SEMANTIC_METHOD_MISMATCH';
    }

    if (
      score >= 0.95 &&
      parameterCheck.matched &&
      returnTypeCheck.present &&
      paramTypesCheck.missing.length === 0 &&
      visibilityCheck.valid
    ) {
      result = 'PASS';
    }

    return {
      result,
      score,
      matchType,
      tier,
      checks: {
        name: { score, matchType, tier },
        parameters: parameterCheck,
        returnType: returnTypeCheck,
        paramTypes: paramTypesCheck,
        visibility: visibilityCheck
      }
    };
  }

  /**
   * Find best semantic match between description steps and SSD messages.
   * Uses the tiered matcher and includes confidence on every pairing.
   */
  findBestStepMessageMatch(stepSemantics, messageSemantics, options = {}) {
    const matches = [];
    const threshold = options.threshold || 0;

    stepSemantics.forEach((stepSemantic, stepIdx) => {
      let bestMatch = null;
      let bestScore = 0;

      messageSemantics.forEach((msgSemantic, msgIdx) => {
        const verdict = this.matchStepToMessage(stepSemantic, msgSemantic, options);

        if (verdict.score > bestScore) {
          bestScore = verdict.score;
          bestMatch = {
            stepIndex: stepIdx,
            messageIndex: msgIdx,
            score: verdict.score,
            confidence: verdict.confidence,
            tier: verdict.tier,
            matchType: verdict.matchType,
            structuredScore: verdict.structuredScore,
            keywordScore: verdict.keywordScore,
            type: verdict.matchType,
            reason: verdict.reason
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

    return suggestions;
  }
}

const semanticProcessor = new SemanticProcessor();

module.exports = {
  SemanticRepresentation,
  SemanticProcessor,
  semanticProcessor
};