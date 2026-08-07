"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma = require("../utils/prisma").default;

// Data access for SubmissionExport. Uses raw SQL because the table was added
// outside the Prisma client generation cycle (avoids requiring a client
// regeneration on deployed environments). Queries are PostgreSQL-compatible.
const submissionExportRepository = {
    async create(data) {
        const rows = await prisma.$queryRawUnsafe(
            `INSERT INTO "SubmissionExport"
               ("submissionId", "studentId", "assignmentId", "format", "section",
                "durationMs", "fileUrl", "fileName", "fileSize")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING "id", "submissionId", "studentId", "assignmentId", "format",
                       "section", "durationMs", "fileUrl", "fileName", "fileSize", "createdAt"`,
            Number(data.submissionId),
            Number(data.studentId),
            Number(data.assignmentId),
            String(data.format || "pdf"),
            data.section ? String(data.section) : null,
            Math.max(0, Number(data.durationMs) || 0),
            data.fileUrl ? String(data.fileUrl) : null,
            data.fileName ? String(data.fileName) : null,
            data.fileSize ? Number(data.fileSize) : null
        );
        return rows[0] || null;
    },

    async findManyBySubmission(submissionId, { limit = 50, offset = 0 } = {}) {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT "id", "submissionId", "studentId", "assignmentId", "format", "section",
                    "durationMs", "fileUrl", "fileName", "fileSize", "createdAt"
             FROM "SubmissionExport"
             WHERE "submissionId" = $1
             ORDER BY "createdAt" DESC
             LIMIT $2 OFFSET $3`,
            Number(submissionId),
            Math.min(100, Math.max(1, Number(limit) || 50)),
            Math.max(0, Number(offset) || 0)
        );
        return rows;
    },

    async findManyByStudent(studentId, { limit = 50, offset = 0 } = {}) {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT e."id", e."submissionId", e."studentId", e."assignmentId", e."format",
                    e."section", e."durationMs", e."fileUrl", e."fileName", e."fileSize", e."createdAt",
                    a."title" AS "assignmentTitle"
             FROM "SubmissionExport" e
             LEFT JOIN "Assignment" a ON a."id" = e."assignmentId"
             WHERE e."studentId" = $1
             ORDER BY e."createdAt" DESC
             LIMIT $2 OFFSET $3`,
            Number(studentId),
            Math.min(100, Math.max(1, Number(limit) || 50)),
            Math.max(0, Number(offset) || 0)
        );
        return rows;
    },

    async findManyByAssignment(assignmentId, { limit = 50, offset = 0 } = {}) {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT e."id", e."submissionId", e."studentId", e."assignmentId", e."format",
                    e."section", e."durationMs", e."fileUrl", e."fileName", e."fileSize", e."createdAt",
                    u."firstName", u."lastName", u."email"
             FROM "SubmissionExport" e
             LEFT JOIN "User" u ON u."id" = e."studentId"
             WHERE e."assignmentId" = $1
             ORDER BY e."createdAt" DESC
             LIMIT $2 OFFSET $3`,
            Number(assignmentId),
            Math.min(100, Math.max(1, Number(limit) || 50)),
            Math.max(0, Number(offset) || 0)
        );
        return rows;
    },

    async summaryByStudent(studentId) {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS "total",
                    COALESCE(AVG("durationMs"), 0)::int AS "avgDurationMs",
                    COALESCE(MAX("durationMs"), 0)::int AS "maxDurationMs"
             FROM "SubmissionExport"
             WHERE "studentId" = $1`,
            Number(studentId)
        );
        return rows[0] || { total: 0, avgDurationMs: 0, maxDurationMs: 0 };
    },

    async summaryByAssignment(assignmentId) {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS "total",
                    COALESCE(AVG("durationMs"), 0)::int AS "avgDurationMs",
                    COALESCE(MAX("durationMs"), 0)::int AS "maxDurationMs"
             FROM "SubmissionExport"
             WHERE "assignmentId" = $1`,
            Number(assignmentId)
        );
        return rows[0] || { total: 0, avgDurationMs: 0, maxDurationMs: 0 };
    },
};

exports.default = submissionExportRepository;
