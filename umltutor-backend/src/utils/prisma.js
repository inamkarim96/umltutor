"use strict";Object.defineProperty(exports, "__esModule", {value: true});// Import PrismaClient from the generated client
var _client = require('@prisma/client');

// Create a singleton instance of PrismaClient
const prisma = new (0, _client.PrismaClient)({
  log: ['error'],
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

exports. default = prisma;
