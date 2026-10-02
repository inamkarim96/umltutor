"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const notificationService = _interopRequireDefault(require('../services/notificationService')).default;

const getNotifications = async (req, res, next) => {
    try {
        const t0 = Date.now();
        const notifications = await notificationService.getUserNotifications(req.user.id);
        const handlerMs = Date.now() - t0;
        if (handlerMs > 50) {
            console.log(`[Perf] notifications data fetch ${handlerMs}ms (user ${req.user.id})`);
        }
        res.json({ success: true, data: notifications });
    } catch (error) {
        next(error);
    }
}; exports.getNotifications = getNotifications;

const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        await notificationService.markAsRead(id, req.user.id);
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        next(error);
    }
}; exports.markAsRead = markAsRead;

const markAllAsRead = async (req, res, next) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        next(error);
    }
}; exports.markAllAsRead = markAllAsRead;

const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;
        await notificationService.deleteNotification(id, req.user.id);
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        next(error);
    }
}; exports.deleteNotification = deleteNotification;

const clearAllNotifications = async (req, res, next) => {
    try {
        await notificationService.clearAllNotifications(req.user.id);
        res.json({ success: true, message: 'All notifications cleared' });
    } catch (error) {
        next(error);
    }
}; exports.clearAllNotifications = clearAllNotifications;
