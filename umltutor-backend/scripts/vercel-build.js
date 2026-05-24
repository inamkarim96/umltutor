#!/usr/bin/env node
"use strict";

/**
 * Vercel build prerequisite: deploy Prisma schema to the database BEFORE the API goes live.
 *
 * Vercel order: npm install (postinstall → generate) → this script → deploy functions.
 */

const { execSync } = require("child_process");

// Local runs: load .env. Vercel injects DATABASE_URL into the build environment.
if (!process.env.DATABASE_URL) {
  try {
    require("dotenv").config();
  } catch {
    /* dotenv optional */
  }
}

function run(command, label) {
  console.log(`\n[vercel-build] ${label}`);
  console.log(`[vercel-build] > ${command}\n`);
  execSync(command, { stdio: "inherit", env: process.env });
}

function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "[vercel-build] FATAL: DATABASE_URL is not set.\n" +
        "  Vercel → Project → Settings → Environment Variables → add DATABASE_URL (Production).\n" +
        "  Schema migrations cannot run without it; aborting deploy."
    );
    process.exit(1);
  }

  console.log("[vercel-build] Step 1/3 — validate schema");
  run("npx prisma validate", "Prisma schema validation");

  console.log("[vercel-build] Step 2/3 — generate client");
  run("npx prisma generate", "Prisma Client generation");

  console.log("[vercel-build] Step 3/3 — apply migrations to database");
  run("npx prisma migrate deploy", "Database migration deploy");

  console.log(
    "\n[vercel-build] Done. Database schema matches prisma/schema.prisma. API deployment can proceed.\n"
  );
}

main();
