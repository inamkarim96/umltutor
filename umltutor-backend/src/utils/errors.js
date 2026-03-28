"use strict";Object.defineProperty(exports, "__esModule", {value: true}); class AppError extends Error {
  
  
  
  

  constructor(
    message,
    statusCode = 500,
    code,
    details,
    isOperational = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
} exports.AppError = AppError;

 class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
} exports.ValidationError = ValidationError;

 class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
} exports.AuthenticationError = AuthenticationError;

 class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
} exports.AuthorizationError = AuthorizationError;

 class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
} exports.NotFoundError = NotFoundError;

 class ConflictError extends AppError {
  constructor(message, details) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
} exports.ConflictError = ConflictError;

 class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
} exports.RateLimitError = RateLimitError;

 class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
} exports.DatabaseError = DatabaseError;

 class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', { service });
  }
} exports.ExternalServiceError = ExternalServiceError;

 class ConfigurationError extends AppError {
  constructor(message = 'Configuration error') {
    super(message, 500, 'CONFIGURATION_ERROR');
  }
} exports.ConfigurationError = ConfigurationError;

/**
 * Response helper functions for consistent API responses
 */
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
}; exports.sendSuccess = sendSuccess;

const sendError = (res, error) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        ...(error.details && { details: error.details })
      }
    });
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid request format',
        code: 'VALIDATION_ERROR',
        details: error.errors
      }
    });
  }

  // Default error response
  console.error('Unhandled error:', error);
  return res.status(500).json({
    success: false,
    error: {
      message: 'An internal server error occurred',
      code: 'INTERNAL_ERROR'
    }
  });
}; exports.sendError = sendError;

/**
 * Handle async errors in controllers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; exports.asyncHandler = asyncHandler;
