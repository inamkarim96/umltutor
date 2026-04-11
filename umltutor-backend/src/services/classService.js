"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const classRepository = _interopRequireDefault(require('../repositories/classRepository')).default;
const { NotFoundError, AuthorizationError, ValidationError } = require('../utils/errors');
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const assignmentRepository = _interopRequireDefault(require('../repositories/assignmentRepository')).default;
const notificationRepository = _interopRequireDefault(require('../repositories/notificationRepository')).default;
const prisma = require('../utils/prisma').default;

class ClassService {
  /**
   * Generate a unique class code
   */
  _generateClassCode(className) {
    const prefix = className.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
    const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${suffix}`;
  }

  /**
   * Create a new class
   */
  async createClass(teacherId, data) {
    const { name, description, code } = data;
    const classCode = code || this._generateClassCode(name);

    return await classRepository.create({
      name,
      description,
      code: classCode,
      teacherId: Number(teacherId)
    });
  }

  /**
   * Get all classes for a teacher
   */
  async getClasses(teacherId) {
    return await classRepository.findMany({
      where: { teacherId: Number(teacherId) },
      include: {
        _count: { select: { students: true, assignments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get joined classes for a student
   */
  async getJoinedClasses(studentId) {
    const classes = await classRepository.findMany({
      where: {
        students: { some: { studentId: Number(studentId) } }
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { students: true, assignments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return classes.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      description: c.description,
      teacherName: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Unknown Teacher',
      totalStudents: c._count.students,
      totalAssignments: c._count.assignments,
      allowStudentUploads: c.allowStudentUploads,
      createdAt: c.createdAt
    }));
  }

  /**
   * Student joins a class
   */
  async joinClass(studentId, classCode) {
    const classItem = await classRepository.findUnique({
      where: { code: classCode.toUpperCase() },
      include: { teacher: true }
    });

    if (!classItem) {
      throw new NotFoundError('Class');
    }

    const existingMembership = await classRepository.findMembership({
      where: { classId_studentId: { classId: classItem.id, studentId: Number(studentId) } }
    });

    if (existingMembership) {
      throw new ValidationError('You are already enrolled in this class.');
    }

    if (!classItem.isEnrollmentOpen) {
      throw new ValidationError('Enrollment is currently closed for this class.');
    }

    if (classItem.maxStudents && classItem.maxStudents > 0) {
      const currentCount = await prisma.classStudent.count({ where: { classId: classItem.id } });
      if (currentCount >= classItem.maxStudents) {
        throw new ValidationError('This class has reached its maximum student limit.');
      }
    }

    await prisma.$transaction([
      prisma.classStudent.create({
        data: { classId: classItem.id, studentId: Number(studentId) }
      }),
      prisma.notification.create({
        data: {
          userId: classItem.teacherId,
          title: 'New Student Joined',
          message: `A new student has joined your class "${classItem.name}" using the class code.`,
          type: 'CLASS_ENROLLMENT',
          relatedId: classItem.id.toString()
        }
      })
    ]);

    return {
      id: classItem.id,
      name: classItem.name,
      code: classItem.code,
      description: classItem.description,
      teacherName: `${classItem.teacher?.firstName || ''} ${classItem.teacher?.lastName || ''}`.trim()
    };
  }

  /**
   * Get class details with students and assignments
   */
  async getClassDetail(classId, teacherId) {
    const classItem = await classRepository.findFirst({
      where: { id: Number(classId), teacherId: Number(teacherId) },
      include: {
        students: { 
          select: { 
            student: { 
              select: { id: true, firstName: true, lastName: true, email: true } 
            } 
          } 
        },
        assignments: true
      }
    });

    if (!classItem) {
      const error = new Error('Class not found or access denied');
      error.status = 404;
      throw error;
    }

    return {
      ...classItem,
      students: classItem.students.map(s => s.student)
    };
  }
  /**
   * Remove a student from a class
   */
  async removeStudentFromClass(classId, studentId, teacherId) {
    const classItem = await classRepository.findFirst({
      where: { id: Number(classId), teacherId: Number(teacherId) }
    });

    if (!classItem) throw new Error('Class not found');

    await prisma.classStudent.deleteMany({
      where: { classId: Number(classId), studentId: Number(studentId) }
    });

    return { message: 'Student removed successfully' };
  }

  /**
   * Add a student to a class
   */
  async addStudentToClass(classId, studentId, teacherId) {
    const classItem = await classRepository.findFirst({
      where: { id: Number(classId), teacherId: Number(teacherId) }
    });

    if (!classItem || classItem.teacherId !== Number(teacherId)) {
      throw new Error('Class not found or access denied');
    }

    if (classItem.maxStudents && classItem.maxStudents > 0) {
      const currentCount = await prisma.classStudent.count({ where: { classId: Number(classId) } });
      if (currentCount >= classItem.maxStudents) {
        throw new Error('Max student limit reached for this class.');
      }
    }

    await prisma.classStudent.upsert({
      where: { classId_studentId: { classId: Number(classId), studentId: Number(studentId) } },
      update: {},
      create: { classId: Number(classId), studentId: Number(studentId) }
    });

    return { message: 'Student added successfully' };
  }

  /**
   * Get students in a class
   */
  async getClassStudents(classId, userId, role) {
    const classItem = await classRepository.findUnique({
      where: { id: Number(classId) },
      include: {
        students: {
          where: { studentId: role === 'STUDENT' ? Number(userId) : undefined },
          select: { studentId: true }
        }
      }
    });

    if (!classItem) {
      const error = new Error('Class not found');
      error.status = 404;
      throw error;
    }

    const isTeacherOwner = role === 'TEACHER' && classItem.teacherId === Number(userId);
    const isEnrolledStudent = role === 'STUDENT' && classItem.students.length > 0;

    if (!isTeacherOwner && !isEnrolledStudent) {
      const error = new Error('Access denied. You must be the teacher or an enrolled student.');
      error.status = 403;
      throw error;
    }

    const result = await classRepository.findUnique({
      where: { id: Number(classId) },
      select: {
        students: {
          select: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: isTeacherOwner,
                role: isTeacherOwner,
                createdAt: isTeacherOwner
              }
            }
          }
        }
      }
    });

    const students = result.students.map(s => s.student);
    return students.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }

  /**
   * Get analytics for a class
   */
  async getClassAnalytics(classId, teacherId) {
    const classItem = await classRepository.findFirst({
      where: { id: Number(classId), teacherId: Number(teacherId) },
      include: {
        _count: { select: { students: true, assignments: true } }
      }
    });

    if (!classItem) {
      const error = new Error('Class not found or access denied');
      error.status = 404;
      throw error;
    }

    const totalStudents = classItem._count.students;
    const totalAssignments = classItem._count.assignments;

    if (totalAssignments === 0 || totalStudents === 0) {
      return {
        totalStudents,
        totalAssignments,
        submissionRate: 0,
        averageGrade: 0,
        totalSubmissions: 0,
        gradedSubmissions: 0
      };
    }

    const assignmentIds = (await assignmentRepository.findMany({
      where: { classId: Number(classId) },
      select: { id: true }
    })).map(a => a.id);

    // Get all submissions for these assignments that are 'submitted' or 'graded'
    const submissions = await prisma.submission.findMany({
      where: { 
        assignmentId: { in: assignmentIds }, 
        status: { in: ['submitted', 'graded'] } 
      },
      include: { evaluation: true }
    });

    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.status === 'graded');
    const gradedCount = gradedSubmissions.length;
    
    const totalScore = gradedSubmissions.reduce((acc, s) => acc + (s.evaluation?.totalScore || 0), 0);
    const averageGrade = gradedCount > 0 ? totalScore / gradedCount : 0;
    
    const submissionRate = (totalSubmissions / (totalStudents * totalAssignments)) * 100;

    return {
      totalStudents,
      totalAssignments,
      submissionRate: parseFloat(submissionRate.toFixed(2)),
      averageGrade: parseFloat(averageGrade.toFixed(2)),
      totalSubmissions,
      gradedSubmissions: gradedCount
    };
  }

  /**
   * Update classroom settings (Teams-like)
   */
  async updateClassSettings(classId, teacherId, data) {
    const classItem = await classRepository.findFirst({
      where: { id: Number(classId), teacherId: Number(teacherId) }
    });

    if (!classItem) {
      const error = new Error('Class not found or access denied');
      error.status = 404;
      throw error;
    }

    const { name, description, maxStudents, archived, isEnrollmentOpen, allowStudentUploads } = data;

    return await classRepository.update({
      where: { id: Number(classId) },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        maxStudents: maxStudents !== undefined ? (maxStudents === null || maxStudents === '' ? null : Number(maxStudents)) : undefined,
        archived: archived !== undefined ? Boolean(archived) : undefined,
        isEnrollmentOpen: isEnrollmentOpen !== undefined ? Boolean(isEnrollmentOpen) : undefined,
        allowStudentUploads: allowStudentUploads !== undefined ? Boolean(allowStudentUploads) : undefined
      }
    });
  }

  /**
   * Regenerate class join code
   */
  async regenerateClassCode(classId, teacherId) {
    const classItem = await classRepository.findFirst({
      where: { id: Number(classId), teacherId: Number(teacherId) }
    });

    if (!classItem) {
      const error = new Error('Class not found or access denied');
      error.status = 404;
      throw error;
    }

    const newCode = this._generateClassCode(classItem.name);

    return await classRepository.update({
      where: { id: Number(classId) },
      data: { code: newCode }
    });
  }

  /**
   * Update a student's membership (e.g., change role)
   */
  async updateStudentMembership(classId, studentId, teacherId, data) {
    const classItem = await classRepository.findFirst({
      where: { id: Number(classId), teacherId: Number(teacherId) }
    });

    if (!classItem) {
      const error = new Error('Class not found or access denied');
      error.status = 404;
      throw error;
    }

    return await classRepository.updateMembership({
      where: { classId_userId: { classId: Number(classId), userId: Number(studentId) } },
      data: { role: data.role }
    });
  }
}

exports.default = new ClassService();
