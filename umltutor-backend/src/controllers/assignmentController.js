"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const assignmentService = _interopRequireDefault(require('../services/assignmentService')).default;
const fileUpload = require('../utils/fileUpload');

const createAssignmentDefinition = async (req, res, next) => {
    try {
        const { title, description, releaseDate, dueDate, deadline, assignmentType } = req.body;
        const finalDueDate = deadline || dueDate;
        if (!title || !description || !releaseDate || !finalDueDate || !assignmentType) {
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
exports.createClassAssignment = createAssignmentDefinition;

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
        if (req.file) {
            const fileInfo = fileUpload.getFileInfo(req.file);
            updateData.assignmentFileUrl = fileInfo.url;
            updateData.assignmentFileName = fileInfo.originalName;
            updateData.assignmentFileType = fileInfo.mimetype;
        }

        const assignment = await assignmentService.updateAssignmentDefinition(req.params.id, req.user.id, updateData);
        res.json({ success: true, data: { ...assignment, submissionCount: assignment._count?.submissions || 0 } });
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

const getAssignmentSubmissions = async (req, res, next) => {
    try {
        const submissions = await assignmentService.getAssignmentSubmissions(req.params.id, req.user.id);
        res.json({ success: true, data: submissions });
    } catch (error) {
        next(error);
    }
}; exports.getAssignmentSubmissions = getAssignmentSubmissions;

const getAllAssignmentSubmissions = async (req, res, next) => {
    try {
        const submissions = await assignmentService.getAllSubmissionsForTeacher(req.user.id, req.query);
        res.json({ success: true, data: submissions });
    } catch (error) {
        next(error);
    }
}; exports.getAllAssignmentSubmissions = getAllAssignmentSubmissions;

const getAssignmentStats = async (req, res, next) => {
    try {
        const stats = await assignmentService.getAssignmentStatsForTeacher(req.user.id);
        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
}; exports.getAssignmentStats = getAssignmentStats;

const getTeacherStudents = async (req, res, next) => {
    try {
        const students = await assignmentService.getTeacherStudents(req.user.id);
        res.json({ success: true, data: students });
    } catch (error) {
        next(error);
    }
}; exports.getTeacherStudents = getTeacherStudents;

const getTeacherSubmission = async (req, res, next) => {
    try {
        const submission = await assignmentService.getTeacherSubmission(req.params.assignmentId, req.params.studentId, req.user.id);
        res.json({ success: true, data: submission });
    } catch (error) {
        next(error);
    }
}; exports.getTeacherSubmission = getTeacherSubmission;

const getAssignmentReviewData = async (req, res, next) => {
    try {
        const data = await assignmentService.getAssignmentReviewData(req.params.id, req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}; exports.getAssignmentReviewData = getAssignmentReviewData;

const submitReview = async (req, res, next) => {
    try {
        const result = await assignmentService.submitReview(req.params.id, req.user.id, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}; exports.submitReview = submitReview;

const gradeSubmission = async (req, res, next) => {
    try {
        const submission = await assignmentService.gradeSubmission(req.params.submissionId, req.user.id, req.body);
        res.json({ success: true, data: submission });
    } catch (error) {
        next(error);
    }
}; exports.gradeSubmission = gradeSubmission;

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

const saveAssignmentSection = async (req, res, next) => {
    try {
        const { sectionType, data } = req.body;
        const result = await assignmentService.saveAssignmentSection(req.params.id, req.user.id, sectionType, data);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}; exports.saveAssignmentSection = saveAssignmentSection;

const updateAssignmentSection = async (req, res, next) => {
    try {
        const { sectionType, data } = req.body;
        const result = await assignmentService.saveAssignmentSection(req.params.id, req.user.id, sectionType, data);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}; exports.updateAssignmentSection = updateAssignmentSection;

const getAssignmentProgress = async (req, res, next) => {
    try {
        const progress = await assignmentService.getAssignmentProgress(req.params.id, req.user.id);
        res.json({ success: true, data: progress });
    } catch (error) {
        next(error);
    }
}; exports.getAssignmentProgress = getAssignmentProgress;

const getWorkflowProgress = async (req, res, next) => {
    try {
        const progress = await assignmentService.getAssignmentProgress(req.params.id, req.user.id);
        res.json({ success: true, data: progress });
    } catch (error) {
        next(error);
    }
}; exports.getWorkflowProgress = getWorkflowProgress;

const getAssignmentCompletionStatus = async (req, res, next) => {
    try {
        const progress = await assignmentService.getAssignmentProgress(req.params.id, req.user.id);
        res.json({ success: true, data: progress });
    } catch (error) {
        next(error);
    }
}; exports.getAssignmentCompletionStatus = getAssignmentCompletionStatus;

const saveAssignmentProgress = async (req, res, next) => {
    try {
        const submission = await assignmentService.startAssignment(req.params.id, req.user.id);
        res.json({ success: true, data: submission });
    } catch (error) {
        next(error);
    }
}; exports.saveAssignmentProgress = saveAssignmentProgress;

const getSubmissionReceipt = async (req, res, next) => {
    try {
        const receipt = await assignmentService.getSubmissionReceipt(req.params.id, req.user.id);
        receipt.studentName = `${req.user.firstName} ${req.user.lastName}`;
        res.json({ success: true, data: receipt });
    } catch (error) {
        next(error);
    }
}; exports.getSubmissionReceipt = getSubmissionReceipt;

const getStudentAnalytics = async (req, res, next) => {
    try {
        const analytics = await assignmentService.getStudentAnalytics(req.user.id);
        res.json({ success: true, data: analytics });
    } catch (error) {
        next(error);
    }
}; exports.getStudentAnalytics = getStudentAnalytics;

const getMySubmissions = async (req, res, next) => {
    try {
        const submissions = await assignmentService.getMySubmissions(req.user.id);
        res.json({ success: true, data: submissions });
    } catch (error) {
        next(error);
    }
}; exports.getMySubmissions = getMySubmissions;
