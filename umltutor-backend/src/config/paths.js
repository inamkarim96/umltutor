"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const path = require('path');
const fs = require('fs');

/**
 * Centralized configuration for the UMLTutor application
 */

// Base directory configuration
const BASE_DIR = process.cwd();
const BACKEND_DIR = path.join(BASE_DIR, 'umltutor-backend');

// Directory paths configuration
const DIRS = {
  BASE_DIR,
  BACKEND_DIR,
  
  // Upload directories
  UPLOADS_ROOT: path.join(BASE_DIR, 'uploads'),
  ASSIGNMENT_UPLOADS: path.join(BASE_DIR, 'uploads', 'assignments'),
  SUBMISSION_UPLOADS: path.join(BASE_DIR, 'uploads', 'submissions'),
  TEMP_UPLOADS: path.join(BASE_DIR, 'uploads', 'temp'),
  
  // Log directories
  LOGS_ROOT: path.join(BASE_DIR, 'logs'),
  
  // Database directories
  DB_ROOT: path.join(BACKEND_DIR, 'database'),
};

// File upload configuration
const UPLOAD_CONFIG = {
  // File size limits (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Allowed file types
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ],
  
  // File extensions mapping
  TYPE_MAPPING: {
    '.pdf': 'pdf',
    '.doc': 'word',
    '.docx': 'word',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
  },
};

// Logging configuration
const LOG_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Log rotation settings
  ROTATION: {
    maxSize: '20m',
    maxFiles: {
      error: '14d',
      combined: '14d',
      access: '7d',
      exceptions: '30d',
      rejections: '30d',
    },
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
  },
  
  // Log files
  FILES: {
    error: path.join(DIRS.LOGS_ROOT, 'error-%DATE%.log'),
    combined: path.join(DIRS.LOGS_ROOT, 'combined-%DATE%.log'),
    access: path.join(DIRS.LOGS_ROOT, 'access-%DATE%.log'),
    exceptions: path.join(DIRS.LOGS_ROOT, 'exceptions-%DATE%.log'),
    rejections: path.join(DIRS.LOGS_ROOT, 'rejections-%DATE%.log'),
  },
};

// Environment-specific settings
const ENV_CONFIG = {
  development: {
    LOG_TO_CONSOLE: true,
    LOG_LEVEL: 'debug',
  },
  production: {
    LOG_TO_CONSOLE: false,
    LOG_LEVEL: 'info',
  },
  test: {
    LOG_TO_CONSOLE: false,
    LOG_LEVEL: 'error',
  },
};

/**
 * Ensure directory exists, create if it doesn't
 */
const ensureDirectory = (dirPath) => {
  const isVercelContext = process.env.VERCEL || process.env.NODE_ENV === 'production';
  if (isVercelContext) {
    // Vercel serverless functions have a read-only filesystem except for /tmp.
    // Skip directory creation entirely.
    return;
  }
  
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
    throw new Error(`Failed to create directory: ${dirPath}`);
  }
};

/**
 * Initialize all required directories
 */
const initializeDirectories = () => {
  const directories = [
    DIRS.UPLOADS_ROOT,
    DIRS.ASSIGNMENT_UPLOADS,
    DIRS.SUBMISSION_UPLOADS,
    DIRS.TEMP_UPLOADS,
    DIRS.LOGS_ROOT,
  ];

  directories.forEach(ensureDirectory);
};

/**
 * Get current environment configuration
 */
const getCurrentEnvConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONFIG[env] || ENV_CONFIG.development;
};

/**
 * Generate unique filename
 */
const generateUniqueFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  
  return `${prefix}${baseName}-${timestamp}-${random}${ext}`;
};

/**
 * Get file URL path (relative to server root)
 */
const getFileUrl = (filePath, uploadType = 'assignments') => {
  const filename = path.basename(filePath);
  return `/uploads/${uploadType}/${filename}`;
};

// Initialize directories on module load
try {
  const isVercelContext = process.env.VERCEL || process.env.NODE_ENV === 'production';
  if (!isVercelContext) {
    initializeDirectories();
  }
} catch (error) {
  console.error('Failed to initialize directories:', error);
}

module.exports = {
  DIRS,
  UPLOAD_CONFIG,
  LOG_CONFIG,
  ENV_CONFIG,
  ensureDirectory,
  initializeDirectories,
  getCurrentEnvConfig,
  generateUniqueFilename,
  getFileUrl,
};
