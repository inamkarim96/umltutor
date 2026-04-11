"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const prisma = require('../utils/prisma').default;
const { deleteFile } = require('../utils/fileUpload');
const path = require('path');

class ResourceService {
  async addResource(classId, uploaderId, fileData, folder = null) {
    const { originalName, url, type, size } = fileData;

    // If student, check if class allows student uploads
    const classData = await prisma.class.findUnique({
      where: { id: Number(classId) }
    });

    if (uploaderId !== classData.teacherId) {
      if (!classData.allowStudentUploads) {
        throw new Error('Student uploads are currently disabled for this class.');
      }
    }

    return await prisma.resource.create({
      data: {
        name: originalName,
        url,
        type,
        size,
        folder: folder || null,
        classId: Number(classId),
        uploadedBy: Number(uploaderId)
      }
    });
  }

  async getClassResources(classId) {
    return await prisma.resource.findMany({
      where: { classId: Number(classId) },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteResource(resourceId, userId, role) {
    const resource = await prisma.resource.findUnique({
      where: { id: Number(resourceId) },
      include: { class: true }
    });

    if (!resource) throw new Error('Resource not found');

    // Only class teacher or the author can delete resources
    if (resource.class.teacherId !== Number(userId) && resource.uploadedBy !== Number(userId)) {
      throw new Error('Access denied. You can only delete your own resources or resources in your class.');
    }

    // Delete record from DB
    await prisma.resource.delete({
      where: { id: Number(resourceId) }
    });

    // Optionally handle actual file deletion if needed
    // But usually url is external or we keep it for audit.
    // If local, we should delete:
    // try { deleteFile(path.join('uploads', 'assignments', resource.url.split('/').pop())); } catch(e) {}

    return { message: 'Resource deleted' };
  }
}

exports.default = new ResourceService();
