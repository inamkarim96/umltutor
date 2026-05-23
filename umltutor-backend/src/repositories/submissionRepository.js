"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma = require('../utils/prisma').default;

const submissionRepository = {
    async findUnique(where, include) {
        if (where && (where.where !== undefined || where.include !== undefined || where.select !== undefined)) return prisma.submission.findUnique(where);
        return prisma.submission.findUnique({ where, include });
    },

    async findFirst(where, include) {
        if (where && (where.where !== undefined || where.include !== undefined || where.select !== undefined)) return prisma.submission.findFirst(where);
        return prisma.submission.findFirst({ where, include });
    },

    async findMany(where, include, orderBy) {
        if (where && (where.where !== undefined || where.include !== undefined || where.orderBy !== undefined || where.select !== undefined)) return prisma.submission.findMany(where);
        return prisma.submission.findMany({ where, include, orderBy });
    },

    async create(data, include) {
        if (data && data.data !== undefined) return prisma.submission.create(data);
        return prisma.submission.create({ data, include });
    },

    async update(where, data, include) {
        if (where && where.where !== undefined && where.data !== undefined) return prisma.submission.update(where);
        return prisma.submission.update({ where, data, include });
    },

    async upsert(where, update, create, include) {
        if (where && where.where !== undefined && where.update !== undefined && where.create !== undefined) return prisma.submission.upsert(where);
        return prisma.submission.upsert({ where, update, create, include });
    },

    async delete(where) {
        if (where && where.where !== undefined) return prisma.submission.delete(where);
        return prisma.submission.delete({ where });
    },

    async count(where) {
        if (where && where.where !== undefined) return prisma.submission.count(where);
        return prisma.submission.count({ where });
    },

    async groupBy(query) {
        return prisma.submission.groupBy(query);
    },

    /**
     * Updates specific UML artifacts directly on the submission record.
     */
    async updateArtifacts(submissionId, artifactData) {
        return prisma.submission.update({
            where: { id: Number(submissionId) },
            data: artifactData
        });
    },

    /**
     * Saves the validation report JSON directly into the submission record.
     */
    async updateValidationReport(submissionId, reportDataJson) {
        return prisma.submission.update({
            where: { id: Number(submissionId) },
            data: { 
                validationReportData: reportDataJson
            }
        });
    },

    /**
     * Transaction support — passes options (timeout, maxWait) through to Prisma
     */
    async transaction(callback, options) {
        return prisma.$transaction(callback, options);
    }
};

exports.default = submissionRepository;
