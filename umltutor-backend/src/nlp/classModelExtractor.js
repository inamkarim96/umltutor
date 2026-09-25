"use strict";

const { STOP_WORDS, VERB_DICTIONARY, INTERNAL_VERBS, EXTERNAL_VERBS } = require('./constants');
const { lemmatizeToken, normalizeToken, fuzzyIncludes, areSynonyms } = require('./similarity');

/**
 * Common domain attribute names in software engineering requirements.
 */
const COMMON_ATTRIBUTE_TOKENS = new Set([
  'id', 'identifier', 'name', 'title', 'email', 'password', 'phone', 'address',
  'date', 'time', 'status', 'type', 'role', 'content', 'description', 'price',
  'amount', 'cost', 'fee', 'quantity', 'balance', 'code', 'number', 'username',
  'age', 'gender', 'state', 'city', 'zip', 'zipcode', 'category', 'rating',
  'comment', 'note', 'timestamp', 'priority', 'level', 'department', 'salary'
]);

/**
 * Non-attribute noise words to exclude when extracting attributes.
 */
const ATTRIBUTE_NOISE_WORDS = new Set([
  'information', 'data', 'detail', 'details', 'input', 'inputs', 'system', 'user',
  'screen', 'page', 'button', 'form', 'link', 'menu', 'option', 'options',
  'list', 'item', 'items', 'step', 'steps', 'process', 'result', 'results',
  'success', 'error', 'confirmation', 'message', 'view', 'click', 'clicks',
  'such', 'like', 'including', 'following', 'appropriate', 'respective',
  'specific', 'desired', 'selected', 'valid', 'invalid', 'new', 'existing',
  'relevant', 'particular', 'credential', 'credentials'
]);

/**
 * Extract data attributes, collaborating entities (associations), and generalization cues
 * from Use Case Descriptions and System Sequence Diagrams.
 */
class ClassModelExtractor {
  /**
   * Extract a complete expected class model from descriptions and SSDs.
   * Returns { attributes, methods, associations, generalizations }
   */
  static extractExpectedClassModel(descriptions = {}, ssds = {}, classList = []) {
    const attributes = [];
    const methods = [];
    const seenAttrs = new Set();
    const seenMethods = new Set();

    // Extract attributes from descriptions
    Object.values(descriptions).forEach((desc) => {
      if (!desc) return;
      const primaryActor = desc.primaryActor || '';
      const ucName = desc.useCaseName || '';
      const stepsText = (desc.mainFlow || []).map((s) => s.action || '').join(' ');

      // Extract target entities from use case name and steps
      const targetEntities = this.extractTargetEntities(ucName, stepsText);

      // Extract attributes from text
      const textAttrs = this.extractAttributesFromText(`${ucName} ${stepsText}`);
      textAttrs.forEach((attr) => {
        const className = this.mapAttributeToClass(attr, primaryActor, targetEntities, classList);
        if (className) {
          const key = `${className}::${attr.toLowerCase()}`;
          if (!seenAttrs.has(key)) {
            seenAttrs.add(key);
            attributes.push({
              className,
              attribute: attr,
              source: `Use Case "${ucName}"`,
              context: { useCaseName: ucName }
            });
          }
        }
      });
    });

    // Extract attributes from SSD messages
    Object.values(ssds).forEach((rawSSD) => {
      if (!rawSSD) return;
      const messages = rawSSD.messages || rawSSD.edges || [];
      messages.forEach((msg) => {
        const msgName = msg.name || msg.label || '';
        const msgParams = msg.parameters || [];
        const ssdAttrs = this.extractAttributesFromSSDMessage(msgName, msgParams);
        // Map SSD message parameters to the target class (receiver)
        const receiverName = msg.target || msg.to || '';
        const classNames = classList.map((c) => (c.label || c.name || '').trim()).filter(Boolean);
        const targetClass = classNames.find((cn) => {
          const cnLower = cn.toLowerCase().replace(/[^a-z0-9]/g, '');
          const recvLower = receiverName.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cnLower === recvLower || cnLower.includes(recvLower) || recvLower.includes(cnLower);
        });

        ssdAttrs.forEach((attr) => {
          const className = targetClass || this.mapAttributeToClass(attr, '', classNames, classList);
          if (className) {
            const key = `${className}::${attr.toLowerCase()}`;
            if (!seenAttrs.has(key)) {
              seenAttrs.add(key);
              attributes.push({
                className,
                attribute: attr,
                source: `SSD message "${msgName}"`,
                context: { message: msgName }
              });
            }
          }
        });

        // Also extract method names from SSD messages
        if (msgName) {
          const cleanMsg = msgName.split('(')[0].trim();
          if (cleanMsg && !seenMethods.has(cleanMsg.toLowerCase())) {
            seenMethods.add(cleanMsg.toLowerCase());
            methods.push({
              name: cleanMsg,
              source: `SSD message "${msgName}"`,
              context: { message: msgName }
            });
          }
        }
      });
    });

    // Extract associations
    const associations = this.extractExpectedAssociations(descriptions, ssds, classList);

    // Note: generalizations require requirement text and actor generalizations which are not available here
    // They are extracted separately in validateClassDiagramInheritance

    return { attributes, methods, associations, generalizations: [] };
  }

