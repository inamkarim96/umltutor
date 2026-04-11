"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { initializeDirectories, ensureDirectory, DIRS } = require('../config/paths');
const fs = require('fs');
const path = require('path');

/**
 * Initialize application directories and perform startup checks
 */
const initializeApplication = async () => {
  // Only show messages if explicitly enabled
  const verbose = process.env.SHOW_STARTUP_MESSAGES === 'true' || false;
  const isVercelContext = process.env.VERCEL || process.env.NODE_ENV === 'production';
  
  if (verbose) console.log('🚀 Initializing UMLTutor Backend...');
  
  try {
    // Initialize all required directories (handled by internal checks in paths.js)
    if (!isVercelContext) {
      initializeDirectories();
      if (verbose) console.log('✅ Directories initialized successfully');
    } else {
      if (verbose) console.log('ℹ️ Running in Vercel/Production context - skipping directory initialization');
    }
    
    // Verify critical directories exist using absolute paths
    const criticalDirs = [
      DIRS.LOGS_ROOT,
      DIRS.UPLOADS_ROOT,
      DIRS.ASSIGNMENT_UPLOADS,
      DIRS.SUBMISSION_UPLOADS,
      DIRS.TEMP_UPLOADS
    ];
    
    criticalDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        if (verbose) console.log(`✅ Directory exists: ${path.relative(process.cwd(), dir)}`);
      } else {
        if (verbose) console.warn(`⚠️  Directory missing: ${path.relative(process.cwd(), dir)}`);
      }
    });
    
    // Check write permissions - skip on Vercel
    if (!isVercelContext) {
      try {
        const testFile = path.join(DIRS.TEMP_UPLOADS, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        if (verbose) console.log('✅ Write permissions verified');
      } catch (error) {
        console.error('❌ Write permission check failed:', error.message);
        throw new Error('Insufficient write permissions for uploads directory');
      }
    } else {
      if (verbose) console.log('ℹ️ Skipping write permission check on Vercel');
    }
    
    // Check database connectivity
    try {
      const prisma = require('./prisma').default || require('./prisma');
      await prisma.$connect();
      if (verbose) console.log('✅ Database connectivity verified');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      // In production/Vercel, we might not want to crash immediately if DB is temporarily down,
      // but for debugging purposes, logging it clearly is essential.
    }

    if (verbose) console.log('🎉 Application initialization complete!\n');
    
  } catch (error) {
    if (isVercelContext) {
        console.error('❌ Application initialization warning (Non-fatal in Vercel):', error.message);
    } else {
        console.error('❌ Application initialization failed:', error.message);
        process.exit(1);
    }
  }
};


module.exports = {
  initializeApplication
};
