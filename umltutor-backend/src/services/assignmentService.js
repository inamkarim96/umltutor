"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const assignmentRepository = _interopRequireDefault(require('../repositories/assignmentRepository')).default;
const { NotFoundError, AuthorizationError, ValidationError, AppError } = require('../utils/errors');
const classRepository = _interopRequireDefault(require('../repositories/classRepository')).default;
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const submissionRepository = _interopRequireDefault(require('../repositories/submissionRepository')).default;
const notificationService = _interopRequireDefault(require('./notificationService')).default;

// Helper function to safely parse JSON diagram data
const safeParseDiagram = (diagramData) => {
  if (!diagramData) return null;
  if (typeof diagramData === 'object') return diagramData;
  try {
    const parsed = JSON.parse(diagramData);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.nodes && Array.isArray(parsed.nodes)) {
      parsed.nodes = parsed.nodes.map((node, index) => {
        if (!node.position) {
          node.position = { x: (index % 3) * 200, y: Math.floor(index / 3) * 150 };
        } else {
          if (typeof node.position.x !== 'number') node.position.x = (index % 3) * 200;
          if (typeof node.position.y !== 'number') node.position.y = Math.floor(index / 3) * 150;
        }
        if (!node.data) {
          node.data = { label: node.label || node.id || `Node ${index + 1}` };
        } else if (!node.data.label) {
          node.data.label = node.label || node.id || `Node ${index + 1}`;
        }
        return node;
      });
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse diagram data:', error);
    return null;
  }
};

class AssignmentService {
  _extractArtifactsFromSubmission(submission) {
    // If artifacts is already a pre-formatted object from a previous call
    if (submission?.artifacts && !Array.isArray(submission.artifacts)) return submission.artifacts;
    
    // Otherwise, extraction from the new DB structure
    return {
      useCaseDiagram: this._safeParseJson(submission?.useCaseDiagram?.data) || { nodes: [], edges: [] },
      useCaseDescription: (submission?.useCaseDescriptions || []).reduce((acc, d) => ({ 
        ...acc, 
        [d.relatedId]: this._safeParseJson(d.data) 
      }), {}),
      systemSequenceDiagram: (submission?.ssdDiagrams || []).reduce((acc, s) => ({ 
        ...acc, 
        [s.relatedId]: this._safeParseJson(s.data) 
      }), {})
    };
  }

