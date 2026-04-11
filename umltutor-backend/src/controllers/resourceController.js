"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const resourceService = _interopRequireDefault(require('../services/resourceService')).default;
const { getFileInfo } = require('../utils/fileUpload');

const uploadResource = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const { folder } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const fileData = getFileInfo(req.file, 'assignments'); // Using assignments dir for convenience
        const resource = await resourceService.addResource(classId, req.user.id, fileData, folder);
        
        res.status(201).json({ success: true, data: resource });
    } catch (error) {
        next(error);
    }
}; exports.uploadResource = uploadResource;

const getResources = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const resources = await resourceService.getClassResources(classId);
        res.json({ success: true, data: resources });
    } catch (error) {
        next(error);
    }
}; exports.getResources = getResources;

const deleteResource = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await resourceService.deleteResource(id, req.user.id, req.user.role);
        res.json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
}; exports.deleteResource = deleteResource;
