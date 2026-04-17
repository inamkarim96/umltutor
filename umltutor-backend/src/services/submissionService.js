"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const submissionRepository = _interopRequireDefault(require('../repositories/submissionRepository')).default;
const assignmentRepository = _interopRequireDefault(require('../repositories/assignmentRepository')).default;
const classRepository = _interopRequireDefault(require('../repositories/classRepository')).default;
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const notificationService = _interopRequireDefault(require('./notificationService')).default;
const CheckingEngine = require('./checkingEngine').CheckingEngine;
const { AppError, NotFoundError, AuthorizationError, ValidationError } = require('../utils/errors');

class SubmissionService {
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

    const overallCompleted = isUseCaseDiagramComplete && isUseCaseDescriptionComplete && isSSDComplete;

    return {
      isUseCaseDiagramComplete,
      isUseCaseDescriptionComplete,
      isSSDComplete,
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

    return {
      useCaseDiagram: submission?.useCaseDiagram?.data || '',
      useCaseDescriptions: descriptions,
      ssdDiagrams: ssds,
    };
  }

  async createSubmission(assignmentId, studentId, data) {
    if (!assignmentId || isNaN(assignmentId)) throw new Error('Invalid assignment ID');
    if (!studentId || isNaN(studentId)) throw new Error('Invalid student ID');

    const assignment = await assignmentRepository.findUnique({
      where: { id: Number(assignmentId) },
      include: { class: { include: { students: { where: { studentId: Number(studentId) } } } } }
    });
    if (!assignment) throw new Error('Assignment not found');

    // Check enrollment
    if (!assignment.class.students.length) {
      throw new AuthorizationError('You are not enrolled in the class for this assignment.');
    }

    if (assignment.dueDate) {
      const now = new Date();
      if (now > new Date(assignment.dueDate)) {
        throw new ValidationError('Submission deadline has passed.');
      }
    }

    const existing = await submissionRepository.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: Number(assignmentId),
          studentId: Number(studentId)
        }
      },
      include: {
        useCaseDiagram: true,
        useCaseDescriptions: true,
        ssdDiagrams: true
      }
    });

    const incomingArtifacts = {};
    if (data.useCaseDiagram) incomingArtifacts.useCaseDiagram = typeof data.useCaseDiagram === 'object' ? JSON.stringify(data.useCaseDiagram) : data.useCaseDiagram;
    if (data.useCaseDescription) incomingArtifacts.useCaseDescription = typeof data.useCaseDescription === 'object' ? JSON.stringify(data.useCaseDescription) : data.useCaseDescription;
    if (data.systemSequenceDiagram) incomingArtifacts.sequenceDiagram = typeof data.systemSequenceDiagram === 'object' ? JSON.stringify(data.systemSequenceDiagram) : data.systemSequenceDiagram;

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

      // Upsert artifacts
      if (data.useCaseDiagram) {
        const diagramData = typeof data.useCaseDiagram === 'object' ? JSON.stringify(data.useCaseDiagram) : data.useCaseDiagram;
        await tx.useCaseDiagram.upsert({
          where: { submissionId: submission.id },
          update: { data: diagramData },
          create: { submissionId: submission.id, data: diagramData }
        });
      }

      if (data.useCaseDescription && typeof data.useCaseDescription === 'object') {
        for (const [relatedId, descriptionData] of Object.entries(data.useCaseDescription)) {
          const dString = typeof descriptionData === 'object' ? JSON.stringify(descriptionData) : descriptionData;
          await tx.UseCaseDescription.upsert({
            where: { submissionId_relatedId: { submissionId: submission.id, relatedId } },
            update: { data: dString },
            create: { submissionId: submission.id, relatedId, data: dString }
          });
        }
      }

      if (data.systemSequenceDiagram && typeof data.systemSequenceDiagram === 'object') {
        for (const [relatedId, ssdData] of Object.entries(data.systemSequenceDiagram)) {
          const sString = typeof ssdData === 'object' ? JSON.stringify(ssdData) : ssdData;
          await tx.SSDDiagram.upsert({
            where: { submissionId_relatedId: { submissionId: submission.id, relatedId } },
            update: { data: sString },
            create: { submissionId: submission.id, relatedId, data: sString }
          });
        }
      }

      const hydrated = await tx.submission.findUnique({
        where: { id: submission.id },
        include: { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true }
      });

      let notifyPayload = null;
      if (existing) {
        const teacherTarget = await tx.assignment.findUnique({
          where: { id: Number(assignmentId) },
          select: { title: true, createdBy: true }
        });
        const student = await tx.user.findUnique({
          where: { id: Number(studentId) },
          select: { firstName: true, email: true }
        });
        const studentLabel = student?.firstName || student?.email;

        if (teacherTarget?.createdBy) {
          notifyPayload = {
            userId: teacherTarget.createdBy,
            title: 'Submission Updated',
            message: `${studentLabel} resubmitted "${teacherTarget.title}".`,
            type: 'SUBMISSION_UPDATED',
            relatedId: submission.id.toString()
          };
        }
      }

      return { hydrated, notifyPayload };
    });

    if (result.notifyPayload) {
      await notificationService.createNotification(result.notifyPayload);
    }

    return result.hydrated;
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
        evaluation: true,
        assignment: {
          select: {
            id: true,
            title: true,
            maxScore: true,
            classId: true,
            createdBy: true,
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
        className: submission.assignment?.class?.name
      },
      artifacts: {
        useCaseDiagram: safeParse(submission.useCaseDiagram?.data),
        useCaseDescription: (submission.useCaseDescriptions || []).reduce((acc, d) => ({ ...acc, [d.relatedId]: safeParse(d.data) }), {}),
        systemSequenceDiagram: (submission.ssdDiagrams || []).reduce((acc, s) => ({ ...acc, [s.relatedId]: safeParse(s.data) }), {})
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
      ssds: detail.artifacts?.systemSequenceDiagram || null
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

    await this.getSubmissionDetailWithRole(submissionId, teacherId, 'teacher');

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
    const assignment = await assignmentRepository.findUnique({
      where: { id: Number(assignmentId) },
      include: {
        class: {
          include: {
            students: {
              include: {
                student: { select: { id: true, email: true, firstName: true, lastName: true } }
              }
            }
          }
        }
      }
    });

    if (!assignment) throw new Error('Assignment not found');
    if (assignment.createdBy !== teacherId && assignment.class?.teacherId !== teacherId) {
      throw new Error('Unauthorized');
    }

    const submissions = await submissionRepository.findMany({
      where: { 
        assignmentId: Number(assignmentId)
      },
      include: {
        student: { select: { id: true, email: true, firstName: true, lastName: true } },
        evaluation: true
      }
    });

    if (assignment.class) {
      return assignment.class.students.map(m => {
        const student = m.student;
        const s = submissions.find(sub => sub.studentId === student.id);
        return {
          submissionId: s ? s.id : null,
          studentId: student.id,
          studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email.split('@')[0],
          studentEmail: student.email,
          status: s ? s.status : 'pending',
          submittedAt: s ? s.submittedAt : null,
          score: s?.evaluation ? s.evaluation.totalScore : null,
          remarks: s?.evaluation ? s.evaluation.remarks : null,
          tutorialRequested: s ? s.tutorialRequested : false,
          tutorialApproved: s ? s.tutorialApproved : false
        };
      });
    }
    return [];
  }

  async updateUMLWorkflow(submissionId, userId, { diagramData, descriptions, ssdData }) {
    if (!submissionId || isNaN(submissionId)) throw new Error('Invalid submission ID');

    const submission = await submissionRepository.findUnique({
      where: { id: Number(submissionId) },
    });
    if (!submission) throw new Error('Submission not found');
    if (submission.studentId !== userId) throw new Error('Unauthorized');

    const incomingArtifacts = {};
    if (diagramData) incomingArtifacts.useCaseDiagram = typeof diagramData === 'object' ? JSON.stringify(diagramData) : diagramData;
    if (descriptions) incomingArtifacts.useCaseDescription = typeof descriptions === 'object' ? JSON.stringify(descriptions) : descriptions;
    if (ssdData) incomingArtifacts.sequenceDiagram = typeof ssdData === 'object' ? JSON.stringify(ssdData) : ssdData;

    return await submissionRepository.transaction(async (tx) => {
      if (diagramData) {
        const dString = typeof diagramData === 'object' ? JSON.stringify(diagramData) : diagramData;
        await tx.useCaseDiagram.upsert({
          where: { submissionId: Number(submissionId) },
          update: { data: dString },
          create: { submissionId: Number(submissionId), data: dString }
        });
      }

      if (descriptions && typeof descriptions === 'object') {
        for (const [relatedId, data] of Object.entries(descriptions)) {
          const sData = typeof data === 'object' ? JSON.stringify(data) : data;
          await tx.UseCaseDescription.upsert({
            where: { submissionId_relatedId: { submissionId: Number(submissionId), relatedId } },
            update: { data: sData },
            create: { submissionId: Number(submissionId), relatedId, data: sData }
          });
        }
      }

      if (ssdData && typeof ssdData === 'object') {
        for (const [relatedId, data] of Object.entries(ssdData)) {
          const sData = typeof data === 'object' ? JSON.stringify(data) : data;
          await tx.SSDDiagram.upsert({
            where: { submissionId_relatedId: { submissionId: Number(submissionId), relatedId } },
            update: { data: sData },
            create: { submissionId: Number(submissionId), relatedId, data: sData }
          });
        }
      }

      return await tx.submission.update({
        where: { id: Number(submissionId) },
        data: { updatedAt: new Date() }
      });
    });
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
    const where = {
        assignment: { createdBy: tid }
    };

    if (filters.studentId) where.studentId = Number(filters.studentId);
    if (filters.status && filters.status !== 'all' && filters.status.toLowerCase() !== 'draft') {
        where.status = filters.status.toLowerCase();
    }

    const submissions = await submissionRepository.findMany(
        where,
        {
            student: { select: { id: true, firstName: true, lastName: true, email: true } },
            assignment: { select: { id: true, title: true, dueDate: true } },
            evaluation: true
        },
        { submittedAt: 'desc' }
    );

    return submissions.map(s => ({
        ...s,
        studentName: s.student ? `${s.student.firstName || ''} ${s.student.lastName || ''}`.trim() : undefined,
        studentEmail: s.student?.email,
        assignmentTitle: s.assignment?.title,
        assignmentId: s.assignment?.id || s.assignmentId
    }));
  }

  // Teacher: Get assignment stats
  async getAssignmentStatsForTeacher(teacherId) {
    const tid = Number(teacherId);
    const assignments = await assignmentRepository.findMany({ createdBy: tid }, { submissions: { include: { evaluation: true } } });
    
    let totalSubmissions = 0;
    let pendingReview = 0;
    let totalScore = 0;
    let gradedCount = 0;

    assignments.forEach(a => {
        a.submissions.forEach(s => {
            totalSubmissions++;
            if (s.status === 'submitted') pendingReview++;
            if (s.status === 'graded') {
                totalScore += s.evaluation?.totalScore || 0;
                gradedCount++;
            }
        });
    });

    return {
        totalAssignments: assignments.length,
        totalSubmissions,
        pendingReview,
        averageScore: gradedCount > 0 ? totalScore / gradedCount : 0
    };
  }

  // Student: Get submission receipt
  async getSubmissionReceipt(id, userId) {
    const submission = await submissionRepository.findFirst({
        where: { id: Number(id) },
        include: { 
            assignment: { include: { class: { include: { teacher: true } } } },
            student: true
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
    const submissions = await submissionRepository.findMany({ studentId: sid }, { evaluation: true });
    
    const completed = submissions.filter(s => s.status === 'graded' || s.status === 'submitted').length;
    let totalScore = 0;
    let gradedCount = 0;
    
    submissions.forEach(s => {
      if (s.evaluation?.totalScore !== null && s.evaluation?.totalScore !== undefined) {
        totalScore += s.evaluation.totalScore;
        gradedCount++;
      }
    });

    return {
        totalAssignments: submissions.length,
        completedAssignments: completed,
        averageScore: gradedCount > 0 ? totalScore / gradedCount : 0,
        submissions: submissions.map(s => ({ id: s.id, status: s.status, score: s.evaluation?.totalScore || null }))
    };
  }

  async getMySubmissions(studentId) {
    const studentIdNum = Number(studentId);
    const submissions = await submissionRepository.findMany({
      where: { studentId: studentIdNum },
      include: { 
        useCaseDiagram: true, 
        useCaseDescriptions: true, 
        ssdDiagrams: true, 
        assignment: true, 
        evaluation: true 
      }
    });
    
    return submissions.map(s => ({
      ...s,
      score: s.evaluation?.totalScore || null,
      remarks: s.evaluation?.remarks || null,
      assignment: s.assignment ? {
        ...s.assignment,
        deadline: s.assignment.dueDate ? s.assignment.dueDate.toISOString() : null
      } : null
    }));
  }
}

exports.default = new SubmissionService();