  _safeParseJson(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return value; }
  }

  // Teacher: Create new assignment definition
  async createAssignmentDefinition(data) {
    // 1. Validation: Unique title within the same class
    const existing = await assignmentRepository.findFirst({
        where: {
            classId: Number(data.classId),
            title: {
                equals: data.title,
                // Smart case insensitive match if using specific DBs, 
                // but default findFirst in our repo is usually enough.
            }
        }
    });

    if (existing) {
        const error = new Error(`An assignment with the name "${data.title}" already exists in this class.`);
        error.status = 400;
        throw error;
    }

    const assignment = await assignmentRepository.create({
      title: data.title,
      dueDate: data.dueDate,
      releaseDate: data.releaseDate || new Date(),
      textContent: data.textContent,
      instructions: data.instructions,
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
      const memberships = await classRepository.findMemberships({
        where: { classId: Number(data.classId) },
        select: { studentId: true }
      });
      const studentIds = memberships.map(e => e.studentId);
      if (studentIds.length > 0) {
        await notificationService.notifyMultipleUsers(studentIds, {
          title: 'New Assignment',
          message: `A new assignment "${data.title}" has been posted in your class.`,
          type: 'ASSIGNMENT_CREATED',
          relatedId: assignment.id.toString()
        });
      }
    }

    return assignment;
  }

  async getAssignmentDefinitions(teacherId, status) {
    const where = {};
    if (teacherId) where.createdBy = Number(teacherId);
    // Assignment model doesn't have 'status'. If needed, filtering should happen via submissions count or elsewhere.
    // if (status) where.status = status; 

    const assignments = await assignmentRepository.findMany(
      where,
      {
        class: { 
          include: { 
            teacher: { select: { id: true, firstName: true, lastName: true, email: true } } 
          } 
        },
        _count: { select: { submissions: true } }
      },
      { createdAt: 'desc' }
    );

    return assignments.map(a => ({
      ...a,
      deadline: a.dueDate ? a.dueDate.toISOString() : null
    }));
  }

  async getClassAssignments(classId, userId, role) {
    const classIdNum = Number(classId);
    const userIdNum = Number(userId);

    const classItem = await classRepository.findUnique({
      where: { id: classIdNum },
      include: {
        students: {
          where: { studentId: userIdNum },
          select: { id: true }
        }
      }
    });

    if (!classItem) {
      const error = new Error('Class not found');
      error.status = 404;
      throw error;
    }

    const normalizedRole = role.toLowerCase();
    const isTeacherOwner = normalizedRole === 'teacher' && classItem.teacherId === userIdNum;
    const isEnrolledStudent = normalizedRole === 'student' && classItem.students.length > 0;

    if (!isTeacherOwner && !isEnrolledStudent) {
      const error = new Error('Access denied');
      error.status = 403;
      throw error;
    }

    const where = { classId: classIdNum };

    const assignments = await assignmentRepository.findMany(
      where,
      {
        class: { select: { teacher: true } },
        _count: normalizedRole === 'teacher' ? { select: { submissions: true } } : undefined
      },
      { dueDate: 'asc' }
    );

    if (normalizedRole === 'student') {
      const result = [];
      for (const assignment of assignments) {
        let submission = await submissionRepository.findFirst({
          where: { assignmentId: assignment.id, studentId: userIdNum },
          include: { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true, evaluation: true }
        });

        if (!submission) {
          submission = await submissionRepository.create({
            assignmentId: assignment.id,
            studentId: userIdNum,
            status: 'draft'
          });
        }

        result.push({
          ...assignment,
          deadline: assignment.dueDate.toISOString(),
          status: submission.status,
          score: submission.evaluation?.totalScore || null,
          submittedAt: submission.submittedAt?.toISOString(),
          remarks: submission.evaluation?.remarks
        });
      }
      return result;
    }

    if (normalizedRole === 'teacher') {
      return assignments.map(a => ({
        ...a,
        deadline: a.dueDate ? a.dueDate.toISOString() : null
      }));
    }

    return assignments;
  }

  async getAssignmentDefinition(assignmentId, teacherId) {
    const assignment = await assignmentRepository.findFirst(
      { id: Number(assignmentId), ...(teacherId ? { createdBy: Number(teacherId) } : {}) },
      {
        class: { select: { teacher: true } },
        submissions: {
          select: {
            id: true, studentId: true, status: true,
            submittedAt: true,
          },
        },
        _count: { select: { submissions: true } }
      }
    );

    if (assignment) {
      assignment.deadline = assignment.dueDate ? assignment.dueDate.toISOString() : null;
    }

    return assignment;
  }

  async updateAssignmentDefinition(assignmentId, teacherId, data) {
    return await assignmentRepository.update(
      { id: Number(assignmentId), createdBy: Number(teacherId) },
      data,
      { _count: { select: { submissions: true } } }
    );
  }

  async deleteAssignmentDefinition(assignmentId, teacherId) {
    await assignmentRepository.delete({ id: Number(assignmentId), createdBy: Number(teacherId) });
  }

  async getAssignmentSubmissions(assignmentId, teacherId) {
    return await assignmentRepository.findSubmissions(
      { 
        assignmentId: Number(assignmentId),
        ...(teacherId ? { assignment: { createdBy: Number(teacherId) } } : {})
      },
      {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        evaluation: true
      },
      { submittedAt: 'desc' }
    );
  }

  async gradeSubmission(submissionId, teacherId, gradeData) {
    const submission = await submissionRepository.update(
      { id: Number(submissionId), assignment: { createdBy: Number(teacherId) } },
      {
        status: 'graded',
      },
      { assignment: true }
    );

    // Save evaluation separately if needed or handle via submissionService
    // But this method might be legacy. Let's redirect to submissionService?
    // For now, minimal fix.
    
    return submission;
  }

  // Student: Start an assignment (ensure submission exists)
  async startAssignment(assignmentId, studentId) {
    const aid = Number(assignmentId);
    const sid = Number(studentId);

    let submission = await submissionRepository.findFirst({
        where: { assignmentId: aid, studentId: sid }
    });

    if (!submission) {
        submission = await submissionRepository.create({
            assignmentId: aid,
            studentId: sid,
            status: 'draft'
        });
    }
    return submission;
  }

  // Student: Save a specific workflow section
  async saveAssignmentSection(assignmentId, studentId, sectionType, data) {
    const aid = Number(assignmentId);
    const sid = Number(studentId);

    const submission = await submissionRepository.findFirst({
        where: { assignmentId: aid, studentId: sid }
    });

    if (!submission) throw new Error('Submission not started');
    if (submission.status === 'submitted' || submission.status === 'graded') {
        throw new AuthorizationError('Cannot modify a submitted or graded assignment.');
    }

    const fieldMap = {
        'diagram': 'useCaseDiagram',
        'useCaseDiagram': 'useCaseDiagram',
        'description': 'useCaseDescription',
        'useCaseDescription': 'useCaseDescription',
        'ssd': 'sequenceDiagram',
        'systemSequenceDiagram': 'sequenceDiagram'
    };

    const field = fieldMap[sectionType];
    if (!field) throw new ValidationError(`Invalid section type: ${sectionType}`);
    const stringData = typeof data === 'object' ? JSON.stringify(data) : data;

    await submissionRepository.transaction(async (tx) => {
        await tx.uMLData.upsert({
            where: { submissionId: submission.id },
            update: { [field]: stringData },
            create: {
                submissionId: submission.id,
                [field]: stringData
            }
        });
    });

    return submission;
  }

  // Student: Get assignment progress
  async getAssignmentProgress(assignmentId, studentId) {
    const submission = await submissionRepository.findFirst({
        where: { assignmentId: Number(assignmentId), studentId: Number(studentId) },
        include: { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true }
    });

    if (!submission) return { status: 'not_started', progress: 0 };

    const progress = ((submission.useCaseDiagram ? 1 : 0) + (submission.useCaseDescriptions?.length > 0 ? 1 : 0) + (submission.ssdDiagrams?.length > 0 ? 1 : 0)) / 3 * 100;

    return {
        status: submission.status,
        progress,
        lastActivity: submission.updatedAt,
        isUseCaseDiagramComplete: !!submission.useCaseDiagram,
        isUseCaseDescriptionComplete: submission.useCaseDescriptions?.length > 0,
        isSSDComplete: submission.ssdDiagrams?.length > 0
    };
  }

  // Student: Get all my submissions
  async getMySubmissions(studentId) {
    const submissions = await submissionRepository.findMany(
      { studentId: Number(studentId) },
      { assignment: true },
      { submittedAt: 'desc' }
    );
    return submissions;
  }

  // Student: Get submission receipt
  async getSubmissionReceipt(submissionId, studentId) {
    const submission = await submissionRepository.findFirst({
        where: { id: Number(submissionId), studentId: Number(studentId) },
        include: { assignment: { include: { class: { include: { teacher: true } } } } }
    });

    if (!submission) {
        const error = new Error('Submission not found');
        error.status = 404;
        throw error;
    }

    return {
        receiptId: `REC-${submission.id}-${Date.now().toString().slice(-4)}`,
        submissionId: submission.id,
        assignmentTitle: submission.assignment.title,
        submittedAt: submission.submittedAt,
        status: submission.status
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

  // Teacher: Get all students ever seen by teacher
  async getTeacherStudents(teacherId) {
    // This is a bit complex, usually means students in any class of this teacher
    const classes = await classRepository.findMany({ teacherId: Number(teacherId) }, { students: true });
    const students = new Map();
    classes.forEach(c => {
        c.students.forEach(s => {
            students.set(s.id, s);
        });
    });
    return Array.from(students.values());
  }

  // Teacher: Get specific student submission for an assignment
  async getTeacherSubmission(assignmentId, studentId, teacherId) {
    return await submissionRepository.findFirst({
        assignmentId: Number(assignmentId),
        studentId: Number(studentId),
        assignment: { createdBy: Number(teacherId) }
    }, { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true, student: true, assignment: true, evaluation: true });
  }

  // Teacher: Get review data
  async getAssignmentReviewData(submissionId, teacherId) {
    const submission = await submissionRepository.findFirst({
        id: Number(submissionId),
        assignment: { createdBy: Number(teacherId) }
    }, { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true, student: true, assignment: true, evaluation: true });

    if (!submission) {
        const error = new Error('Submission not found');
        error.status = 404;
        throw error;
    }

    return {
        submission,
        artifacts: this._extractArtifactsFromSubmission(submission)
    };
  }

  // Teacher: Submit review
  async submitReview(submissionId, teacherId, reviewData) {
    return await this.gradeSubmission(submissionId, teacherId, reviewData);
  }

  async getAvailableAssignmentsForStudent(studentId) {
    const studentIdNum = Number(studentId);
    const assignments = await assignmentRepository.findMany(
      {
        class: { students: { some: { studentId: studentIdNum } } }
      },
      { class: { select: { id: true, name: true, code: true, teacher: true } } },
      { createdAt: 'desc' }
    );

    const result = [];
    for (const assignment of assignments) {
      const submission = await submissionRepository.findFirst({
        where: { assignmentId: assignment.id, studentId: studentIdNum },
        include: { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true, evaluation: true }
      });

      result.push({
        ...assignment,
        deadline: assignment.dueDate ? assignment.dueDate.toISOString() : null,
        status: submission?.status || 'pending',
        score: submission?.evaluation?.totalScore || null,
        submittedAt: submission?.submittedAt?.toISOString(),
        feedback: submission?.evaluation?.remarks,
        artifacts: this._extractArtifactsFromSubmission(submission)
      });
    }
    return result;
  }

  async getAssignmentForStudent(assignmentId, studentId) {
    const assignmentIdNum = Number(assignmentId);
    const studentIdNum = Number(studentId);

    const assignment = await assignmentRepository.findFirst({
      id: assignmentIdNum,
      class: { students: { some: { studentId: studentIdNum } } }
    }, { class: { select: { id: true, name: true, code: true, teacher: true } } });

    if (!assignment) throw new Error('Assignment not found or access denied');

    const submission = await submissionRepository.findFirst({
      where: { assignmentId: assignmentIdNum, studentId: studentIdNum },
      include: { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true, evaluation: true }
    });

    return {
      ...assignment,
      deadline: assignment.dueDate ? assignment.dueDate.toISOString() : null,
      submission,
      artifacts: this._extractArtifactsFromSubmission(submission)
    };
  }

  async getMySubmissions(studentId) {
    const studentIdNum = Number(studentId);
    const submissions = await submissionRepository.findMany({
      where: { studentId: studentIdNum },
      include: { useCaseDiagram: true, useCaseDescriptions: true, ssdDiagrams: true, assignment: true, evaluation: true }
    });
    return submissions.map(s => ({
      ...s,
      score: s.evaluation?.totalScore || null,
      remarks: s.evaluation?.remarks || null,
      artifacts: this._extractArtifactsFromSubmission(s),
      assignment: s.assignment ? {
        ...s.assignment,
        deadline: s.assignment.dueDate ? s.assignment.dueDate.toISOString() : null
      } : null
    }));
  }
}

exports.default = new AssignmentService();
