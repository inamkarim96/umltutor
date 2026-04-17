"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const assignmentService = _interopRequireDefault(require('../services/assignmentService')).default;
const fileUpload = require('../utils/fileUpload');

const createAssignmentDefinition = async (req, res, next) => {
    try {
        const { title, releaseDate, dueDate, deadline, assignmentType } = req.body;
        const finalDueDate = deadline || dueDate;
        if (!title || !releaseDate || !finalDueDate || !assignmentType) {
            return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
        }
        const textContent = req.body.textContent || req.body.contentText || null;
        let fileInfo = req.file ? fileUpload.getFileInfo(req.file) : null;
        const assignmentData = {
            ...req.body,
            classId: req.params.classId ? Number(req.params.classId) : (req.body.classId ? Number(req.body.classId) : null),
            teacherId: req.user.id,
            releaseDate: new Date(releaseDate),
            dueDate: new Date(finalDueDate),
            textContent: assignmentType === 'TEXT' ? textContent : null,
            ...(fileInfo && {
                assignmentFileUrl: fileInfo.url,
                assignmentFileName: fileInfo.originalName,
                assignmentFileType: fileInfo.type
            })
        };
        const assignment = await assignmentService.createAssignmentDefinition(assignmentData);
        res.status(201).json({ success: true, data: { ...assignment, submissionCount: 0 } });
    } catch (error) {
        next(error);
    }
}; exports.createAssignmentDefinition = createAssignmentDefinition;

const getClassAssignments = async (req, res, next) => {
    try {
        const assignments = await assignmentService.getClassAssignments(req.params.classId, req.user.id, req.user.role);
        if (req.user.role === 'TEACHER') {
            const transformed = assignments.map(a => ({
                ...a,
                submissionCount: a._count?.submissions || 0
            }));
            return res.json({ success: true, data: transformed });
        }
        res.json({ success: true, data: assignments });
    } catch (error) {
        next(error);
    }
}; exports.getClassAssignments = getClassAssignments;

const getAssignmentDefinitions = async (req, res, next) => {
    try {
        const assignments = await assignmentService.getAssignmentDefinitions(req.user.id, req.query.status);
        const transformed = assignments.map(a => ({
            ...a,
            submissionCount: a._count?.submissions || 0
        }));
        res.json({ success: true, data: transformed });
    } catch (error) {
        next(error);
    }
}; exports.getAssignmentDefinitions = getAssignmentDefinitions;

const getAssignmentDefinition = async (req, res, next) => {
    try {
        const assignment = await assignmentService.getAssignmentDefinition(req.params.id, req.user.id);
        if (!assignment) return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        res.json({ success: true, data: { ...assignment, submissionCount: assignment._count?.submissions || 0 } });
    } catch (error) {
        next(error);
    }
}; exports.getAssignmentDefinition = getAssignmentDefinition;

const updateAssignmentDefinition = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        if (req.body.releaseDate) updateData.releaseDate = new Date(req.body.releaseDate);
        if (req.body.dueDate || req.body.deadline) updateData.dueDate = new Date(req.body.dueDate || req.body.deadline);

        delete updateData.deadline;

        if (updateData.assignmentType) {
            updateData.type = updateData.assignmentType;
            delete updateData.assignmentType;
        }

        if (updateData.maxScore !== undefined) updateData.maxScore = Number(updateData.maxScore);
        if (updateData.classId !== undefined) updateData.classId = Number(updateData.classId);

        if (req.file) {
            const fileInfo = fileUpload.getFileInfo(req.file);
            updateData.assignmentFileUrl = fileInfo.url;
            updateData.assignmentFileName = fileInfo.originalName;
            updateData.assignmentFileType = fileInfo.type;
        }

        const assignment = await assignmentService.updateAssignmentDefinition(req.params.id, req.user.id, updateData);
        res.json({ success: true, data: assignment });
    } catch (error) {
        next(error);
    }
}; exports.updateAssignmentDefinition = updateAssignmentDefinition;

const deleteAssignmentDefinition = async (req, res, next) => {
    try {
        await assignmentService.deleteAssignmentDefinition(req.params.id, req.user.id);
        res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
        next(error);
    }
}; exports.deleteAssignmentDefinition = deleteAssignmentDefinition;

// Student Controllers

const getStudentAssignments = async (req, res, next) => {
    try {
        const assignments = await assignmentService.getAvailableAssignmentsForStudent(req.user.id);
        res.json({ success: true, data: assignments });
    } catch (error) {
        next(error);
    }
}; exports.getStudentAssignments = getStudentAssignments;

const getStudentAssignment = async (req, res, next) => {
    try {
        const result = await assignmentService.getAssignmentForStudent(req.params.id, req.user.id);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}; exports.getStudentAssignment = getStudentAssignment;

const startAssignment = async (req, res, next) => {
    try {
        const submission = await assignmentService.startAssignment(req.params.id, req.user.id);
        res.json({ success: true, data: submission });
    } catch (error) {
        next(error);
    }
}; exports.startAssignment = startAssignment;
