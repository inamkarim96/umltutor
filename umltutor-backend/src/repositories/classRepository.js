"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma = require('../utils/prisma').default;

const classRepository = {
    async findUnique(where, include) {
        if (where && (where.where !== undefined || where.include !== undefined || where.select !== undefined)) return prisma.class.findUnique(where);
        return prisma.class.findUnique({ where, include });
    },

    async findFirst(where, include) {
        if (where && (where.where !== undefined || where.include !== undefined || where.select !== undefined)) return prisma.class.findFirst(where);
        return prisma.class.findFirst({ where, include });
    },

    async findMany(where, include, orderBy) {
        if (where && (where.where !== undefined || where.include !== undefined || where.select !== undefined || where.orderBy !== undefined)) return prisma.class.findMany(where);
        return prisma.class.findMany({ where, include, orderBy });
    },

    async create(data) {
        if (data && data.data !== undefined) return prisma.class.create(data);
        return prisma.class.create({ data });
    },

    async update(where, data) {
        if (where && where.where !== undefined && where.data !== undefined) return prisma.class.update(where);
        return prisma.class.update({ where, data });
    },

    async delete(where) {
        if (where && where.where !== undefined) return prisma.class.delete(where);
        return prisma.class.delete({ where });
    },

    // Membership queries
    async findMemberships(where, select) {
        if (where && (where.where !== undefined || where.select !== undefined || where.include !== undefined)) return prisma.classStudent.findMany(where);
        return prisma.classStudent.findMany({ where, select });
    },

    async findMembership(where, include) {
        if (where && (where.where !== undefined || where.include !== undefined || where.select !== undefined)) return prisma.classStudent.findUnique(where);
        return prisma.classStudent.findUnique({ where, include });
    },

    async updateMembership(query) {
        return prisma.classStudent.update(query);
    }
};

exports.default = classRepository;
