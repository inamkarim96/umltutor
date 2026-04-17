"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const assignmentRepository = _interopRequireDefault(require('../repositories/assignmentRepository')).default;
const { NotFoundError, AuthorizationError, ValidationError, AppError } = require('../utils/errors');
const classRepository = _interopRequireDefault(require('../repositories/classRepository')).default;
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const submissionRepository = _interopRequireDefault(require('../repositories/submissionRepository')).default;
const notificationService = _interopRequireDefault(require('./notificationService')).default;

class AssignmentService {
  _extractArtifactsFromSubmission(submission) {
    if (submission?.artifacts && !Array.isArray(submission.artifacts)) return submission.artifacts;
    return {
      useCaseDiagram: this._safeParseJson(submission?.useCaseDiagram?.data) || { nodes: [], edges: [] },
      useCaseDescription: (submission?.useCaseDescriptions || []).reduce((acc, d) => ({ ...acc, [d.relatedId]: this._safeParseJson(d.data) }), {}),
      systemSequenceDiagram: (submission?.ssdDiagrams || []).reduce((acc, s) => ({ ...acc, [s.relatedId]: this._safeParseJson(s.data) }), {})
    };
  }

  _safeParseJson(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return value; }
  }

  async createAssignmentDefinition(data) {
    const existing = await assignmentRepository.findFirst({ where: { classId: Number(data.classId), title: data.title } });
    if (existing) {
        const error = new Error(`An assignment with the name "${data.title}" already exists.`);
        error.status = 400;
        throw error;
    }

    const assignment = await assignmentRepository.create({
      title: data.title,
      dueDate: data.dueDate,
      releaseDate: data.releaseDate || new Date(),
      textContent: data.textContent,
      assignmentFileUrl: data.assignmentFileUrl,
      assignmentFileName: data.assignmentFileName,
      assignmentFileType: data.assignmentFileType,
      maxScore: Number(data.maxScore),
      type: data.type || data.assignmentType,
      classId: Number(data.classId),
      createdBy: Number(data.teacherId),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (data.classId) {
      const memberships = await classRepository.findMemberships({ where: { classId: Number(data.classId) }, select: { studentId: true } });
      const studentIds = memberships.map(e => e.studentId);
      if (studentIds.length > 0) {
        await notificationService.notifyMultipleUsers(studentIds, {
          title: 'New Assignment',
          message: `A new assignment "${data.title}" has been posted.`,
          type: 'ASSIGNMENT_CREATED',
          relatedId: assignment.id.toString()
        });
      }
    }
    return assignment;
  }

  async getAssignmentDefinitions(teacherId, status) {
    const assignments = await assignmentRepository.findMany({ createdBy: Number(teacherId) }, { class: true, _count: { select: { submissions: true } } }, { createdAt: 'desc' });
    return assignments.map(a => ({ ...a, deadline: a.dueDate?.toISOString() }));
  }

  async getClassAssignments(classId, userId, role) {
    const assignments = await assignmentRepository.findMany({ classId: Number(classId) }, { class: true, _count: role === 'TEACHER' ? { select: { submissions: true } } : undefined }, { dueDate: 'asc' });
    return assignments.map(a => ({ ...a, deadline: a.dueDate?.toISOString() }));
  }

  async getAssignmentDefinition(assignmentId, teacherId) {
    const assignment = await assignmentRepository.findFirst({ id: Number(assignmentId), ...(teacherId ? { createdBy: Number(teacherId) } : {}) }, { class: true, _count: { select: { submissions: true } } });
    if (assignment) assignment.deadline = assignment.dueDate?.toISOString();
    return assignment;
  }

  async updateAssignmentDefinition(assignmentId, teacherId, data) {
    return await assignmentRepository.update({ id: Number(assignmentId), createdBy: Number(teacherId) }, data);
  }

  async deleteAssignmentDefinition(assignmentId, teacherId) {
    await assignmentRepository.delete({ id: Number(assignmentId), createdBy: Number(teacherId) });
  }

  async startAssignment(assignmentId, studentId) {
    const aid = Number(assignmentId);
    const sid = Number(studentId);
    let submission = await submissionRepository.findFirst({ where: { assignmentId: aid, studentId: sid } });
    if (!submission) {
        submission = await submissionRepository.create({ assignmentId: aid, studentId: sid, status: 'draft' });
    }
    return submission;
  }

  async getAvailableAssignmentsForStudent(studentId) {
    const studentIdNum = Number(studentId);
    const assignments = await assignmentRepository.findMany({ class: { students: { some: { studentId: studentIdNum } } } }, { class: true }, { createdAt: 'desc' });
    const result = [];
    for (const assignment of assignments) {
      const submission = await submissionRepository.findFirst({
        where: { assignmentId: assignment.id, studentId: studentIdNum },
        include: { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true, evaluation: true }
      });
      result.push({
        ...assignment,
        deadline: assignment.dueDate?.toISOString(),
        status: submission?.status || 'pending',
        score: submission?.evaluation?.totalScore || null,
        feedback: submission?.evaluation?.remarks,
        artifacts: this._extractArtifactsFromSubmission(submission)
      });
    }
    return result;
  }

  async getAssignmentForStudent(assignmentId, studentId) {
    const assignmentIdNum = Number(assignmentId);
    const studentIdNum = Number(studentId);
    const assignment = await assignmentRepository.findFirst({ id: assignmentIdNum, class: { students: { some: { studentId: studentIdNum } } } }, { class: true });
    if (!assignment) throw new Error('Assignment not found');
    const submission = await submissionRepository.findFirst({
      where: { assignmentId: assignmentIdNum, studentId: studentIdNum },
      include: { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true, evaluation: true }
    });
    return { ...assignment, deadline: assignment.dueDate?.toISOString(), submission, artifacts: this._extractArtifactsFromSubmission(submission) };
  }
}

exports.default = new AssignmentService();
