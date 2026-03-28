"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma = require('../utils/prisma').default;

const userRepository = {
    async findByEmail(email) {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    },

    async findById(id) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },

    async create(userData) {
        return prisma.user.create({
            data: {
                email: userData.email.toLowerCase(),
                password: userData.password,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
            },
        });
    },

    async searchStudents(query) {
        return prisma.user.findMany({
            where: {
                role: 'STUDENT',
                OR: [
                    { firstName: { contains: query } },
                    { lastName: { contains: query } },
                    { email: { contains: query } }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
            },
            take: 20
        });
    }
};

exports.default = userRepository;
