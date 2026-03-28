"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
var _uuid = require('uuid');
var _logger = require('../utils/logger');

 const requestLogger = (req, res, next) => {
  // Add unique request ID
  const requestId = _uuid.v4.call(void 0, );
  (req ).requestId = requestId;
  
  // Record start time
  const startTime = Date.now();
  
  // Log incoming request
  _logger.logInfo.call(void 0, 'Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: _optionalChain([(req ), 'access', _ => _.user, 'optionalAccess', _2 => _2.userId])
  });
  
  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function(chunk, encoding, cb) {
    const responseTime = Date.now() - startTime;
    
    // Log HTTP access
    _logger.logHttp.call(void 0, req, res, responseTime);
    
    // Log errors based on status code
    if (res.statusCode >= 400) {
      _logger.logError.call(void 0, new Error(`HTTP ${res.statusCode}`), {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip,
        userId: _optionalChain([(req ), 'access', _3 => _3.user, 'optionalAccess', _4 => _4.userId])
      });
    }
    
    // Call original end
    return originalEnd(chunk, encoding, cb);
  };
  
  next();
}; exports.requestLogger = requestLogger;

exports. default = exports.requestLogger;
