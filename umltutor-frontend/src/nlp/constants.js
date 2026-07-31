export const VERB_DICTIONARY = new Set([
  'create', 'add', 'update', 'delete', 'register', 'login', 'logout',
  'view', 'search', 'generate', 'submit', 'process', 'send', 'receive',
  'manage', 'book', 'place', 'track', 'upload', 'download', 'approve',
  'reject', 'withdraw', 'purchase', 'make',
]);

export const INTERNAL_VERBS = new Set([
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

export const EXTERNAL_VERBS = new Set([
  'display', 'displays', 'show', 'shows', 'confirm', 'confirms',
  'generate', 'generates', 'return', 'returns', 'notify', 'notifies',
  'send', 'sends', 'present', 'presents', 'provide', 'provides',
  'redirect', 'redirects', 'output', 'outputs', 'emit', 'emits',
  'render', 'renders', 'respond', 'responds', 'report', 'reports',
  'give', 'gives', 'reply', 'replies', 'inform', 'informs',
  'print', 'prints', 'broadcast', 'broadcasts',
]);

export const STOP_WORDS = new Set([
  'the', 'of', 'a', 'an', 'is', 'to', 'for', 'and', 'with', 'by',
  'in', 'on', 'at', 'as', 'be', 'this', 'that', 'its', 'it',
  'from', 'or', 'into', 'their', 'has', 'have', 'was', 'are',
  'will', 'should', 'can', 'then', 'after', 'before', 'when', 'if',
]);

export const PLACEHOLDER_CLASS_NAMES = new Set([
  'newclass', 'newinterface', 'class', 'interface', 'untitled',
]);

export const SYSTEM_INVALID_NAMES = [
  '', 'system', 'sys', 'name', 'untitled',
  'double click to name system', 'double click to name',
  'click to name', 'enter name', 'new system',
];

export const MATCH_THRESHOLD = 0.5;
export const PARTIAL_THRESHOLD = 0.25;
export const FUZZY_SUBSTRING_LENGTH = 4;

export const RETURN_KEYWORDS = new Set([
  'return', 'shows', 'display', 'responds', 'provide', 'confirm',
  'present', 'notify', 'send', 'generate', 'output',
]);

export const SSD_VERBS = ['add', 'new', 'buy', 'pay', 'log', 'get', 'set', 'put'];

export const VERB_DICTIONARY_ARRAY = Array.from(VERB_DICTIONARY);
export const STOP_WORDS_ARRAY = Array.from(STOP_WORDS);
export const RETURN_KEYWORDS_ARRAY = Array.from(RETURN_KEYWORDS);
