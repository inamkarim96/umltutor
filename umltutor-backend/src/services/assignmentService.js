"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const assignmentRepository = _interopRequireDefault(require('../repositories/assignmentRepository')).default;
const { NotFoundError, AuthorizationError, ValidationError, AppError } = require('../utils/errors');
const classRepository = _interopRequireDefault(require('../repositories/classRepository')).default;
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const submissionRepository = _interopRequireDefault(require('../repositories/submissionRepository')).default;
const notificationService = _interopRequireDefault(require('./notificationService')).default;
const serviceCache = require('../utils/serviceCache');
// Hoist prisma to module scope — avoids repeated dynamic require on every cache-miss
const prisma = require('../config/prisma');

/**
 * Assignment Service - optimized with batch operations, query optimization, and improved caching.
 */

class AssignmentService {
  _extractArtifactsFromSubmission(submission) {
    if (!submission) {
      return {
        useCaseDiagram: { nodes: [], edges: [] },
        useCaseDescription: {},
        systemSequenceDiagram: {},
        classDiagram: { nodes: [], edges: [] },
        sequenceDiagrams: {},
      };
    }
    if (submission.artifacts && !Array.isArray(submission.artifacts)) {
      return submission.artifacts;
    }
    try {
      return {
        useCaseDiagram: this._safeParseJson(submission.useCaseDiagram?.data) || { nodes: [], edges: [] },
        useCaseDescription: (submission.useCaseDescriptions || []).reduce(
          (acc, d) => ({ ...acc, [d.relatedId]: this._safeParseJson(d.data) }),
          {}
        ),
        systemSequenceDiagram: (submission.ssdDiagrams || []).reduce(
          (acc, s) => ({ ...acc, [s.relatedId]: this._safeParseJson(s.data) }),
          {}
        ),
        classDiagram: this._safeParseJson(submission.classDiagram?.data) || { nodes: [], edges: [] },
        sequenceDiagrams: (submission.sequenceDiagrams || []).reduce(
          (acc, s) => ({ ...acc, [s.relatedId]: this._safeParseJson(s.data) }),
          {}
        ),
      };
    } catch (err) {
      console.error('[AssignmentService] Failed to parse submission artifacts:', err.message);
      return {
        useCaseDiagram: { nodes: [], edges: [] },
        useCaseDescription: {},
        systemSequenceDiagram: {},
        classDiagram: { nodes: [], edges: [] },
        sequenceDiagrams: {},
      };
    }
  }

