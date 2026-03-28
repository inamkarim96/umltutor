"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { initializeDirectories, ensureDirectory, DIRS } = require('../config/paths');
const fs = require('fs');
const path = require('path');

/**
 * Initialize application directories and perform startup checks
 */
const initializeApplication = () => {
  // Only show messages if explicitly enabled
  const verbose = process.env.SHOW_STARTUP_MESSAGES === 'true';
  
  if (verbose) console.log('🚀 Initializing UMLTutor Backend...');
  
  try {
    // Initialize all required directories
    initializeDirectories();
    if (verbose) console.log('✅ Directories initialized successfully');
    
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
    
    // Check write permissions
    try {
      const testFile = path.join(DIRS.TEMP_UPLOADS, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      if (verbose) console.log('✅ Write permissions verified');
    } catch (error) {
      console.error('❌ Write permission check failed:', error.message);
      throw new Error('Insufficient write permissions for uploads directory');
    }
    
    // Check disk space (basic check)
    try {
      const stats = fs.statSync('.');
      if (verbose) console.log('✅ File system accessible');
    } catch (error) {
      console.error('❌ File system check failed:', error.message);
    }
    
    if (verbose) console.log('🎉 Application initialization complete!\n');
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error.message);
    console.error('Please check permissions and disk space');
    process.exit(1);
  }
};

module.exports = {
  initializeApplication
};