  /**
   * Extract target entity names from use case name and steps text.
   */
  static extractTargetEntities(ucName, stepsText) {
    const entities = new Set();
    const combined = `${ucName} ${stepsText}`;
    
    // Common entity patterns
    const entityPatterns = [
      /\b(?:create|add|update|delete|remove|view|display|show|list|get|fetch|load|save|store|process|manage|handle|submit|register|login|logout|book|reserve|order|purchase|pay|cancel|confirm|approve|reject|assign|schedule|generate|export|import|send|receive|notify|validate|verify|search|find|filter|sort|calculate|compute|report)\s+([A-Z][a-zA-Z]+)\b/g,
      /\b(?:the|a|an)\s+([A-Z][a-zA-Z]+)\s+(?:is|has|contains|stores|records|holds)\b/g,
      /\b([A-Z][a-zA-Z]+)\s+(?:class|entity|object|record|entry|item)\b/gi
    ];

    entityPatterns.forEach((regex) => {
      let match;
      while ((match = regex.exec(combined)) !== null) {
        const entity = match[1] || match[0].split(/\s+/).pop();
        if (entity && entity.length > 2 && !['The', 'A', 'An', 'This', 'That', 'User', 'System', 'Actor', 'Admin', 'Student'].includes(entity)) {
          entities.add(entity);
        }
      }
    });

    // Also extract capitalized nouns that appear to be domain entities
    const capitalizedWords = combined.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    capitalizedWords.forEach((word) => {
      if (!['The', 'User', 'System', 'Actor', 'Admin', 'Student', 'Teacher', 'Customer', 'Manager', 'Order', 'Payment', 'Product', 'Item', 'Data', 'Info', 'Details'].includes(word)) {
        entities.add(word);
      }
    });

    return Array.from(entities);
  }