  _leanSubmissionForClient(submission) {
    if (!submission) return null;
    const { evaluation, ...rest } = submission;
    return {
      ...rest,
      evaluation: evaluation
        ? {
            totalScore: evaluation.totalScore,
            remarks: evaluation.remarks,
          }
        : null,
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

    // Batch notification for all students in class
    if (data.classId) {
      const memberships = await classRepository.findMemberships({ 
        where: { classId: Number(data.classId) }, 
        select: { studentId: true } 
      });
      const studentIds = memberships.map(e => e.studentId);
      if (studentIds.length > 0) {
        // Use batch notification instead of individual calls
        await notificationService.notifyMultipleUsers(studentIds, {
          title: 'New Assignment',
          message: `A new assignment "${data.title}" has been posted.`,
          type: 'ASSIGNMENT_CREATED',
          relatedId: assignment.id.toString()
        });
      }
    }
    
    // Invalidate cache
    serviceCache.invalidatePrefix(`assignments:teacher:${data.teacherId}`);
    serviceCache.invalidatePrefix('assignments:class:');
    
    return assignment;
  }

  async getAssignmentDefinitions(teacherId, status) {
    const cacheKey = `assignments:teacher:${teacherId}:${status || 'all'}`;
    return serviceCache.cached(cacheKey, 300, async () => {
      // Optimized query with only necessary fields
      const assignments = await prisma.assignment.findMany({
        where: { createdBy: Number(teacherId) },
        select: {
          id: true,
          title: true,
          dueDate: true,
          releaseDate: true,
          maxScore: true,
          type: true,
          classId: true,
          createdAt: true,
          class: { select: { id: true, name: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return assignments.map((a) => ({ ...a, deadline: a.dueDate?.toISOString() ?? null }));
    });
  }

  async getClassAssignments(classId, userId, role) {
    const cacheKey = `assignments:class:${classId}:${role || 'all'}`;
    return serviceCache.cached(cacheKey, 180, async () => {
      // Optimized query with conditional select based on role
      const assignments = await prisma.assignment.findMany({
        where: { classId: Number(classId) },
        select: {
          id: true,
          title: true,
          dueDate: true,
          releaseDate: true,
          maxScore: true,
          type: true,
          classId: true,
          createdAt: true,
          class: { select: { id: true, name: true } },
          ...(role === 'TEACHER' ? { _count: { select: { submissions: true } } } : {}),
        },
        orderBy: { dueDate: 'asc' },
      });
      return assignments.map((a) => ({ ...a, deadline: a.dueDate?.toISOString() ?? null }));
    });
  }

  async getAssignmentDefinition(assignmentId, teacherId) {
    const assignment = await assignmentRepository.findFirst({ id: Number(assignmentId), ...(teacherId ? { createdBy: Number(teacherId) } : {}) }, { class: true, _count: { select: { submissions: true } } });
    if (assignment) assignment.deadline = assignment.dueDate?.toISOString();
    return assignment;
  }

  async updateAssignmentDefinition(assignmentId, teacherId, data) {
    await serviceCache.invalidatePrefix(`assignments:teacher:${teacherId}`);
    await serviceCache.invalidatePrefix('assignments:student:');
    await serviceCache.invalidatePrefix('assignments:class:');
    return await assignmentRepository.update({ id: Number(assignmentId), createdBy: Number(teacherId) }, data);
  }

  async deleteAssignmentDefinition(assignmentId, teacherId) {
    await serviceCache.invalidatePrefix(`assignments:teacher:${teacherId}`);
    await serviceCache.invalidatePrefix('assignments:student:');
    await serviceCache.invalidatePrefix('assignments:class:');
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
    const cacheKey = `assignments:student:${studentIdNum}:list`;
    return serviceCache.cached(cacheKey, 120, async () => {
    // Optimized query with single fetch for assignments and submissions
    const assignments = await prisma.assignment.findMany({
      where: { class: { students: { some: { studentId: studentIdNum } } } },
      select: {
        id: true,
        title: true,
        dueDate: true,
        releaseDate: true,
        maxScore: true,
        type: true,
        classId: true,
        createdAt: true,
        class: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (assignments.length === 0) return [];

    const assignmentIds = assignments.map((a) => a.id);
    // Batch fetch submissions for all assignments at once
    const submissions = await submissionRepository.findMany({
      where: { studentId: studentIdNum, assignmentId: { in: assignmentIds } },
      select: {
        assignmentId: true,
        status: true,
        evaluation: { select: { totalScore: true, remarks: true } },
      },
    });
    const submissionByAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));

    const result = assignments.map((assignment) => {
      const submission = submissionByAssignment.get(assignment.id);
      return {
        ...assignment,
        deadline: assignment.dueDate?.toISOString() ?? null,
        status: submission?.status || 'pending',
        score: submission?.evaluation?.totalScore ?? null,
        feedback: submission?.evaluation?.remarks ?? null,
      };
    });

    return result;
    });
  }

  async getAssignmentForStudent(assignmentId, studentId) {
    const assignmentIdNum = Number(assignmentId);
    const studentIdNum = Number(studentId);

    if (!Number.isFinite(assignmentIdNum) || assignmentIdNum <= 0) {
      throw new ValidationError('Invalid assignment ID');
    }
    if (!Number.isFinite(studentIdNum) || studentIdNum <= 0) {
      throw new ValidationError('Invalid student ID');
    }

    const cacheKey = `assignment:student:${studentIdNum}:${assignmentIdNum}`;

    return serviceCache.cached(cacheKey, 90, async () => {
      const assignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentIdNum,
          class: { students: { some: { studentId: studentIdNum } } },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          releaseDate: true,
          maxScore: true,
          type: true,
          classId: true,
          textContent: true,
          assignmentFileUrl: true,
          assignmentFileName: true,
          assignmentFileType: true,
          class: { select: { id: true, name: true } },
        },
      });
      if (!assignment) throw new NotFoundError('Assignment');

      let submission = null;
      try {
        submission = await submissionRepository.findFirst({
          where: { assignmentId: assignmentIdNum, studentId: studentIdNum },
          include: {
            useCaseDiagram: true,
            useCaseDescriptions: true,
            ssdDiagrams: true,
            classDiagram: true,
            sequenceDiagrams: true,
            evaluation: { select: { totalScore: true, remarks: true } },
          },
        });
      } catch (dbErr) {
        console.error(
          `[AssignmentService] Submission load failed for assignment=${assignmentIdNum} student=${studentIdNum}:`,
          dbErr.message
        );
        throw new DatabaseError('Failed to load your saved work for this assignment');
      }

      return {
        ...assignment,
        deadline: assignment.dueDate?.toISOString() ?? null,
        submission: this._leanSubmissionForClient(submission),
        artifacts: this._extractArtifactsFromSubmission(submission),
      };
    }, 45_000);
  }
}

exports.default = new AssignmentService();
