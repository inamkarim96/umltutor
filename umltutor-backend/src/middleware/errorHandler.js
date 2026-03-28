"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
var _logger = require('../utils/logger');
var _errors = require('../utils/errors');













const isDevelopment = process.env.NODE_ENV !== 'production';

 const errorHandler = (
  error,
  req,
  res,
  next
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_SERVER_ERROR';
  let details = undefined;

  // Handle custom application errors
  // Handle custom AppErrors and other errors with explicit statusCode
  if (error.statusCode || error.status || error instanceof _errors.AppError) {
    statusCode = error.statusCode || error.status;
    message = error.message;
    code = error.code || 'UNKNOWN_ERROR';
    details = error.details;
  }
  // Handle validation errors (e.g., from Zod)
  else if (error.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = error;
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    code = 'TOKEN_EXPIRED';
  }
  // Handle Prisma errors
  else if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error ;
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Resource already exists';
        code = 'DUPLICATE_RESOURCE';
        details = { field: _optionalChain([prismaError, 'access', _ => _.meta, 'optionalAccess', _2 => _2.target]) || 'unknown' };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        code = 'NOT_FOUND';
        break;
      default:
        statusCode = 500;
        message = 'Database operation failed';
        code = 'DATABASE_ERROR';
    }
  }
  // Handle network/connection errors
  else if (error.name === 'ECONNREFUSED' || error.name === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
    code = 'SERVICE_UNAVAILABLE';
  }

  // Log the error
  _logger.logError.call(void 0, error, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: _optionalChain([(req ), 'access', _3 => _3.user, 'optionalAccess', _4 => _4.userId]),
    requestId: (req ).requestId
  });

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      code,
      timestamp: new Date().toISOString(),
      requestId: (req ).requestId
    }
  };

  // Include details in development or if explicitly allowed
  if (isDevelopment || (error instanceof _errors.AppError && error.details)) {
    errorResponse.error.details = details || {};
  }

  // Include stack trace in development
  if (isDevelopment) {
    errorResponse.error.details = {
      ...errorResponse.error.details,
      stack: error.stack,
      name: error.name
    };
  }

  res.status(statusCode).json(errorResponse);
}; exports.errorHandler = errorHandler;

// Async error wrapper for route handlers
 const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; exports.asyncHandler = asyncHandler;

// 404 handler
 const notFoundHandler = (req, res) => {
  const message = `Route ${req.originalUrl} not found`;
  
  _logger.logger.warn(message, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: {
      message,
      statusCode: 404,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    }
  });
}; exports.notFoundHandler = notFoundHandler;

exports. default = exports.errorHandler;
