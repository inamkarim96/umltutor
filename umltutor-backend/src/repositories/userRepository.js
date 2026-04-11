"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma = require('../utils/prisma').default;

const userRepository = {
    async findByEmail(email) {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    },

    async findByFirebaseUid(firebaseUid) {
        return prisma.user.findUnique({
            where: { firebaseUid },
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
                firebaseUid: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },

    async create(userData) {
        return prisma.user.create({
            data: {
                email: userData.email.toLowerCase(),
                password: userData.password || null,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
                firebaseUid: userData.firebaseUid || null,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                firebaseUid: true,
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
    },

    async update(id, userData) {
        return prisma.user.update({
            where: { id: Number(id) },
            data: userData,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                firebaseUid: true
            }
        });
    },

    async deleteById(id) {
        return prisma.user.delete({
            where: { id: Number(id) }
        });
    }
};

exports.default = userRepository;
