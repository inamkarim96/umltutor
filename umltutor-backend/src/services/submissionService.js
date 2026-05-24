"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const submissionRepository = _interopRequireDefault(require('../repositories/submissionRepository')).default;
const assignmentRepository = _interopRequireDefault(require('../repositories/assignmentRepository')).default;
const classRepository = _interopRequireDefault(require('../repositories/classRepository')).default;
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const notificationService = _interopRequireDefault(require('./notificationService')).default;
const serviceCache = require('../utils/serviceCache');
const CheckingEngine = require('./checkingEngine').CheckingEngine;
const { AppError, NotFoundError, AuthorizationError, ValidationError } = require('../utils/errors');
const {
  computeSubmissionCompletion,
  resolveTutorialRequestStatus,
  isSubmissionSubmitted,
  validateTutorialApproval,
} = require('../utils/tutorialRequestUtils');
const { findSubmissionStatus } = require('../utils/submissionQueryUtils');

/**
 * Submission Service - optimized with parallel artifact upserts and improved transaction handling.
 */

class SubmissionService {
  async _assertTeacherOwnsSubmission(submissionId, teacherId) {
    const submission = await submissionRepository.findUnique({
      where: { id: Number(submissionId) },
      select: {
        id: true,
        studentId: true,
        assignmentId: true,
        assignment: {
          select: {
            id: true,
            title: true,
            createdBy: true,
            class: { select: { teacherId: true, name: true } },
          },
        },
      },
    });
    if (!submission) throw new NotFoundError('Submission');
    const ownerTeacherId = submission.assignment?.createdBy || submission.assignment?.class?.teacherId;
    if (ownerTeacherId !== Number(teacherId)) {
      throw new AuthorizationError('Unauthorized access to submission');
    }
    return submission;
  }

  _invalidateSubmissionCaches(assignmentId, studentId) {
    const aid = Number(assignmentId);
    const sid = Number(studentId);
    serviceCache.invalidate(`assignments:student:${sid}:list`);
    serviceCache.invalidate(`assignment:student:${sid}:${aid}`);
    serviceCache.invalidate(`submission:status:${aid}:${sid}`);
    serviceCache.invalidate(`submission:status:${aid}:${sid}:report`);
    serviceCache.invalidate(`submissions:student:${sid}`);
  }

  /**
   * Helper to calculate completion flags based on provided data
   */
  _calculateCompletion(data) {
    const isUseCaseDiagramComplete = !!(data.useCaseDiagram &&
      data.useCaseDiagram.trim() !== '' &&
      data.useCaseDiagram !== '{}' &&
      data.useCaseDiagram !== 'null');

    const isUseCaseDescriptionComplete = !!(data.useCaseDescription &&
      data.useCaseDescription.trim() !== '' &&
      data.useCaseDescription !== '{}' &&
      data.useCaseDescription !== 'null');

    const isSSDComplete = !!(data.systemSequenceDiagram &&
      data.systemSequenceDiagram.trim() !== '' &&
      data.systemSequenceDiagram !== '{}' &&
      data.systemSequenceDiagram !== 'null');

    const isClassDiagramComplete = !!(data.classDiagram &&
      data.classDiagram.trim() !== '' &&
      data.classDiagram !== '{}' &&
      data.classDiagram !== 'null');

    const isSequenceDiagramComplete = !!(data.sequenceDiagram &&
      data.sequenceDiagram.trim() !== '' &&
      data.sequenceDiagram !== '{}' &&
      data.sequenceDiagram !== 'null');

    const overallCompleted = isUseCaseDiagramComplete && isUseCaseDescriptionComplete && isSSDComplete && isClassDiagramComplete;

    return {
      isUseCaseDiagramComplete,
      isUseCaseDescriptionComplete,
      isSSDComplete,
      isClassDiagramComplete,
      isSequenceDiagramComplete,
      overallCompleted,
    };
  }

  _extractArtifacts(submission) {
    const descriptions = {};
    (submission?.useCaseDescriptions || []).forEach(d => {
      descriptions[d.relatedId] = d.data;
    });

    const ssds = {};
    (submission?.ssdDiagrams || []).forEach(s => {
      ssds[s.relatedId] = s.data;
    });

    const sequenceDiagrams = {};
    (submission?.sequenceDiagrams || []).forEach(s => {
      sequenceDiagrams[s.relatedId] = s.data;
    });

    return {
      useCaseDiagram: submission?.useCaseDiagram?.data || '',
      useCaseDescriptions: descriptions,
      ssdDiagrams: ssds,
      classDiagram: submission?.classDiagram?.data || '',
      sequenceDiagrams: sequenceDiagrams,
    };
  }

  _toStoredString(value) {
    if (value == null) return null;
    return typeof value === 'object' ? JSON.stringify(value) : value;
  }