  /**
   * Extract attribute candidate tokens from a natural language string.
   */
  static extractAttributesFromText(text) {
    if (!text || typeof text !== 'string') return [];
    const attributes = new Set();
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();

    // Pattern 1: "enters/submits/provides/inputs [his/her/the]? (X, Y, and Z)"
    // Pattern 2: "details/information/fields such as (X, Y, and Z)"
    // Pattern 3: "including (X, Y, and Z)"
    const listPatterns = [
      /(?:enters?|provides?|submits?|inputs?|fills?|specifies?)\s+(?:his|her|their|the|a|an)?\s*(.+?)(?:\s+(?:to|for|into|on|in|and\s+clicks?|and\s+submits?)\b|[.!?]|$)/i,
      /(?:details?|information|data|fields?|credentials?)\s+(?:such\s+as|including|consisting\s+of|like)\s+([^.!?]+)/i,
      /(?:such\s+as|including)\s+([^.!?]+)/i,
      /(?:contains?|stores?|records?|holds?)\s+(?:the|a|an)?\s*([^.!?]+)/i
    ];

    listPatterns.forEach((regex) => {
      const match = cleanText.match(regex);
      if (match && match[1]) {
        const rawList = match[1]
          .replace(/\([^)]*\)/g, ' ')
          .replace(/\b(?:and|or|as\s+well\s+as)\b/gi, ',');
        const tokens = rawList.split(/[,;/]+/);
        tokens.forEach((t) => {
          const words = t.trim().toLowerCase().split(/\s+/).filter(Boolean);
          if (words.length > 0 && words.length <= 3) {
            // Keep meaningful attribute phrases or tokens (e.g. "email", "phone number", "expiry date")
            const candidate = words
              .filter((w) => !STOP_WORDS.has(w) && !ATTRIBUTE_NOISE_WORDS.has(w))
              .map((w, idx) => (idx === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
              .join('');
            if (candidate && candidate.length >= 2 && candidate.length <= 25) {
              attributes.add(candidate);
            }
          }
        });
      }
    });

    // Pattern 4: Possessive or direct noun-noun attribute patterns: e.g. "notice title", "user password", "member's email"
    const possessivePattern = /\b([a-zA-Z]{3,})\s*(?:'s)?\s+(name|title|email|password|date|status|id|content|price|amount|phone|address|description|number|code)\b/gi;
    let pMatch;
    while ((pMatch = possessivePattern.exec(cleanText)) !== null) {
      const attrName = pMatch[2].toLowerCase();
      if (!ATTRIBUTE_NOISE_WORDS.has(attrName)) {
        attributes.add(attrName);
      }
    }

    return Array.from(attributes);
  }

  /**
   * Extract attribute parameters from SSD messages.
   * e.g. "submitNotice(title, content, expiryDate)" -> ['title', 'content', 'expiryDate']
   */
  static extractAttributesFromSSDMessage(messageName, messageParameters = []) {
    const attributes = new Set();

    if (Array.isArray(messageParameters) && messageParameters.length > 0) {
      messageParameters.forEach((p) => {
        const clean = String(p).replace(/[^a-zA-Z0-9_]/g, '').trim();
        if (clean && !STOP_WORDS.has(clean.toLowerCase()) && !ATTRIBUTE_NOISE_WORDS.has(clean.toLowerCase())) {
          attributes.add(clean);
        }
      });
    }

    if (messageName && typeof messageName === 'string') {
      const match = messageName.match(/\(([^)]*)\)/);
      if (match && match[1]) {
        match[1].split(/[,;]+/).forEach((param) => {
          const raw = param.trim().split(/\s+/)[0]; // strip optional type e.g. "email: string"
          const clean = raw.replace(/[^a-zA-Z0-9_]/g, '').trim();
          if (clean && !STOP_WORDS.has(clean.toLowerCase()) && !ATTRIBUTE_NOISE_WORDS.has(clean.toLowerCase())) {
            attributes.add(clean);
          }
        });
      }
    }

    return Array.from(attributes);
  }

  /**
   * Identify which domain class an attribute belongs to based on context.
   */
  static mapAttributeToClass(attribute, primaryActor, targetEntities = [], classList = []) {
    const attrLower = attribute.toLowerCase();

    // Check target entities first (e.g. "Notice", "Order", "Reservation", "Account")
    for (const ent of targetEntities) {
      const entLower = ent.toLowerCase();
      if (attrLower.includes(entLower) || entLower.includes(attrLower)) {
        return ent;
      }
      // Domain heuristics
      if (['title', 'content', 'expirydate', 'date', 'description'].includes(attrLower) && ['notice', 'post', 'announcement', 'message'].includes(entLower)) {
        return ent;
      }
      if (['price', 'total', 'amount', 'date', 'status'].includes(attrLower) && ['order', 'payment', 'invoice', 'reservation'].includes(entLower)) {
        return ent;
      }
    }

    // Check if class list has an entity matching the attribute semantics
    for (const cls of classList) {
      const clsName = cls.label || cls.name || '';
      const clsLower = clsName.toLowerCase();
      if (['email', 'password', 'phone', 'username', 'firstname', 'lastname', 'address'].includes(attrLower)) {
        if (['user', 'member', 'student', 'customer', 'person', 'account', 'actor'].some((u) => clsLower.includes(u))) {
          return clsName;
        }
      }
    }

    // Default to primaryActor or first target entity if present
    return targetEntities[0] || primaryActor || null;
  }

  /**
   * Extract collaborating entity pairs (associations) from use case descriptions and SSDs.
   * If Actor A or Entity A performs an action on or creates Entity B, they should be associated.
   */
  static extractExpectedAssociations(descriptions = {}, ssds = {}, classList = []) {
    const associations = [];
    const seen = new Set();

    const classNames = classList.map((c) => (c.label || c.name || '').trim()).filter(Boolean);
    const findMatchingClass = (name) => {
      if (!name) return null;
      const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return classNames.find((cn) => {
        const cLower = cn.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cLower === lower || cLower.includes(lower) || lower.includes(cLower) || areSynonyms(cLower, lower);
      });
    };

    // 1. From Use Case Descriptions
    Object.values(descriptions).forEach((desc) => {
      if (!desc) return;
      const actorName = (desc.primaryActor || '').trim();
      const actorClass = findMatchingClass(actorName);

      // Collect domain nouns / target entities from use case name and steps
      const ucName = desc.useCaseName || '';
      const stepsText = (desc.mainFlow || []).map((s) => s.action || '').join(' ');
      const combined = `${ucName} ${stepsText}`;

      // Check which class names appear in the description text
      const mentionedClasses = classNames.filter((cn) => {
        if (actorClass && cn.toLowerCase() === actorClass.toLowerCase()) return false;
        const cnLower = cn.toLowerCase();
        return fuzzyIncludes(combined.toLowerCase(), cnLower) || combined.toLowerCase().includes(cnLower);
      });

      if (actorClass) {
        mentionedClasses.forEach((targetClass) => {
          const key = [actorClass, targetClass].sort().join(':::');
          if (!seen.has(key)) {
            seen.add(key);
            associations.push({
              source: actorClass,
              target: targetClass,
              reason: `Interacts in Use Case "${desc.useCaseName || 'Domain Flow'}"`,
              context: { useCaseName: desc.useCaseName }
            });
          }
        });
      }

      // Inter-entity collaborations (e.g. Order and Payment, Notice and Department)
      for (let i = 0; i < mentionedClasses.length; i++) {
        for (let j = i + 1; j < mentionedClasses.length; j++) {
          const key = [mentionedClasses[i], mentionedClasses[j]].sort().join(':::');
          if (!seen.has(key)) {
            seen.add(key);
            associations.push({
              source: mentionedClasses[i],
              target: mentionedClasses[j],
              reason: `Co-occur in scenario for "${desc.useCaseName || 'Domain Flow'}"`,
              context: { useCaseName: desc.useCaseName }
            });
          }
        }
      }
    });

    // 2. From SSD Lifelines and Messages
    Object.values(ssds).forEach((rawSSD) => {
      if (!rawSSD) return;
      const lifelines = rawSSD.lifelines || rawSSD.nodes || [];
      const messages = rawSSD.messages || rawSSD.edges || [];

      // Extract lifelines that represent domain classes
      const domainLifelines = lifelines
        .map((l) => (l.label || l.data?.label || l.name || '').trim())
        .map((name) => findMatchingClass(name))
        .filter(Boolean);

      // Any pair of lifelines with message exchange implies an association
      messages.forEach((msg) => {
        const srcName = (msg.source || msg.from || '').trim();
        const tgtName = (msg.target || msg.to || '').trim();
        const srcClass = findMatchingClass(srcName);
        const tgtClass = findMatchingClass(tgtName);

        if (srcClass && tgtClass && srcClass !== tgtClass) {
          const key = [srcClass, tgtClass].sort().join(':::');
          if (!seen.has(key)) {
            seen.add(key);
            associations.push({
              source: srcClass,
              target: tgtClass,
              reason: `Exchange messages in System Sequence Diagram`,
              context: { message: msg.name || msg.label }
            });
          }
        }
      });
    });

    return associations;
  }

  /**
   * Extract generalization / inheritance relationships from text or actor models.
   * e.g. "Graduate student is a Student", "Admin is a User"
   */
  static extractExpectedGeneralizations(requirementText = '', actorGeneralizations = [], classList = []) {
    const generalizations = [];
    const seen = new Set();
    const classNames = classList.map((c) => (c.label || c.name || '').trim()).filter(Boolean);

    const findClass = (name) => {
      if (!name) return null;
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return classNames.find((cn) => cn.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
    };

    // 1. From actor hierarchy in Use Case diagram
    (actorGeneralizations || []).forEach(({ child, parent }) => {
      const childClass = findClass(child);
      const parentClass = findClass(parent);
      if (childClass && parentClass && childClass !== parentClass) {
        const key = `${childClass}-->${parentClass}`;
        if (!seen.has(key)) {
          seen.add(key);
          generalizations.push({
            child: childClass,
            parent: parentClass,
            reason: `Inherits from Use Case Diagram actor generalization (${child} specializes ${parent})`
          });
        }
      }
    });

    // 2. From "is a" / "specialized type of" patterns in text
    if (requirementText && typeof requirementText === 'string') {
      const isAPattern = /\b([A-Z][a-zA-Z]+)\s+is\s+(?:a|an|a\s+type\s+of|a\s+specialized|a\s+kind\s+of)\s+([A-Z][a-zA-Z]+)\b/g;
      let m;
      while ((m = isAPattern.exec(requirementText)) !== null) {
        const childClass = findClass(m[1]);
        const parentClass = findClass(m[2]);
        if (childClass && parentClass && childClass !== parentClass) {
          const key = `${childClass}-->${parentClass}`;
          if (!seen.has(key)) {
            seen.add(key);
            generalizations.push({
              child: childClass,
              parent: parentClass,
              reason: `Specified as "${m[1]} is a ${m[2]}" in requirements`
            });
          }
        }
      }
    }

    return generalizations;
  }

  /**
   * Detect opportunities for generalization/abstraction based on shared attributes
   * across sibling classes (e.g. Student and Teacher both defining name, email, phone).
   */
  static detectGeneralizationOpportunities(classList = [], existingInheritance = []) {
    const opportunities = [];
    if (classList.length < 2) return opportunities;

    const inheritanceParents = new Map(); // child -> parent
    existingInheritance.forEach(([child, parent]) => {
      inheritanceParents.set(child.toLowerCase(), parent.toLowerCase());
    });

    // Group classes with their normalized attribute sets
    const classAttrs = classList.map((cls) => {
      const rawAttrs = cls.attributes || [];
      const attrNames = rawAttrs.map((a) => {
        const clean = typeof a === 'string' ? a.split(':')[0].replace(/[^a-zA-Z0-9]/g, '') : (a.name || '');
        return clean.toLowerCase();
      }).filter((a) => a.length > 1);

      return {
        id: cls.id,
        name: cls.label || cls.name || '',
        attributes: new Set(attrNames)
      };
    });

    // Compare pairs of classes
    for (let i = 0; i < classAttrs.length; i++) {
      for (let j = i + 1; j < classAttrs.length; j++) {
        const c1 = classAttrs[i];
        const c2 = classAttrs[j];

        // If they already share a parent or one inherits the other, skip
        if (inheritanceParents.get(c1.name.toLowerCase()) === c2.name.toLowerCase() ||
            inheritanceParents.get(c2.name.toLowerCase()) === c1.name.toLowerCase()) {
          continue;
        }

        const shared = [];
        c1.attributes.forEach((attr) => {
          if (c2.attributes.has(attr) && !['id'].includes(attr)) {
            shared.push(attr);
          }
        });

        // If they share 2 or more descriptive attributes (e.g. name, email, phone)
        if (shared.length >= 2) {
          opportunities.push({
            classes: [c1.name, c2.name],
            sharedAttributes: shared,
            suggestion: `Classes "${c1.name}" and "${c2.name}" share common attributes [${shared.join(', ')}]. Consider abstracting them into a common superclass or interface (e.g., User, Person, or Account).`
          });
        }
      }
    }

    return opportunities;
  }
}

module.exports = {
  ClassModelExtractor,
  COMMON_ATTRIBUTE_TOKENS,
  ATTRIBUTE_NOISE_WORDS
};
