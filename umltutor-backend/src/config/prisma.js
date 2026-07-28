"use strict";

const { PrismaClient } = require('@prisma/client');

/**
 * Singleton Prisma Client instance
 *
 * Configured for Neon serverless PostgreSQL pooler:
 * - Neon aggressively closes idle connections ("Error { kind: Closed }")
 * - Prisma automatically retries on connection close when using the pooler URL
 * - log level includes 'query' in dev for visibility
 * - Connection pooling via pooler URL handles serverless scaling
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

/**
 * Gracefully disconnect Prisma on process exit.
 * Prevents "connection already closed" noise during shutdown.
 */
const shutdown = async (signal) => {
  console.log(`[Prisma] Received ${signal} — disconnecting...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = prisma;
