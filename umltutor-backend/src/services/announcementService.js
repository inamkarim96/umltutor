"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const prisma = require('../utils/prisma').default;

class AnnouncementService {
  async createAnnouncement(classId, authorId, data) {
    const { content, parentId } = data;
    
    return await prisma.announcement.create({
      data: {
        content,
        classId: Number(classId),
        authorId: Number(authorId),
        parentId: parentId ? Number(parentId) : null
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    });
  }

  async getClassAnnouncements(classId) {
    // Fetch only top-level announcements (parentId is null)
    // and include their replies
    return await prisma.announcement.findMany({
      where: { 
        classId: Number(classId),
        parentId: null
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteAnnouncement(announcementId, userId, role) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: Number(announcementId) },
      include: { class: true }
    });

    if (!announcement) throw new Error('Announcement not found');

    // Only author or class teacher can delete
    const isAuthor = announcement.authorId === Number(userId);
    const isTeacher = role === 'TEACHER' && announcement.class.teacherId === Number(userId);

    if (!isAuthor && !isTeacher) {
      throw new Error('Access denied');
    }

    return await prisma.announcement.delete({
      where: { id: Number(announcementId) }
    });
  }

  async updateAnnouncement(announcementId, userId, role, data) {
    const { content } = data;
    
    const announcement = await prisma.announcement.findUnique({
      where: { id: Number(announcementId) },
      include: { class: true }
    });

    if (!announcement) throw new Error('Announcement not found');

    // Only author or class teacher can edit
    const isAuthor = announcement.authorId === Number(userId);
    const isTeacher = role === 'TEACHER' && announcement.class.teacherId === Number(userId);

    if (!isAuthor && !isTeacher) {
      throw new Error('Access denied. You can only edit your own posts.');
    }

    return await prisma.announcement.update({
      where: { id: Number(announcementId) },
      data: { 
        content,
        updatedAt: new Date() // Trigger updatedAt update
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }
}

exports.default = new AnnouncementService();
