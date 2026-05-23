"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const prisma = require('../utils/prisma').default;
const { deleteFile } = require('../utils/fileUpload');
const path = require('path');
const serviceCache = require('../utils/serviceCache');

class ResourceService {
  async addResource(classId, uploaderId, fileData, folder = null) {
    const { originalName, url, type, size } = fileData;

    // If student, check if class allows student uploads
    const classData = await prisma.class.findUnique({
      where: { id: Number(classId) },
      select: { teacherId: true, allowStudentUploads: true }
    });

    if (!classData) throw new Error('Class not found');

    if (uploaderId !== classData.teacherId) {
      if (!classData.allowStudentUploads) {
        throw new Error('Student uploads are currently disabled for this class.');
      }
    }

    const resource = await prisma.resource.create({
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

    // Invalidate resource list cache for the class
    serviceCache.invalidate(`resources:class:${classId}`);

    return resource;
  }

  async getClassResources(classId) {
    const cacheKey = `resources:class:${classId}`;
    return serviceCache.cached(cacheKey, 60, () =>
      prisma.resource.findMany({
        where: { classId: Number(classId) },
        select: {
          id: true,
          name: true,
          url: true,
          type: true,
          size: true,
          folder: true,
          uploadedBy: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
    );
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

    // Invalidate resource list cache for the class
    serviceCache.invalidate(`resources:class:${resource.classId}`);

    // Optionally handle actual file deletion if needed
    // But usually url is external or we keep it for audit.
    // If local, we should delete:
    // try { deleteFile(path.join('uploads', 'assignments', resource.url.split('/').pop())); } catch(e) {}

    return { message: 'Resource deleted' };
  }
}

exports.default = new ResourceService();

