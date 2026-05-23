"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const notificationRepository = _interopRequireDefault(require('../repositories/notificationRepository')).default;
const assignmentRepository = _interopRequireDefault(require('../repositories/assignmentRepository')).default;
const serviceCache = require('../utils/serviceCache');

/**
 * Notification Service - optimized with batch operations and queue system.
 */

function notificationCacheKey(userId) {
  return `notifications:user:${userId}`;
}

// Simple in-memory queue for batch notifications
const notificationQueue = [];
const QUEUE_BATCH_SIZE = 50;
const QUEUE_FLUSH_INTERVAL = 5000; // 5 seconds
let queueFlushTimer = null;

function flushQueue() {
  if (notificationQueue.length === 0) return;
  
  const batch = notificationQueue.splice(0, QUEUE_BATCH_SIZE);
  notificationRepository.createMany(batch).catch(err => {
    console.error('Failed to process notification batch:', err);
    // Re-queue failed notifications
    notificationQueue.unshift(...batch);
  });
  
  // If there are more items, schedule next flush
  if (notificationQueue.length > 0) {
    queueFlushTimer = setTimeout(flushQueue, QUEUE_FLUSH_INTERVAL);
  } else {
    queueFlushTimer = null;
  }
}

function addToQueue(notificationData) {
  notificationQueue.push(notificationData);
  if (!queueFlushTimer) {
    queueFlushTimer = setTimeout(flushQueue, QUEUE_FLUSH_INTERVAL);
  }
}

class NotificationService {
  /**
   * Create a notification for a user
   */
  async createNotification({ userId, title, message, type, relatedId }) {
    try {
      const created = await notificationRepository.create({
        userId: Number(userId),
        title,
        message,
        type,
        relatedId: relatedId?.toString(),
        isRead: false
      });
      await serviceCache.invalidate(notificationCacheKey(userId));
      return created;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Create notifications for multiple users - optimized with batch insert
   */
  async notifyMultipleUsers(userIds, { title, message, type, relatedId }) {
    try {
      const data = userIds.map(userId => ({
        userId: Number(userId),
        title,
        message,
        type,
        relatedId: relatedId?.toString(),
        isRead: false
      }));

      // Use queue for large batches to avoid blocking
      if (data.length > QUEUE_BATCH_SIZE) {
        data.forEach(item => addToQueue(item));
        return { queued: data.length };
      }

      return await notificationRepository.createMany(data);
    } catch (error) {
      console.error('Failed to create multiple notifications:', error);
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId) {
    const uid = Number(userId);
    return serviceCache.cached(notificationCacheKey(uid), 60, () =>
      notificationRepository.findMany({ userId: uid }, { createdAt: 'desc' }, 50)
    );
  }

  /**
   * Mark a notification as read — single conditional updateMany (no findFirst round-trip)
   */
  async markAsRead(notificationId, userId) {
    const nid = Number(notificationId);
    const uid = Number(userId);

    // One query: update only if both id AND userId match (ownership check built-in)
    const result = await notificationRepository.updateMany(
      { id: nid, userId: uid, isRead: false },
      { isRead: true }
    );

    if (result.count === 0) {
      // Either not found or already read — verify existence to give correct error
      const exists = await notificationRepository.findFirst({ id: nid, userId: uid });
      if (!exists) {
        const error = new Error('Notification not found');
        error.status = 404;
        throw error;
      }
      // Already read — return it as-is
      return exists;
    }

    await serviceCache.invalidate(notificationCacheKey(userId));
    return { id: nid, isRead: true };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    const result = await notificationRepository.updateMany(
      { userId: Number(userId), isRead: false },
      { isRead: true }
    );
    await serviceCache.invalidate(notificationCacheKey(userId));
    return result;
  }

  /**
   * Check for upcoming deadlines - optimized with batch notifications
   */
  async checkUpcomingDeadlines() {
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();

    const assignments = await assignmentRepository.findMany(
      {
        dueDate: { gt: now, lte: twentyFourHoursFromNow }
      },
      {
        class: { include: { students: { select: { studentId: true } } } },
        submissions: { select: { studentId: true } }
      }
    );

    // Batch all notifications together
    const allNotifications = [];
    for (const assignment of assignments) {
      if (!assignment.class) continue;

      const enrolledStudentIds = assignment.class.students.map(e => e.studentId);
      const submittedStudentIds = assignment.submissions.map(s => s.studentId);
      const pendingStudentIds = enrolledStudentIds.filter(id => !submittedStudentIds.includes(id));

      if (pendingStudentIds.length > 0) {
        pendingStudentIds.forEach(studentId => {
          allNotifications.push({
            userId: studentId,
            title: 'Deadline Approaching',
            message: `The assignment "${assignment.title}" is due in less than 24 hours.`,
            type: 'DEADLINE_REMINDER',
            relatedId: assignment.id
          });
        });
      }
    }
    
    // Process all notifications in batch
    if (allNotifications.length > 0) {
      if (allNotifications.length > QUEUE_BATCH_SIZE) {
        allNotifications.forEach(item => addToQueue(item));
      } else {
        await notificationRepository.createMany(allNotifications).catch(err => {
          console.error('Failed to create deadline notifications:', err);
        });
      }
    }
  }
  
  /**
   * Manually flush the notification queue (for testing or shutdown)
   */
  async flushQueue() {
    if (queueFlushTimer) {
      clearTimeout(queueFlushTimer);
      queueFlushTimer = null;
    }
    flushQueue();
  }
}

exports.default = new NotificationService();
