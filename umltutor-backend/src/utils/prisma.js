"use strict";

/**
 * Single Prisma singleton — re-export from config to avoid duplicate clients
 * (duplicate clients exhaust DB connections on serverless and can cause 500s).
 */
const prisma = require('../config/prisma');

module.exports = { default: prisma };
module.exports.default = prisma;
