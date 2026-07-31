"use strict";

const { CheckingEngine } = require('../services/checkingEngine');
const { getRuleByCode, getAffectedByDependency } = require('./ruleRegistry');

const PHASES = [
  { name: 'diagram', section: 'diagram', label: 'Use Case Diagram Validation' },
  { name: 'description', section: 'description', label: 'Use Case Description Validation' },
  { name: 'ssd', section: 'ssd', label: 'System Sequence Diagram Validation' },
  { name: 'class-diagram', section: 'class-diagram', label: 'Class Diagram Validation' },
  { name: 'sequence-diagram', section: 'sequence-diagram', label: 'Sequence Diagram Validation' },
  { name: 'consistency', section: null, label: 'Cross-Diagram Consistency' },
];

const CRITICAL_CODES = new Set([
  'DIAGRAM_EMPTY',
  'SYSTEM_BOUNDARY_MISSING',
  'NO_ACTORS',
  'NO_USE_CASES',
  'CLASS_DIAGRAM_EMPTY',
]);

const CRITICAL_DEPENDENCIES = {
  'DIAGRAM_EMPTY': ['ACTOR_NO_NAME', 'ACTOR_INVALID_NAME', 'ACTOR_NOT_CONNECTED',
    'USE_CASE_NO_NAME', 'USE_CASE_INVALID_NAME', 'USE_CASE_OUTSIDE_BOUNDARY', 'USE_CASE_NOT_CONNECTED'],
  'SYSTEM_BOUNDARY_MISSING': ['SYSTEM_NAME_INVALID', 'USE_CASE_OUTSIDE_BOUNDARY'],
  'CLASS_DIAGRAM_EMPTY': ['NO_CLASSES', 'CLASS_NAME_PLACEHOLDER', 'NO_METHODS',
    'CLASS_METHOD_MISSING_FOR_SSD', 'CLASS_ENTITY_SUGGESTION'],
};

const SKIP_ON_ERROR_CODES = new Map();
Object.entries(CRITICAL_DEPENDENCIES).forEach(([parentCode, childCodes]) => {
  childCodes.forEach((code) => {
    if (!SKIP_ON_ERROR_CODES.has(code)) SKIP_ON_ERROR_CODES.set(code, []);
    SKIP_ON_ERROR_CODES.get(code).push(parentCode);
  });
});

function getBlockedCodes(issues) {
  const blocked = new Set();
  const presentCodes = new Set(issues.map((i) => i.code));

  for (const [childCode, parentCodes] of SKIP_ON_ERROR_CODES) {
    for (const parentCode of parentCodes) {
      if (presentCodes.has(parentCode)) {
        blocked.add(childCode);
        break;
      }
    }
  }

  return blocked;
}

function enrichIssue(issue) {
  const rule = getRuleByCode(issue.code);
  if (rule) {
    issue.ruleId = rule.id;
    issue.category = rule.category;
    issue.diagramType = rule.diagramType;
    if (!issue.context) issue.context = {};
    if (!issue.context.suggestion && rule.messageTemplate) {
      issue.context.suggestion = `See rule ${rule.id}: ${rule.name}`;
    }
  }
  return issue;
}

function checkModelWithPipeline(model, section = null, targetId = null) {
  const rawResult = CheckingEngine.checkModel(model, section, targetId);
  const { issues } = rawResult;
  issues.forEach(enrichIssue);

  const blockedCodes = getBlockedCodes(issues);
  if (blockedCodes.size > 0) {
    const filteredIssues = issues.filter((i) => !blockedCodes.has(i.code));
    const addedSkipped = new Set();
    const deduplicated = [];
    for (const issue of filteredIssues) {
      if (issue.code && blockedCodes.has(issue.code)) continue;
      deduplicated.push(issue);
    }
    blockedCodes.forEach((code) => {
      const rule = getRuleByCode(code);
      if (rule) {
        deduplicated.push({
          type: rule.diagramType,
          severity: 'info',
          code: 'SKIPPED_DEPENDENCY',
          location: rule.diagramType,
          message: `Skipped: ${rule.name} (prerequisite issue not resolved)`,
          context: { skippedCode: code, reason: `Depends on ${SKIP_ON_ERROR_CODES.get(code)?.join(', ') || 'parent rule'} which has errors` },
        });
      }
    });
    const summary = deduplicated.reduce((counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      counts.total++;
      return counts;
    }, { total: 0, error: 0, warning: 0, info: 0 });

    return { issues: deduplicated, summary };
  }

  return rawResult;
}

async function checkModelPhased(model, section = null, targetId = null) {
  const allIssues = [];
  const executedPhases = new Set();

  for (const phase of PHASES) {
    if (section && phase.section !== section && phase.name !== 'consistency') continue;
    if (section && phase.name === 'consistency') continue;

    const phaseResult = CheckingEngine.checkModel(model, phase.section, targetId);
    const phaseBlocked = getBlockedCodes(phaseResult.issues);

    if (phaseBlocked.size > 0) {
      const filtered = phaseResult.issues.filter((i) => !phaseBlocked.has(i.code));
      blockedCodes.forEach((code) => {
        const rule = getRuleByCode(code);
        if (rule) {
          filtered.push({
            type: rule.diagramType,
            severity: 'info',
            code: 'SKIPPED_DEPENDENCY',
            location: rule.diagramType,
            message: `Skipped: ${rule.name} (prerequisite issue not resolved)`,
          });
        }
      });
      allIssues.push(...filtered);
      break;
    }

    allIssues.push(...phaseResult.issues);

    if (section) break;
  }

  if (!section) {
    const globalResult = CheckingEngine.checkModel(model, null, targetId);
    const globalIssues = globalResult.issues.filter((i) =>
      i.code && (
        i.code.startsWith('MAP_') ||
        i.code.startsWith('SEQ_') ||
        i.code.startsWith('SSDCONS_') ||
        i.code.startsWith('SEQCONS_') ||
        i.code.startsWith('CLASS_')
      )
    );
    allIssues.push(...globalIssues);
  }

  const summary = allIssues.reduce((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
    counts.total++;
    return counts;
  }, { total: 0, error: 0, warning: 0, info: 0 });

  return { issues: allIssues, summary };
}

module.exports = {
  checkModelWithPipeline,
  checkModelPhased,
  PHASES,
  CRITICAL_CODES,
};
