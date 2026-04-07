"use strict";

const { PrismaClient } = require('@prisma/client');

/**
 * Singleton Prisma Client instance
 * Reusing the client across requests is critical for performance 
 * and to prevent "too many connections" errors.
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = prisma;
