"use strict";

const { rules } = require('./ruleRegistry');

const DEFAULT_CONFIG = {
  enableAll: true,
  severityOverrides: {},
  thresholdOverrides: {},
};

let config = { ...DEFAULT_CONFIG };

function loadConfig(overrides = {}) {
  config = {
    ...DEFAULT_CONFIG,
    ...overrides,
    severityOverrides: { ...(overrides.severityOverrides || {}) },
    thresholdOverrides: { ...(overrides.thresholdOverrides || {}) },
  };
}

function isRuleEnabled(code) {
  if (!config.enableAll) return false;
  if (config.severityOverrides[code]?.enabled === false) return false;
  const rule = rules.find((r) => r.code === code);
  return rule ? rule.enabled : true;
}

function getSeverity(code) {
  if (config.severityOverrides[code]?.severity) {
    return config.severityOverrides[code].severity;
  }
  const rule = rules.find((r) => r.code === code);
  return rule ? rule.severity : 'error';
}

function getThreshold(code) {
  if (config.thresholdOverrides[code] != null) {
    return config.thresholdOverrides[code];
  }
  return 0.5;
}

function getConfig() {
  return { ...config };
}

function resetConfig() {
  config = { ...DEFAULT_CONFIG };
}

module.exports = {
  loadConfig,
  isRuleEnabled,
  getSeverity,
  getThreshold,
  getConfig,
  resetConfig,
};
