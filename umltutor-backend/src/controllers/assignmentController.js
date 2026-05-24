"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const assignmentService = _interopRequireDefault(require('../services/assignmentService')).default;
const fileUpload = require('../utils/fileUpload');

/**
 * Module-level helper — adds submissionCount from pre-computed _count.
 * Avoids duplicate inline spread pattern across 3 handlers.
 */
const addSubmissionCount = (a) => ({ ...a, submissionCount: a._count?.submissions || 0 });

const createAssignmentDefinition = async (req, res, next) => {
    try {
        // Destructure only the fields the service actually uses — avoids spreading the
        // entire req.body which may carry large diagram data sent by the frontend.
        const {
            title,
            releaseDate,
            dueDate,
            deadline,
            assignmentType,
            type,
            textContent,
            contentText,
            maxScore,
            classId: bodyClassId,
        } = req.body;

        const finalDueDate = deadline || dueDate;
        if (!title || !releaseDate || !finalDueDate || !assignmentType) {
            return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
        }

        let cdnUrl = req.file ? await fileUpload.uploadToCDN(req.file, 'assignments') : null;
        let fileInfo = req.file ? fileUpload.getFileInfo(req.file) : null;

        const assignmentData = {
            title,
            releaseDate: new Date(releaseDate),
            dueDate: new Date(finalDueDate),
            // Service accepts either `type` or `assignmentType`
            assignmentType,
            type,
            textContent: assignmentType === 'TEXT' ? (textContent || contentText || null) : null,
            maxScore: maxScore != null ? Number(maxScore) : undefined,
            classId: req.params.classId ? Number(req.params.classId) : (bodyClassId ? Number(bodyClassId) : null),
            teacherId: req.user.id,
            ...(req.file && {
                assignmentFileUrl: cdnUrl,
                assignmentFileName: req.file.originalname,
                assignmentFileType: fileInfo?.type
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
        // Teachers get submissionCount; students get raw assignments (no _count field)
        const data = req.user.role === 'TEACHER' ? assignments.map(addSubmissionCount) : assignments;
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}; exports.getClassAssignments = getClassAssignments;

const getAssignmentDefinitions = async (req, res, next) => {
    try {
        const assignments = await assignmentService.getAssignmentDefinitions(req.user.id, req.query.status);
        res.json({ success: true, data: assignments.map(addSubmissionCount) });
    } catch (error) {
        next(error);
    }
}; exports.getAssignmentDefinitions = getAssignmentDefinitions;

const getAssignmentDefinition = async (req, res, next) => {
    try {
        const assignment = await assignmentService.getAssignmentDefinition(req.params.id, req.user.id);
        if (!assignment) return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
        res.json({ success: true, data: addSubmissionCount(assignment) });
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
            const cdnUrl = await fileUpload.uploadToCDN(req.file, 'assignments');
            const fileInfo = fileUpload.getFileInfo(req.file);
            updateData.assignmentFileUrl = cdnUrl;
            updateData.assignmentFileName = req.file.originalname;
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
        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                error: { message: 'Authentication required', code: 'AUTHENTICATION_ERROR' },
            });
        }
        const assignmentId = req.params.id;
        const studentId = req.user.id;
        const result = await assignmentService.getAssignmentForStudent(assignmentId, studentId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error(
            `[getStudentAssignment] route=GET /api/student/assignments/:id assignmentId=${req.params.id} studentId=${req.user?.id}:`,
            error.message
        );
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