  async _upsertArtifactsParallel(tx, submissionId, data) {
    const sid = Number(submissionId);
    const ops = [];

    if (data.useCaseDiagram) {
      const diagramData = this._toStoredString(data.useCaseDiagram);
      ops.push(tx.useCaseDiagram.upsert({
        where: { submissionId: sid },
        update: { data: diagramData },
        create: { submissionId: sid, data: diagramData },
      }));
    }

    if (data.useCaseDescription && typeof data.useCaseDescription === 'object') {
      const descOps = Object.entries(data.useCaseDescription).map(([relatedId, descriptionData]) => {
        const dString = this._toStoredString(descriptionData);
        return tx.UseCaseDescription.upsert({
          where: { submissionId_relatedId: { submissionId: sid, relatedId } },
          update: { data: dString },
          create: { submissionId: sid, relatedId, data: dString },
        });
      });
      ops.push(...descOps);
    }

    if (data.systemSequenceDiagram && typeof data.systemSequenceDiagram === 'object') {
      const ssdOps = Object.entries(data.systemSequenceDiagram).map(([relatedId, ssdData]) => {
        const sString = this._toStoredString(ssdData);
        return tx.SSDDiagram.upsert({
          where: { submissionId_relatedId: { submissionId: sid, relatedId } },
          update: { data: sString },
          create: { submissionId: sid, relatedId, data: sString },
        });
      });
      ops.push(...ssdOps);
    }

    if (data.classDiagram) {
      const diagramData = this._toStoredString(data.classDiagram);
      ops.push(tx.classDiagram.upsert({
        where: { submissionId: sid },
        update: { data: diagramData },
        create: { submissionId: sid, data: diagramData },
      }));
    }

    if (data.sequenceDiagram && typeof data.sequenceDiagram === 'object') {
      const seqOps = Object.entries(data.sequenceDiagram).map(([relatedId, seqData]) => {
        const sString = this._toStoredString(seqData);
        return tx.sequenceDiagram.upsert({
          where: { submissionId_relatedId: { submissionId: sid, relatedId } },
          update: { data: sString },
          create: { submissionId: sid, relatedId, data: sString },
        });
      });
      ops.push(...seqOps);
    }

    // Execute all operations in parallel for better performance
    if (ops.length > 0) await Promise.all(ops);
  }

