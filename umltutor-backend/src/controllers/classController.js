"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const classService = _interopRequireDefault(require('../services/classService')).default;
const studentService = _interopRequireDefault(require('../services/studentService')).default;

const createClass = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: { message: 'Class name is required' } });
        }

        const newClass = await classService.createClass(req.user.id, req.body);
        res.status(201).json({ success: true, data: newClass });
    } catch (error) {
        next(error);
    }
}; exports.createClass = createClass;

const getClasses = async (req, res, next) => {
    try {
        const classes = await classService.getClasses(req.user.id);
        const transformedClasses = classes.map((c) => ({
            ...c,
            studentCount: c._count.students,
            totalAssignments: c._count.assignments
        }));

        res.json({ success: true, data: transformedClasses });
    } catch (error) {
        next(error);
    }
}; exports.getClasses = getClasses;

const getJoinedClasses = async (req, res, next) => {
    try {
        const classes = await classService.getJoinedClasses(req.user.id);
        res.json({ success: true, data: classes });
    } catch (error) {
        next(error);
    }
}; exports.getJoinedClasses = getJoinedClasses;

const joinClass = async (req, res, next) => {
    try {
        const { classCode } = req.body;
        if (!classCode) {
            return res.status(400).json({ success: false, error: { message: 'Class code is required' } });
        }

        const result = await classService.joinClass(req.user.id, classCode);
        res.status(201).json({ success: true, data: result, message: 'Successfully joined the class!' });
    } catch (error) {
        next(error);
    }
}; exports.joinClass = joinClass;

const getClass = async (req, res, next) => {
    try {
        const classItem = await classService.getClassDetail(req.params.id, req.user.id);
        res.json({ success: true, data: classItem });
    } catch (error) {
        next(error);
    }
}; exports.getClass = getClass;

const addStudentToClass = async (req, res, next) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student ID is required' });
        }
        const result = await classService.addStudentToClass(req.params.classId, studentId, req.user.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
}; exports.addStudentToClass = addStudentToClass;

const removeStudentFromClass = async (req, res, next) => {
    try {
        const result = await classService.removeStudentFromClass(req.params.classId, req.params.studentId, req.user.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
}; exports.removeStudentFromClass = removeStudentFromClass;

const getEnrolledStudents = async (req, res, next) => {
    try {
        const students = await classService.getClassStudents(req.params.classId, req.user.id, req.user.role);
        res.json({ success: true, data: students });
    } catch (error) {
        next(error);
    }
}; exports.getEnrolledStudents = getEnrolledStudents;

const searchStudents = async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ success: false, error: { message: 'Search query is required' } });
        }
        const students = await studentService.searchStudents(query);
        res.json({ success: true, data: students });
    } catch (error) {
        next(error);
    }
}; exports.searchStudents = searchStudents;

const addMultipleStudentsToClass = async (req, res, next) => {
    try {
        const { studentIds, studentId } = req.body;
        let idsToProcess = studentId ? [studentId] : (studentIds || []);
        if (idsToProcess.length === 0) {
            return res.status(400).json({ success: false, message: "No student IDs provided" });
        }

        const results = [];
        for (const sid of idsToProcess) {
            try {
                const result = await classService.addStudentToClass(req.params.classId, sid, req.user.id);
                results.push(result);
            } catch (err) {
                console.warn(`Failed to add student ${sid}:`, err.message);
            }
        }
        res.json({ success: true, message: "Students successfully processed", results });
    } catch (error) {
        next(error);
    }
}; exports.addMultipleStudentsToClass = addMultipleStudentsToClass;

const getClassAnalytics = async (req, res, next) => {
    try {
        const analytics = await classService.getClassAnalytics(req.params.classId, req.user.id);
        res.json({ success: true, data: analytics });
    } catch (error) {
        next(error);
    }
}; exports.getClassAnalytics = getClassAnalytics;
