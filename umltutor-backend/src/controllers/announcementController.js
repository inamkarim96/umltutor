"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const announcementService = _interopRequireDefault(require('../services/announcementService')).default;

const createAnnouncement = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const announcement = await announcementService.createAnnouncement(classId, req.user.id, req.body);
        res.status(201).json({ success: true, data: announcement });
    } catch (error) {
        next(error);
    }
}; exports.createAnnouncement = createAnnouncement;

const getAnnouncements = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const announcements = await announcementService.getClassAnnouncements(classId);
        res.json({ success: true, data: announcements });
    } catch (error) {
        next(error);
    }
}; exports.getAnnouncements = getAnnouncements;

const deleteAnnouncement = async (req, res, next) => {
    try {
        const { id } = req.params;
        await announcementService.deleteAnnouncement(id, req.user.id, req.user.role);
        res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
        next(error);
    }
}; exports.deleteAnnouncement = deleteAnnouncement;

const updateAnnouncement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const announcement = await announcementService.updateAnnouncement(id, req.user.id, req.user.role, req.body);
        res.json({ success: true, data: announcement });
    } catch (error) {
        next(error);
    }
}; exports.updateAnnouncement = updateAnnouncement;
