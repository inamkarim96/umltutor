// Vercel Serverless Entry Point for Express app
// This file exports the Express app so Vercel can wrap it as a serverless function.
// Socket.IO real-time features are disabled in serverless mode (REST API still works fully).

require('dotenv').config();

// Run Prisma generate on cold start if needed
const { execSync } = require('child_process');
try {
  execSync('npx prisma generate', { stdio: 'ignore' });
} catch (e) {
  // Already generated or unavailable — safe to ignore
}

const app = require('../src/app').default || require('../src/app');

module.exports = app;
