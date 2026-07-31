"use strict";

const VERB_DICTIONARY = new Set([
  'create', 'add', 'update', 'delete', 'register', 'login', 'logout',
  'view', 'search', 'generate', 'submit', 'process', 'send', 'receive',
  'manage', 'book', 'place', 'track', 'upload', 'download', 'approve',
  'reject', 'withdraw', 'purchase', 'make',
]);

const INTERNAL_VERBS = new Set([
  'calculate', 'calculates', 'process', 'processes', 'validate', 'validates',
  'check', 'checks', 'compute', 'computes', 'verify', 'verifies',
  'update', 'updates', 'store', 'stores', 'save', 'saves',
  'record', 'records', 'log', 'logs', 'retrieve', 'retrieves',
  'fetch', 'fetches', 'look', 'looks', 'find', 'finds',
  'search', 'searches', 'load', 'loads', 'compare', 'compares',
  'sort', 'sorts', 'filter', 'filters', 'encrypt', 'encrypts',
  'decrypt', 'decrypts', 'hash', 'hashes', 'resolve', 'resolves',
  'create', 'creates', 'set', 'sets', 'read', 'reads',
]);

const EXTERNAL_VERBS = new Set([
  'display', 'displays', 'show', 'shows', 'confirm', 'confirms',
  'generate', 'generates', 'return', 'returns', 'notify', 'notifies',
  'send', 'sends', 'present', 'presents', 'provide', 'provides',
  'redirect', 'redirects', 'output', 'outputs', 'emit', 'emits',
  'render', 'renders', 'respond', 'responds', 'report', 'reports',
  'give', 'gives', 'reply', 'replies', 'inform', 'informs',
  'print', 'prints', 'broadcast', 'broadcasts',
]);

const STOP_WORDS = new Set([
  'the', 'of', 'a', 'an', 'is', 'to', 'for', 'and', 'with', 'by',
  'in', 'on', 'at', 'as', 'be', 'this', 'that', 'its', 'it',
  'from', 'or', 'into', 'their', 'has', 'have', 'was', 'are',
  'will', 'should', 'can', 'then', 'after', 'before', 'when', 'if',
]);

const PLACEHOLDER_CLASS_NAMES = new Set([
  'newclass', 'newinterface', 'class', 'interface', 'untitled',
]);

const SYSTEM_INVALID_NAMES = [
  '', 'system', 'sys', 'name', 'untitled',
  'double click to name system', 'double click to name',
  'click to name', 'enter name', 'new system',
];

const MATCH_THRESHOLD = 0.5;
const PARTIAL_THRESHOLD = 0.25;
const FUZZY_SUBSTRING_LENGTH = 4;

const RETURN_KEYWORDS = [
  'return', 'shows', 'display', 'responds', 'provide', 'confirm',
  'present', 'notify', 'send', 'generate', 'output',
];

const SSD_VERBS = ['add', 'new', 'buy', 'pay', 'log', 'get', 'set', 'put'];

const SYNONYM_GROUPS = [
  new Set(['login', 'log in', 'signin', 'sign in', 'authenticate', 'authorize']),
  new Set(['logout', 'log out', 'signout', 'sign out', 'exit']),
  new Set(['register', 'signup', 'sign up', 'create', 'add', 'insert', 'enroll']),
  new Set(['enter', 'input', 'submit', 'provide', 'fill']),
  new Set(['validate', 'verify', 'check', 'authenticate', 'confirm']),
  new Set(['display', 'show', 'present', 'render', 'output']),
  new Set(['calculate', 'compute', 'determine', 'evaluate']),
  new Set(['save', 'store', 'record', 'persist']),
  new Set(['update', 'modify', 'edit', 'change']),
  new Set(['delete', 'remove', 'cancel', 'erase']),
  new Set(['search', 'find', 'query', 'filter', 'lookup']),
  new Set(['pay', 'checkout', 'purchase', 'buy']),
  new Set(['get', 'fetch', 'retrieve', 'load', 'read'])
];

const LEMMATIZATION_MAP = {
  'logs': 'log',
  'logging': 'log',
  'logged': 'log',
  'enters': 'enter',
  'entering': 'enter',
  'entered': 'enter',
  'validates': 'validate',
  'validating': 'validate',
  'validated': 'validate',
  'submits': 'submit',
  'submitting': 'submit',
  'submitted': 'submit',
  'registers': 'register',
  'registering': 'register',
  'registered': 'register',
  'displays': 'display',
  'displaying': 'display',
  'displayed': 'display',
  'shows': 'show',
  'showing': 'show',
  'showed': 'show',
  'calculates': 'calculate',
  'calculating': 'calculate',
  'calculated': 'calculate',
  'verifies': 'verify',
  'verifying': 'verify',
  'verified': 'verify',
  'creates': 'create',
  'creating': 'create',
  'created': 'create',
  'saves': 'save',
  'saving': 'save',
  'saved': 'save',
  'updates': 'update',
  'updating': 'update',
  'updated': 'update',
  'deletes': 'delete',
  'deleting': 'delete',
  'deleted': 'delete'
};

const VERB_DICTIONARY_ARRAY = Array.from(VERB_DICTIONARY);
const STOP_WORDS_ARRAY = Array.from(STOP_WORDS);
const RETURN_KEYWORDS_ARRAY = [...RETURN_KEYWORDS];

module.exports = {
  VERB_DICTIONARY,
  INTERNAL_VERBS,
  EXTERNAL_VERBS,
  STOP_WORDS,
  PLACEHOLDER_CLASS_NAMES,
  SYSTEM_INVALID_NAMES,
  MATCH_THRESHOLD,
  PARTIAL_THRESHOLD,
  FUZZY_SUBSTRING_LENGTH,
  RETURN_KEYWORDS,
  SSD_VERBS,
  SYNONYM_GROUPS,
  LEMMATIZATION_MAP,
  VERB_DICTIONARY_ARRAY,
  STOP_WORDS_ARRAY,
  RETURN_KEYWORDS_ARRAY,
};
