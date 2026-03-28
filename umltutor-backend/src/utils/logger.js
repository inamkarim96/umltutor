"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _winston = require('winston'); var _winston2 = _interopRequireDefault(_winston);
var _winstondailyrotatefile = require('winston-daily-rotate-file'); var _winstondailyrotatefile2 = _interopRequireDefault(_winstondailyrotatefile);

const { 
  LOG_CONFIG, 
  getCurrentEnvConfig,
  ensureDirectory 
} = require('../config/paths');

// Ensure logs directory exists - use the logs root directory directly
ensureDirectory(require('../config/paths').DIRS.LOGS_ROOT);

const logFormat = _winston2.default.format.combine(
  _winston2.default.format.timestamp(),
  _winston2.default.format.errors({ stack: true }),
  _winston2.default.format.json()
);

const createLogger = () => {
  const envConfig = getCurrentEnvConfig();
  const logger = _winston2.default.createLogger({
    level: LOG_CONFIG.LEVEL,
    format: logFormat,
    defaultMeta: { service: 'umltutor-backend' },
    transports: [
      // Error log file with rotation
      new (0, _winstondailyrotatefile2.default)({
        filename: LOG_CONFIG.FILES.error,
        datePattern: LOG_CONFIG.ROTATION.datePattern,
        level: 'error',
        handleExceptions: true,
        maxSize: LOG_CONFIG.ROTATION.maxSize,
        maxFiles: LOG_CONFIG.ROTATION.maxFiles.error,
        zippedArchive: LOG_CONFIG.ROTATION.zippedArchive
      }),
      
      // Combined log file with rotation
      new (0, _winstondailyrotatefile2.default)({
        filename: LOG_CONFIG.FILES.combined,
        datePattern: LOG_CONFIG.ROTATION.datePattern,
        handleExceptions: true,
        maxSize: LOG_CONFIG.ROTATION.maxSize,
        maxFiles: LOG_CONFIG.ROTATION.maxFiles.combined,
        zippedArchive: LOG_CONFIG.ROTATION.zippedArchive
      }),
      
      // Separate access log
      new (0, _winstondailyrotatefile2.default)({
        filename: LOG_CONFIG.FILES.access,
        datePattern: LOG_CONFIG.ROTATION.datePattern,
        level: 'http',
        maxSize: LOG_CONFIG.ROTATION.maxSize,
        maxFiles: LOG_CONFIG.ROTATION.maxFiles.access,
        zippedArchive: LOG_CONFIG.ROTATION.zippedArchive
      })
    ],
    
    // Handle uncaught exceptions and rejections
    exceptionHandlers: [
      new (0, _winstondailyrotatefile2.default)({
        filename: LOG_CONFIG.FILES.exceptions,
        datePattern: LOG_CONFIG.ROTATION.datePattern,
        maxSize: LOG_CONFIG.ROTATION.maxSize,
        maxFiles: LOG_CONFIG.ROTATION.maxFiles.exceptions,
        zippedArchive: LOG_CONFIG.ROTATION.zippedArchive
      })
    ],
    
    rejectionHandlers: [
      new (0, _winstondailyrotatefile2.default)({
        filename: LOG_CONFIG.FILES.rejections,
        datePattern: LOG_CONFIG.ROTATION.datePattern,
        maxSize: LOG_CONFIG.ROTATION.maxSize,
        maxFiles: LOG_CONFIG.ROTATION.maxFiles.rejections,
        zippedArchive: LOG_CONFIG.ROTATION.zippedArchive
      })
    ]
  });

  // Add console transport for development
  if (envConfig.LOG_TO_CONSOLE) {
    logger.add(new _winston2.default.transports.Console({
      format: _winston2.default.format.combine(
        _winston2.default.format.colorize(),
        _winston2.default.format.simple(),
        _winston2.default.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        })
      )
    }));
  }

  return logger;
};

const logger = createLogger(); exports.logger = logger;

// Helper functions for structured logging
const logError = (error, context) => {
  exports.logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date().toISOString()
  });
}; exports.logError = logError;

const logInfo = (message, meta) => {
  exports.logger.info(message, {
    ...meta,
    timestamp: new Date().toISOString()
  });
}; exports.logInfo = logInfo;

const logWarn = (message, meta) => {
  exports.logger.warn(message, {
    ...meta,
    timestamp: new Date().toISOString()
  });
}; exports.logWarn = logWarn;

const logDebug = (message, meta) => {
  exports.logger.debug(message, {
    ...meta,
    timestamp: new Date().toISOString()
  });
}; exports.logDebug = logDebug;

const logHttp = (req, res, responseTime) => {
  exports.logger.http(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: _optionalChain([req, 'access', _ => _.user, 'optionalAccess', _2 => _2.userId]),
    timestamp: new Date().toISOString()
  });
}; exports.logHttp = logHttp;

exports. default = exports.logger;
