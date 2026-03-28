const request = require('supertest');
const app = require('../app').default;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const assertStatus = (res, expectedStatus) => {
  if (res.status !== expectedStatus) {
    console.error(`Status mismatch. Expected ${expectedStatus}, got ${res.status}. Body:`, JSON.stringify(res.body, null, 2));
  }
  expect(res.status).toBe(expectedStatus);
};

describe('End-to-End Flow Verification', () => {
  let teacherToken, studentToken;
  let teacherId, studentId;
  let classId, classCode;
  let assignmentId;
  let submissionId;

  // Cleanup before all tests
  beforeAll(async () => {
    // Environment Setup: Clean DB
    // Clear all existing data to ensure a predictable test state
    await prisma.notification.deleteMany();
    await prisma.uMLData.deleteMany();
    await prisma.evaluation.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.classStudent.deleteMany();
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // Cleanup after all tests to ensure no test data is left behind
    await prisma.notification.deleteMany();
    await prisma.uMLData.deleteMany();
    await prisma.evaluation.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.classStudent.deleteMany();
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();
    
    await prisma.$disconnect();
  });

  describe('1. Authentication Flow', () => {
    test('Positive: Register Teacher', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'teacher@test.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'Teacher',
          role: 'TEACHER'
        });
      
      assertStatus(res, 201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      teacherToken = res.body.data.token;
      teacherId = res.body.data.user.id;
    });

    test('Positive: Register Student', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@test.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'Student',
          role: 'STUDENT'
        });
      
      assertStatus(res, 201);
      studentToken = res.body.data.token;
      studentId = res.body.data.user.id;
    });

    test('Negative: Login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'student@test.com', password: 'wrong' });
      assertStatus(res, 401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Class & Enrollment Flow', () => {
    test('Positive: Teacher creates a class', async () => {
      const res = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ name: 'CS101', description: 'Intro to Computer Science' });
      
      assertStatus(res, 201);
      classId = res.body.data.id;
      classCode = res.body.data.code;
      console.log(`DEBUG: Created Class - ID: ${classId}, Code: ${classCode}`);
      expect(classCode).toBeDefined();
      
      // State Consistency Check
      const dbClass = await prisma.class.findUnique({ where: { id: classId } });
      expect(dbClass.name).toBe('CS101');
    });

    test('Positive: Student joins class', async () => {
      console.log(`DEBUG: Student joining with Code: ${classCode}`);
      const res = await request(app)
        .post('/api/student/classes/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ classCode: classCode });
      
      assertStatus(res, 201);
      expect(res.body.success).toBe(true);
      
      // State Consistency Check
      const joined = await prisma.classStudent.findFirst({
        where: { classId, studentId }
      });
      expect(joined).toBeDefined();
    });

    test('Negative: Join with invalid code', async () => {
      const res = await request(app)
        .post('/api/student/classes/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ classCode: 'INVALID_CODE' });
      assertStatus(res, 404);
    });
  });

  describe('3. Assignment Lifecycle Flow', () => {
    test('Positive: Teacher creates assignment', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'UML Design 1',
          description: 'Design a library system',
          releaseDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          assignmentType: 'DIAGRAM',
          classId: classId
        });
      
      assertStatus(res, 201);
      assignmentId = res.body.data.id;
      console.log(`DEBUG: Created Assignment - ID: ${assignmentId} for Class: ${classId}`);
      expect(assignmentId).toBeDefined();
    });

    test('Positive: Student starts assignment (checks submission setup)', async () => {
      // Starting an assignment should create a draft submission
      const res = await request(app)
        .post(`/api/student/assignments/${assignmentId}/start`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      assertStatus(res, 200);
      submissionId = res.body.data.id;
      
      // State Consistency Check: UMLData record should be created
      const dbUmlData = await prisma.uMLData.findUnique({ where: { submissionId } });
      expect(dbUmlData).toBeDefined();
    });

    test('Positive: Student saves UML work', async () => {
      const res = await request(app)
        .post(`/api/student/assignments/${assignmentId}/save-section`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          sectionType: 'useCaseDiagram',
          data: { nodes: [{ id: '1', label: 'User' }], edges: [] }
        });
      
      assertStatus(res, 200);
      
      // Data Validation: Check DB for saved data
      const dbUmlData = await prisma.uMLData.findUnique({ where: { submissionId } });
      const parsed = JSON.parse(dbUmlData.useCaseDiagram);
      expect(parsed.nodes[0].label).toBe('User');
    });

    test('Positive: Student submits the assignment', async () => {
      const res = await request(app)
        .post(`/api/student/assignments/${assignmentId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          useCaseDiagram: { nodes: [{ id: '1', label: 'User' }], edges: [] }
        });
      
      assertStatus(res, 201);
      expect(res.body.data.status).toBe('submitted');
    });

    test('Negative: Student tries to save to a submitted assignment', async () => {
        const res = await request(app)
            .post(`/api/student/assignments/${assignmentId}/save-section`)
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                sectionType: 'useCaseDiagram',
                data: {}
            });
        assertStatus(res, 403);
    });
  });

  describe('4. Evaluation & Results Flow', () => {
    test('Positive: Teacher runs checker on submission', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submissionId}/run-check`)
        .set('Authorization', `Bearer ${teacherToken}`);
      
      assertStatus(res, 200);
      expect(res.body.success).toBe(true);
      
      // State Consistency Check: Evaluation record should exist
      const evaluation = await prisma.evaluation.findUnique({ where: { submissionId } });
      expect(evaluation).toBeDefined();
    });

    test('Positive: Teacher finalizes evaluation and feedback', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submissionId}/save-feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          report: { diagramScore: 85, descriptionScore: 90, ssdScore: 80 },
          remarks: 'Good progress, but check the consistency between diagram and SSD.',
          score: 85
        });
      
      assertStatus(res, 200);
      
      // Data Validation: Check calculated total score (avg)
      const evaluation = await prisma.evaluation.findUnique({ where: { submissionId } });
      expect(evaluation.totalScore).toBe(Math.round((85+90+80+85)/4));
      expect(evaluation.remarks).toBe('Good progress, but check the consistency between diagram and SSD.');
    });

    test('Positive: Student views finalized results', async () => {
      const res = await request(app)
        .get(`/api/assignments/${assignmentId}/submissions/status`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      assertStatus(res, 200);
      expect(res.body.data.status).toBe('graded');
      expect(res.body.data.score).toBeDefined();
      expect(res.body.data.remarks).toBeDefined();
    });

    test('Negative: Other student tries to view the submission', async () => {
        // Register another student
        const otherRes = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'other@test.com',
                password: 'password123',
                firstName: 'Other',
                lastName: 'Student',
                role: 'STUDENT'
            });
        assertStatus(otherRes, 201);
        const otherToken = otherRes.body.data.token;

        const res = await request(app)
            .get(`/api/submissions/${submissionId}`)
            .set('Authorization', `Bearer ${otherToken}`);
        
        assertStatus(res, 403);
    });
  });
});
