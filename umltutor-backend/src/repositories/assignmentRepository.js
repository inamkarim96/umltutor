"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma = require('../utils/prisma').default;

const assignmentRepository = {
    async create(data) {
        if (data && data.data !== undefined) return prisma.assignment.create(data);
        return prisma.assignment.create({ data });
    },

    async findMany(where, include, orderBy) {
        if (where && (where.where !== undefined || where.include !== undefined || where.orderBy !== undefined || where.select !== undefined)) return prisma.assignment.findMany(where);
        return prisma.assignment.findMany({ where, include, orderBy });
    },

    async findFirst(where, include) {
        if (where && (where.where !== undefined || where.include !== undefined || where.select !== undefined)) return prisma.assignment.findFirst(where);
        return prisma.assignment.findFirst({ where, include });
    },

    async findUnique(where, include) {
        if (where && (where.where !== undefined || where.include !== undefined || where.select !== undefined)) return prisma.assignment.findUnique(where);
        return prisma.assignment.findUnique({ where, include });
    },

    async update(where, data, include) {
        if (where && where.where !== undefined && where.data !== undefined) return prisma.assignment.update(where);
        return prisma.assignment.update({ where, data, include });
    },

    async delete(where) {
        if (where && where.where !== undefined) return prisma.assignment.delete(where);
        return prisma.assignment.delete({ where });
    },

    // Submission specific queries often used in Assignment domain
    async findSubmissions(where, include, orderBy) {
        if (where && (where.where !== undefined || where.include !== undefined || where.orderBy !== undefined || where.select !== undefined)) return prisma.submission.findMany(where);
        return prisma.submission.findMany({ where, include, orderBy });
    },

    async updateSubmission(where, data, include) {
        if (where && where.where !== undefined && where.data !== undefined) return prisma.submission.update(where);
        return prisma.submission.update({ where, data, include });
    },

    async findFirstSubmission(where, include) {
        if (where && (where.where !== undefined || where.include !== undefined || where.select !== undefined)) return prisma.submission.findFirst(where);
        return prisma.submission.findFirst({ where, include });
    },

    async createSubmission(data, include) {
        if (data && data.data !== undefined) return prisma.submission.create(data);
        return prisma.submission.create({ data, include });
    },

    async countSubmissions(where) {
        if (where && where.where !== undefined) return prisma.submission.count(where);
        return prisma.submission.count({ where });
    },

    async groupBySubmission(query) {
        return prisma.submission.groupBy(query);
    }
};

exports.default = assignmentRepository;
