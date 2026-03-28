"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const notificationRepository = _interopRequireDefault(require('../repositories/notificationRepository')).default;
const assignmentRepository = _interopRequireDefault(require('../repositories/assignmentRepository')).default;

class NotificationService {
  /**
   * Create a notification for a user
   */
  async createNotification({ userId, title, message, type, relatedId }) {
    try {
      return await notificationRepository.create({
        userId: Number(userId),
        title,
        message,
        type,
        relatedId: relatedId?.toString(),
        isRead: false
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Create notifications for multiple users
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
    return await notificationRepository.findMany(
      { userId: Number(userId) },
      { createdAt: 'desc' },
      50
    );
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId, userId) {
    const nid = Number(notificationId);
    const notification = await notificationRepository.findFirst({ id: nid, userId: Number(userId) });

    if (!notification) {
      const error = new Error('Notification not found');
      error.status = 404;
      throw error;
    }

    return await notificationRepository.update({ id: nid }, { isRead: true });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    return await notificationRepository.updateMany(
      { userId: Number(userId), isRead: false },
      { isRead: true }
    );
  }

  /**
   * Check for upcoming deadlines
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

    for (const assignment of assignments) {
      if (!assignment.class) continue;

      const enrolledStudentIds = assignment.class.students.map(e => e.studentId);
      const submittedStudentIds = assignment.submissions.map(s => s.studentId);
      const pendingStudentIds = enrolledStudentIds.filter(id => !submittedStudentIds.includes(id));

      if (pendingStudentIds.length > 0) {
        await this.notifyMultipleUsers(pendingStudentIds, {
          title: 'Deadline Approaching',
          message: `The assignment "${assignment.title}" is due in less than 24 hours.`,
          type: 'DEADLINE_REMINDER',
          relatedId: assignment.id
        });
      }
    }
  }
}

exports.default = new NotificationService();