  _toLeanSubmission(submission) {
    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      status: submission.status,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
    };
  }

  async createSubmission(assignmentId, studentId, data, options = {}) {
    if (!assignmentId || isNaN(assignmentId)) throw new Error('Invalid assignment ID');
    if (!studentId || isNaN(studentId)) throw new Error('Invalid student ID');

    const prisma = require('../config/prisma');
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: Number(assignmentId),
        class: { students: { some: { studentId: Number(studentId) } } },
      },
      select: { id: true, dueDate: true, title: true, createdBy: true },
    });
    if (!assignment) {
      throw new AuthorizationError('Assignment not found or you are not enrolled.');
    }

    if (assignment.dueDate) {
      const now = new Date();
      if (now > new Date(assignment.dueDate)) {
        throw new ValidationError('Submission deadline has passed.');
      }
    }

    const lean = options.lean !== false && (data.status || 'draft') === 'draft';

    const result = await submissionRepository.transaction(async (tx) => {
      // Check existing submission status to prevent multiple submissions
      const existing = await tx.submission.findUnique({
        where: {
          assignmentId_studentId: {
            assignmentId: Number(assignmentId),
            studentId: Number(studentId)
          }
        }
      });

      if (existing && (existing.status === 'submitted' || existing.status === 'graded')) {
        throw new Error('You have already submitted this assignment. It is now locked for further changes.');
      }

      const status = data.status || 'draft';
      const submission = await tx.submission.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId: Number(assignmentId),
            studentId: Number(studentId)
          }
        },
        update: {
          status: status,
          submittedAt: status === 'submitted' ? new Date() : undefined,
          updatedAt: new Date()
        },
        create: {
          assignmentId: Number(assignmentId),
          studentId: Number(studentId),
          status: status,
          submittedAt: status === 'submitted' ? new Date() : null
        }
      });

      // Parallel artifact upsert for better performance
      await this._upsertArtifactsParallel(tx, submission.id, data);

      let notifyPayload = null;
      if (existing && assignment.createdBy) {
        notifyPayload = {
          userId: assignment.createdBy,
          title: 'Submission Updated',
          message: `A student updated "${assignment.title}".`,
          type: 'SUBMISSION_UPDATED',
          relatedId: submission.id.toString(),
        };
      }

      return { submission, notifyPayload, lean };
    }, { timeout: 15000, maxWait: 20000 }); // Increased timeout for large submissions

    if (result.notifyPayload) {
      notificationService.createNotification(result.notifyPayload).catch((err) => {
        console.error('Failed to send submission notification:', err.message);
      });
    }

    this._invalidateSubmissionCaches(assignmentId, studentId);

    return result.lean ? this._toLeanSubmission(result.submission) : result.submission;
  }

  async getSubmissionStatus(assignmentId, studentId, { includeReport = false } = {}) {
    const aid = Number(assignmentId);
    const sid = Number(studentId);
    const cacheKey = includeReport
      ? `submission:status:${aid}:${sid}:report`
      : `submission:status:${aid}:${sid}`;

    return serviceCache.cached(
      cacheKey,
      includeReport ? 60 : 20,
      () => this._loadSubmissionStatus(aid, sid, includeReport),
      includeReport ? 45_000 : 15_000
    );
  }

  async _loadSubmissionStatus(assignmentId, studentId, includeReport = false) {
    let submission;
    try {
      submission = await findSubmissionStatus(
        submissionRepository,
        {
          assignmentId_studentId: {
            assignmentId: Number(assignmentId),
            studentId: Number(studentId),
          },
        },
        { includeReport }
      );
    } catch (err) {
      console.error(
        `[SubmissionService] GET status assignment=${assignmentId} student=${studentId}:`,
        err.message
      );
      return { status: 'pending', assignmentId: Number(assignmentId) };
    }

    if (!submission) return { status: 'pending', assignmentId: Number(assignmentId) };

    const base = {
      id: submission.id,
      assignmentId: Number(assignmentId),
      status: submission.status,
      submittedAt: submission.submittedAt,
      score: submission.evaluation?.totalScore ?? 0,
      remarks: submission.evaluation?.remarks,
      tutorialRequested: submission.tutorialRequested,
      tutorialApproved: submission.tutorialApproved,
      tutorialRejected: submission.tutorialRejected,
      tutorialRequestedAt: submission.tutorialRequestedAt,
      tutorialReviewedAt: submission.tutorialReviewedAt,
      tutorialRejectionReason: submission.tutorialRejectionReason,
      tutorialRequestStatus: resolveTutorialRequestStatus(submission),
    };

    if (!includeReport) return base;

    let report = submission.evaluation?.validationReport;
    if (typeof report === 'string') {
      try { report = JSON.parse(report); } catch { report = null; }
    }

    const allIssues = [];
    if (report && typeof report === 'object') {
      if (Array.isArray(report.issues)) {
        allIssues.push(...report.issues);
      } else {
        Object.values(report).forEach((section) => {
          if (section && Array.isArray(section.issues)) allIssues.push(...section.issues);
        });
      }
    }

    return { ...base, issues: allIssues, fullReport: report };
  }

  async getSubmissionDetailWithRole(submissionId, userId, role) {
    if (!submissionId || isNaN(submissionId)) {
      const error = new Error('Invalid submission ID');
      error.status = 400;
      throw error;
    }

    const submission = await submissionRepository.findUnique({
      where: { id: Number(submissionId) },
      include: {
        student: { select: { id: true, email: true, firstName: true, lastName: true } },
        useCaseDiagram: true,
        useCaseDescriptions: true,
        ssdDiagrams: true,
        classDiagram: true,
        sequenceDiagrams: true,
        evaluation: true,
        assignment: {
          select: {
            id: true,
            title: true,
            maxScore: true,
            classId: true,
            createdBy: true,
            textContent: true,
            class: { select: { teacherId: true, name: true } }
          }
        }
      }
    });

    if (!submission) {
      throw new NotFoundError('Submission');
    }

    const normalizedRole = role.toLowerCase();
    if (normalizedRole === 'teacher') {
      const ownerTeacherId = submission.assignment?.createdBy || submission.assignment?.class?.teacherId;
      if (ownerTeacherId !== Number(userId)) {
        throw new AuthorizationError('Unauthorized access to submission');
      }
    } else if (normalizedRole === 'student') {
      if (submission.studentId !== Number(userId)) {
        throw new AuthorizationError('Unauthorized access to submission');
      }
    }

    const safeParse = (val) => {
      if (!val) return null;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch { return val; }
    };

    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      status: submission.status,
      submittedAt: submission.submittedAt,
      student: submission.student,
      assignment: {
        id: submission.assignment?.id,
        title: submission.assignment?.title,
        maxScore: submission.assignment?.maxScore,
        classId: submission.assignment?.classId,
        className: submission.assignment?.class?.name,
        textContent: submission.assignment?.textContent,
        instructions: submission.assignment?.textContent || submission.assignment?.instructions
      },
      artifacts: {
        useCaseDiagram: safeParse(submission.useCaseDiagram?.data),
        useCaseDescription: (submission.useCaseDescriptions || []).reduce((acc, d) => ({ ...acc, [d.relatedId]: safeParse(d.data) }), {}),
        systemSequenceDiagram: (submission.ssdDiagrams || []).reduce((acc, s) => ({ ...acc, [s.relatedId]: safeParse(s.data) }), {}),
        classDiagram: safeParse(submission.classDiagram?.data),
        sequenceDiagram: (submission.sequenceDiagrams || []).reduce((acc, s) => ({ ...acc, [s.relatedId]: safeParse(s.data) }), {})
      },
      evaluation: submission.evaluation,
      validationReport: safeParse(submission.evaluation?.validationReport)
    };
  }

  async getSubmissionByAssignmentId(assignmentId, studentId) {
    const submission = await submissionRepository.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: Number(assignmentId),
          studentId: Number(studentId)
        }
      }
    });
    
    if (!submission) {
      return null;
    }
    
    return this.getSubmissionDetailWithRole(submission.id, studentId, 'student');
  }

  async runCheckForTeacher(submissionId, teacherId, { section, targetId } = {}) {
    const detail = await this.getSubmissionDetailWithRole(submissionId, teacherId, 'teacher');

    const model = {
      diagram: detail.artifacts?.useCaseDiagram || null,
      descriptions: detail.artifacts?.useCaseDescription || null,
      ssds: detail.artifacts?.systemSequenceDiagram || null,
      classDiagram: detail.artifacts?.classDiagram || null,
      sequenceDiagrams: detail.artifacts?.sequenceDiagram || null
    };

    // Run the check for the requested scope
    const result = CheckingEngine.checkModel(model, section, targetId);

    // MERGE LOGIC: If checking a specific item, merge with existing report to preserve other results
    let finalIssues = result.issues;
    const existingReport = detail.validationReport;

    if ((section || targetId) && existingReport && Array.isArray(existingReport.issues)) {
      const oldIssues = existingReport.issues;
      
      // Filter out existing issues that are "owned" by this specific check scope
      const filteredOldIssues = oldIssues.filter(i => {
        // If we have both section and targetId (e.g. description 2.1)
        if (section && targetId) {
          const isSameSection = (i.type === section || i.location === section || 
            (section === 'ssd' && i.type === 'consistency') ||
            (section === 'usecase' && (i.location === 'diagram' || i.location === 'usecase' || i.type === 'diagram')));
          const isSameTarget = (i.relatedId === targetId || i.context?.useCaseId === targetId);
          return !(isSameSection && isSameTarget);
        }
        // If we only have section (e.g. all SSDs)
        if (section && !targetId) {
          return !(i.type === section || i.location === section || 
                   (section === 'ssd' && i.type === 'consistency') ||
                   (section === 'usecase' && (i.location === 'diagram' || i.location === 'usecase' || i.type === 'diagram')));
        }
        // If we only have targetId (e.g. searching for a specific use case across all models)
        if (!section && targetId) {
          return !(i.relatedId === targetId || i.context?.useCaseId === targetId);
        }
        return false;
      });

      // Combine with new findings
      finalIssues = [...filteredOldIssues, ...result.issues];
    }

    const byType = (issues, type) => (issues || []).filter((i) => 
      i.type === type || 
      i.location === type || 
      (type === 'consistency' && i.type === 'consistency') ||
      (type === 'ssd' && i.location === 'ssd') ||
      (type === 'description' && i.location === 'description')
    );

    // Calculate overall summary stats (without scores)
    const summary = {
      total: finalIssues.length,
      error: finalIssues.filter(i => i.severity === 'error' || i.type === 'error').length,
      warning: finalIssues.filter(i => i.severity === 'warning' || i.type === 'warning').length,
      info: finalIssues.filter(i => i.severity === 'info' || i.severity === 'suggestion').length
    };

    const evaluationData = {
      validationReport: JSON.stringify({
        ...result,
        issues: finalIssues,
        summary
      }),
      evaluatedBy: Number(teacherId),
      evaluatedAt: new Date()
    };

    await submissionRepository.transaction(async (tx) => {
      await tx.evaluation.upsert({
        where: { submissionId: Number(submissionId) },
        update: evaluationData,
        create: {
          submissionId: Number(submissionId),
          ...evaluationData
        }
      });

      await tx.submission.update({
        where: { id: Number(submissionId) },
        data: { status: 'submitted' }
      });
    });

    return {
      ...result,
      issues: finalIssues,
      summary
    };
  }

  async saveTeacherRemarks(submissionId, teacherId, { remarks, score }) {
    if (!submissionId || isNaN(submissionId)) throw new Error('Invalid submission ID');

    await this._assertTeacherOwnsSubmission(submissionId, teacherId);

    return await submissionRepository.transaction(async (tx) => {
      await tx.evaluation.upsert({
        where: { submissionId: Number(submissionId) },
        update: {
          remarks: remarks,
          totalScore: (score !== undefined && score !== null) ? parseInt(score) : undefined,
          evaluatedBy: Number(teacherId),
          evaluatedAt: new Date()
        },
        create: {
          submissionId: Number(submissionId),
          remarks: remarks,
          totalScore: (score !== undefined && score !== null) ? parseInt(score) : undefined,
          evaluatedBy: Number(teacherId)
        }
      });

      return await tx.submission.update({
        where: { id: Number(submissionId) },
        data: { status: 'graded' }
      });
    });
  }

  async saveFeedbackForTeacher(submissionId, teacherId, { report, remarks, score, isDraft = false }) {
    const submission = await this.getSubmissionDetailWithRole(submissionId, teacherId, 'teacher');

    const finalStatus = isDraft ? 'submitted' : 'graded';

    const feedback = await submissionRepository.transaction(async (tx) => {
      const evaluation = await tx.evaluation.upsert({
        where: { submissionId: Number(submissionId) },
        update: {
          remarks: remarks,
          totalScore: (score !== undefined && score !== null) ? parseInt(score) : undefined,
          validationReport: report ? JSON.stringify(report) : undefined,
          evaluatedBy: Number(teacherId),
          evaluatedAt: isDraft ? null : new Date()
        },
        create: {
          submissionId: Number(submissionId),
          remarks: remarks,
          totalScore: (score !== undefined && score !== null) ? parseInt(score) : undefined,
          validationReport: report ? JSON.stringify(report) : undefined,
          evaluatedBy: Number(teacherId)
        }
      });

      const updated = await tx.submission.update({
        where: { id: Number(submissionId) },
        data: {
          status: finalStatus
        },
        include: {
          assignment: true,
          student: true
        }
      });

      return { updated, evaluation };
    }, { timeout: 10000 });

    if (!isDraft) {
      try {
        await notificationService.createNotification({
          userId: submission.studentId,
          title: 'Assignment Graded',
          message: `Your assignment "${submission.assignment?.title}" has been reviewed.`,
          type: 'ASSIGNMENT_GRADED',
          relatedId: submission.assignmentId.toString()
        });
      } catch (err) {
        console.error('Failed to send notification:', err);
      }
    }

    return feedback;
  }

  async getAssignmentSubmissions(assignmentId, teacherId) {
    const aid = Number(assignmentId);
    const tid = Number(teacherId);
    const cacheKey = `submissions:assignment:${aid}:teacher:${tid}`;

    return serviceCache.cached(cacheKey, 90, async () => {
      const prisma = require('../config/prisma');
      const assignment = await prisma.assignment.findUnique({
        where: { id: aid },
        select: {
          id: true,
          createdBy: true,
          class: {
            select: {
              teacherId: true,
              students: {
                select: {
                  student: { select: { id: true, email: true, firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      });

      if (!assignment) throw new Error('Assignment not found');
      if (assignment.createdBy !== tid && assignment.class?.teacherId !== tid) {
        throw new Error('Unauthorized');
      }

      const submissions = await submissionRepository.findMany({
        where: { assignmentId: aid },
        select: {
          id: true,
          studentId: true,
          status: true,
          submittedAt: true,
          tutorialRequested: true,
          tutorialApproved: true,
          evaluation: { select: { totalScore: true, remarks: true } },
        },
      });

      if (!assignment.class) return [];

      return assignment.class.students.map((m) => {
        const student = m.student;
        const s = submissions.find((sub) => sub.studentId === student.id);
        return {
          submissionId: s ? s.id : null,
          studentId: student.id,
          studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email.split('@')[0],
          studentEmail: student.email,
          status: s ? s.status : 'pending',
          submittedAt: s ? s.submittedAt : null,
          score: s?.evaluation?.totalScore ?? null,
          remarks: s?.evaluation?.remarks ?? null,
          tutorialRequested: s ? s.tutorialRequested : false,
          tutorialApproved: s ? s.tutorialApproved : false,
        };
      });
    });
  }

  async updateUMLWorkflow(submissionId, userId, { diagramData, descriptions, ssdData, classDiagramData, sequenceData }) {
    if (!submissionId || isNaN(submissionId)) throw new Error('Invalid submission ID');

    const submission = await submissionRepository.findUnique({
      where: { id: Number(submissionId) },
    });
    if (!submission) throw new Error('Submission not found');
    if (submission.studentId !== userId) throw new Error('Unauthorized');

    // Build artifact map — reuse _upsertArtifactsParallel to run all upserts concurrently
    const incomingArtifacts = {};
    if (diagramData) incomingArtifacts.useCaseDiagram = typeof diagramData === 'object' ? JSON.stringify(diagramData) : diagramData;
    if (descriptions && typeof descriptions === 'object') incomingArtifacts.useCaseDescription = descriptions;
    if (ssdData && typeof ssdData === 'object') incomingArtifacts.systemSequenceDiagram = ssdData;
    if (classDiagramData) incomingArtifacts.classDiagram = typeof classDiagramData === 'object' ? JSON.stringify(classDiagramData) : classDiagramData;
    if (sequenceData && typeof sequenceData === 'object') incomingArtifacts.sequenceDiagram = sequenceData;

    return await submissionRepository.transaction(async (tx) => {
      // All artifact upserts run in parallel via Promise.all instead of sequential loops
      await this._upsertArtifactsParallel(tx, submissionId, incomingArtifacts);

      return await tx.submission.update({
        where: { id: Number(submissionId) },
        data: { updatedAt: new Date() }
      });
    }, { timeout: 10000, maxWait: 15000 });
  }

  async updateSubmission(assignmentId, studentId, data) {
    // Check if submission exists
    const submission = await submissionRepository.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: Number(assignmentId),
          studentId: Number(studentId)
        }
      }
    });

    if (!submission) {
      // If it doesn't exist, we fallback to createSubmission (as a draft)
      return this.createSubmission(assignmentId, studentId, { ...data, status: 'draft' });
    }

    // Prepare update data - excluding fields that might be empty or undefined
    const updateData = {
      updatedAt: new Date()
    };

    if (data.status) updateData.status = data.status;
    if (data.submissionText !== undefined) updateData.submissionText = data.submissionText;
    if (data.submissionFile !== undefined) {
      updateData.submissionFile = data.submissionFile;
      updateData.submissionFileName = data.submissionFileName;
      updateData.submissionFileType = data.submissionFileType;
    }

    return await submissionRepository.update(
      { id: submission.id },
      updateData
    );
  }

  // Teacher: Get all submissions across all assignments
  async getAllSubmissionsForTeacher(teacherId, filters = {}) {
    const tid = Number(teacherId);
    const filterKey = JSON.stringify(filters || {});
    const cacheKey = `submissions:teacher:${tid}:${filterKey}`;

    return serviceCache.cached(cacheKey, 90, async () => {
      const where = { assignment: { createdBy: tid } };
      if (filters.studentId) where.studentId = Number(filters.studentId);
      if (filters.status && filters.status !== 'all' && filters.status.toLowerCase() !== 'draft') {
        where.status = filters.status.toLowerCase();
      }

      const submissions = await submissionRepository.findMany(where, {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignment: { select: { id: true, title: true, dueDate: true } },
        evaluation: { select: { totalScore: true, remarks: true } },
      }, { submittedAt: 'desc' });

      return submissions.map((s) => ({
        ...s,
        studentName: s.student ? `${s.student.firstName || ''} ${s.student.lastName || ''}`.trim() : undefined,
        studentEmail: s.student?.email,
        assignmentTitle: s.assignment?.title,
        assignmentId: s.assignment?.id || s.assignmentId,
      }));
    });
  }

  // Teacher: Get assignment stats — uses DB-side aggregation instead of fetching all rows to JS
  async getAssignmentStatsForTeacher(teacherId) {
    const tid = Number(teacherId);
    const prisma = require('../config/prisma');

    // Parallel: count assignments + aggregate submissions in 2 queries instead of N+1
    const [totalAssignments, submissionStats] = await Promise.all([
      prisma.assignment.count({ where: { createdBy: tid } }),
      prisma.submission.groupBy({
        by: ['status'],
        where: { assignment: { createdBy: tid } },
        _count: { id: true },
      }),
    ]);

    // For average score only fetch evaluated submissions
    const scoreAgg = await prisma.evaluation.aggregate({
      where: { submission: { assignment: { createdBy: tid } }, totalScore: { not: null } },
      _avg: { totalScore: true },
      _count: { totalScore: true },
    });

    let totalSubmissions = 0;
    let pendingReview = 0;
    submissionStats.forEach(row => {
      totalSubmissions += row._count.id;
      if (row.status === 'submitted') pendingReview += row._count.id;
    });

    return {
      totalAssignments,
      totalSubmissions,
      pendingReview,
      averageScore: scoreAgg._avg.totalScore ?? 0,
    };
  }

  // Student: Get submission receipt
  async getSubmissionReceipt(id, userId) {
    // Slimmed select — only the fields needed for the receipt (saves a 3-level deep join)
    const submission = await submissionRepository.findFirst({
        where: { id: Number(id) },
        select: {
            id: true,
            studentId: true,
            status: true,
            submittedAt: true,
            assignment: {
                select: { title: true, createdBy: true }
            },
            student: {
                select: { firstName: true, lastName: true }
            }
        }
    });

    if (!submission) throw new NotFoundError('Submission not found');
    if (submission.studentId !== Number(userId) && submission.assignment.createdBy !== Number(userId)) {
        throw new AuthorizationError('Access denied');
    }

    return {
        receiptId: `REC-${submission.id}-${Date.now().toString().slice(-4)}`,
        submissionId: submission.id,
        assignmentTitle: submission.assignment.title,
        submittedAt: submission.submittedAt,
        status: submission.status,
        studentName: `${submission.student.firstName} ${submission.student.lastName}`
    };
  }

  // Student: Get analytics
  async getStudentAnalytics(studentId) {
    const sid = Number(studentId);
    const cacheKey = `submissions:analytics:${sid}`;

    return serviceCache.cached(cacheKey, 120, async () => {
      const submissions = await submissionRepository.findMany(
        { studentId: sid },
        { evaluation: { select: { totalScore: true } } },
        undefined
      );

      const completed = submissions.filter((s) => s.status === 'graded' || s.status === 'submitted').length;
      let totalScore = 0;
      let gradedCount = 0;

      submissions.forEach((s) => {
        if (s.evaluation?.totalScore != null) {
          totalScore += s.evaluation.totalScore;
          gradedCount++;
        }
      });

      return {
        totalAssignments: submissions.length,
        completedAssignments: completed,
        averageScore: gradedCount > 0 ? totalScore / gradedCount : 0,
        submissions: submissions.map((s) => ({
          id: s.id,
          status: s.status,
          score: s.evaluation?.totalScore ?? null,
        })),
      };
    });
  }

  async getMySubmissions(studentId) {
    const studentIdNum = Number(studentId);
    const cacheKey = `submissions:student:${studentIdNum}`;

    return serviceCache.cached(cacheKey, 120, async () => {
      const submissions = await submissionRepository.findMany({
        where: { studentId: studentIdNum },
        select: {
          id: true,
          assignmentId: true,
          studentId: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          tutorialRequested: true,
          tutorialApproved: true,
          assignment: {
            select: {
              id: true,
              title: true,
              dueDate: true,
              maxScore: true,
              classId: true,
            },
          },
          evaluation: { select: { totalScore: true, remarks: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return submissions.map((s) => ({
        ...s,
        score: s.evaluation?.totalScore ?? null,
        remarks: s.evaluation?.remarks ?? null,
        assignment: s.assignment
          ? {
              ...s.assignment,
              deadline: s.assignment.dueDate ? s.assignment.dueDate.toISOString() : null,
            }
          : null,
      }));
    });
  }

  _formatTutorialRequestRow(submission) {
    const completion = computeSubmissionCompletion(submission);
    const approvalCheck = validateTutorialApproval(submission);
    const student = submission.student;
    const assignment = submission.assignment;

    return {
      submissionId: submission.id,
      studentId: submission.studentId,
      studentName: student
        ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email
        : 'Unknown',
      studentEmail: student?.email,
      assignmentId: submission.assignmentId,
      assignmentTitle: assignment?.title,
      submissionStatus: submission.status,
      submittedAt: submission.submittedAt,
      tutorialRequestStatus: resolveTutorialRequestStatus(submission),
      tutorialRequested: submission.tutorialRequested,
      tutorialApproved: submission.tutorialApproved,
      tutorialRejected: submission.tutorialRejected,
      tutorialRequestedAt: submission.tutorialRequestedAt,
      tutorialReviewedAt: submission.tutorialReviewedAt,
      tutorialRejectionReason: submission.tutorialRejectionReason,
      completionPercent: completion.percent,
      completionSections: completion.sections,
      canApprove: approvalCheck.canApprove,
      approvalBlockReason: approvalCheck.message,
      diagramPreview: submission.useCaseDiagram
        ? { hasDiagram: true, nodeCount: (() => {
            try {
              const d = typeof submission.useCaseDiagram.data === 'string'
                ? JSON.parse(submission.useCaseDiagram.data)
                : submission.useCaseDiagram.data;
              return Array.isArray(d?.nodes) ? d.nodes.length : 0;
            } catch { return 0; }
          })() }
        : { hasDiagram: false, nodeCount: 0 },
    };
  }

  async requestTutorial(submissionId, studentId) {
    const submission = await submissionRepository.findUnique({
      where: { id: Number(submissionId) },
      include: { assignment: { select: { title: true, createdBy: true } } },
    });

    if (!submission) throw new NotFoundError('Submission');
    if (submission.studentId !== Number(studentId)) {
      throw new AuthorizationError('You can only request tutorials for your own submissions.');
    }
    if (!isSubmissionSubmitted(submission)) {
      throw new ValidationError('Submission required before requesting Tutorial Mode.');
    }
    if (submission.tutorialApproved) {
      throw new ValidationError('Tutorial Mode is already approved for this assignment.');
    }
    if (submission.tutorialRequested && !submission.tutorialRejected) {
      throw new ValidationError('A tutorial request is already pending teacher approval.');
    }

    const updated = await submissionRepository.update(
      { id: submission.id },
      {
        tutorialRequested: true,
        tutorialRejected: false,
        tutorialRejectionReason: null,
        tutorialRequestedAt: new Date(),
        tutorialReviewedAt: null,
      }
    );

    serviceCache.invalidatePrefix(`submissions:teacher:`);
    serviceCache.invalidatePrefix(`tutorial:requests:`);

    const teacherIdNotify = submission.assignment?.createdBy;
    if (teacherIdNotify && submission.assignment?.title) {
      notificationService.createNotification({
        userId: teacherIdNotify,
        title: 'Tutorial Mode Requested',
        message: `A student requested Tutorial Mode for "${submission.assignment.title}".`,
        type: 'TUTORIAL_REQUESTED',
        relatedId: String(submission.id),
      }).catch(() => {});
    }

    return {
      ...updated,
      tutorialRequestStatus: resolveTutorialRequestStatus(updated),
    };
  }

  async approveTutorial(submissionId, teacherId) {
    const submission = await submissionRepository.findUnique({
      where: { id: Number(submissionId) },
      include: {
        assignment: true,
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        useCaseDiagram: true,
        useCaseDescriptions: true,
        ssdDiagrams: true,
        classDiagram: true,
        sequenceDiagrams: true,
      },
    });

    if (!submission) throw new NotFoundError('Submission');
    if (submission.assignment.createdBy !== Number(teacherId)) {
      throw new AuthorizationError('You can only approve tutorials for assignments you created.');
    }

    const approvalCheck = validateTutorialApproval(submission);
    if (!approvalCheck.canApprove) {
      throw new ValidationError(approvalCheck.message || 'Cannot approve tutorial for this submission.');
    }

    const updated = await submissionRepository.update(
      { id: submission.id },
      {
        tutorialApproved: true,
        tutorialRejected: false,
        tutorialRejectionReason: null,
        tutorialReviewedAt: new Date(),
      }
    );

    serviceCache.invalidatePrefix(`submissions:teacher:`);
    serviceCache.invalidatePrefix(`tutorial:requests:`);
    serviceCache.invalidate(`submission:status:${submission.assignmentId}:${submission.studentId}`);

    notificationService.createNotification({
      userId: submission.studentId,
      title: 'Tutorial Mode Approved',
      message: `Your Tutorial Mode request for "${submission.assignment.title}" was approved.`,
      type: 'TUTORIAL_APPROVED',
      relatedId: String(submission.id),
    }).catch(() => {});

    return {
      ...updated,
      tutorialRequestStatus: resolveTutorialRequestStatus(updated),
    };
  }

  async rejectTutorial(submissionId, teacherId, reason = '') {
    const submission = await submissionRepository.findUnique({
      where: { id: Number(submissionId) },
      include: {
        assignment: true,
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!submission) throw new NotFoundError('Submission');
    if (submission.assignment.createdBy !== Number(teacherId)) {
      throw new AuthorizationError('You can only reject tutorials for assignments you created.');
    }
    if (!submission.tutorialRequested && !submission.tutorialApproved) {
      throw new ValidationError('No tutorial request exists for this submission.');
    }

    const trimmedReason = String(reason || '').trim();

    const updated = await submissionRepository.update(
      { id: submission.id },
      {
        tutorialApproved: false,
        tutorialRejected: true,
        tutorialRequested: false,
        tutorialRejectionReason: trimmedReason || 'Request declined by teacher.',
        tutorialReviewedAt: new Date(),
      }
    );

    serviceCache.invalidatePrefix(`submissions:teacher:`);
    serviceCache.invalidatePrefix(`tutorial:requests:`);
    serviceCache.invalidate(`submission:status:${submission.assignmentId}:${submission.studentId}`);

    notificationService.createNotification({
      userId: submission.studentId,
      title: 'Tutorial Mode Declined',
      message: trimmedReason
        ? `Your Tutorial Mode request was declined: ${trimmedReason}`
        : `Your Tutorial Mode request for "${submission.assignment.title}" was declined.`,
      type: 'TUTORIAL_REJECTED',
      relatedId: String(submission.id),
    }).catch(() => {});

    return {
      ...updated,
      tutorialRequestStatus: resolveTutorialRequestStatus(updated),
    };
  }

  async getTutorialRequestsForTeacher(teacherId, { status = 'all', page = 1, limit = 20 } = {}) {
    const tid = Number(teacherId);
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
    const cacheKey = `tutorial:requests:${tid}:${status}:${pageNum}:${limitNum}`;

    return serviceCache.cached(cacheKey, 60, async () => {
      const prisma = require('../config/prisma');

      const where = {
        assignment: { createdBy: tid },
        OR: [
          { tutorialRequested: true },
          { tutorialApproved: true },
          { tutorialRejected: true },
        ],
      };

      if (status === 'pending') {
        where.tutorialRequested = true;
        where.tutorialApproved = false;
        where.tutorialRejected = false;
        delete where.OR;
      } else if (status === 'approved') {
        where.tutorialApproved = true;
        delete where.OR;
      } else if (status === 'rejected') {
        where.tutorialRejected = true;
        where.tutorialApproved = false;
        delete where.OR;
      }

      const [total, rows] = await Promise.all([
        prisma.submission.count({ where }),
        prisma.submission.findMany({
          where,
          include: {
            student: { select: { id: true, firstName: true, lastName: true, email: true } },
            assignment: { select: { id: true, title: true, dueDate: true } },
            useCaseDiagram: { select: { data: true } },
            useCaseDescriptions: { select: { id: true } },
            ssdDiagrams: { select: { id: true } },
            classDiagram: { select: { data: true } },
            sequenceDiagrams: { select: { id: true } },
          },
          orderBy: [{ tutorialRequestedAt: 'desc' }, { submittedAt: 'desc' }],
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      return {
        items: rows.map((s) => this._formatTutorialRequestRow(s)),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      };
    }, 30_000);
  }
}

exports.default = new SubmissionService();
