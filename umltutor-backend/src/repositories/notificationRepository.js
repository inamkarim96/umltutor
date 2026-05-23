"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma = require('../utils/prisma').default;

const notificationRepository = {
    async create(data) {
        return prisma.notification.create({ data });
    },

    async createMany(data) {
        return prisma.notification.createMany({ data });
    },

    async findMany(where, orderBy, take) {
        return prisma.notification.findMany({
            where,
            orderBy,
            take,
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
                relatedId: true,
                isRead: true,
                createdAt: true,
            },
        });
    },

    async findFirst(where) {
        return prisma.notification.findFirst({ where });
    },

    async update(where, data) {
        return prisma.notification.update({ where, data });
    },

    async updateMany(where, data) {
        return prisma.notification.updateMany({ where, data });
    },

    async delete(where) {
        return prisma.notification.delete({ where });
    }
};

exports.default = notificationRepository;
