import apiClient from './apiClient';
import { inflightGet, clearInflight } from '../utils/inflightRequest';

/**
 * Unified Classroom Service — GETs deduplicated for fast dashboard loads.
 * Optimized with pagination support and cache invalidation.
 */
class ClassroomService {
  // === TEACHER OPERATIONS ===

  async getClasses() {
    return inflightGet('classes:teacher', () => apiClient.get('/api/classes'));
  }

  async getClassesPaginated(page = 1, limit = 20) {
    const key = `classes:teacher:page:${page}:limit:${limit}`;
    return inflightGet(key, () => apiClient.get('/api/classes', { params: { page, limit } }));
  }

  async getClass(id) {
    return inflightGet(`classes:detail:${id}`, () => apiClient.get(`/api/classes/${id}`));
  }

  async getClassesBatch(ids) {
    if (!ids || ids.length === 0) return [];
    const keys = ids.map(id => `classes:detail:${id}`);
    const results = await Promise.all(
      ids.map(id => inflightGet(`classes:detail:${id}`, () => apiClient.get(`/api/classes/${id}`)))
    );
    return results;
  }

  async createClass(data) {
    const result = await apiClient.post('/api/classes', data);
    // Invalidate relevant caches
    clearInflight('classes:teacher');
    clearInflight('classes:teacher:page:*');
    return result;
  }

  async updateClass(id, data) {
    const result = await apiClient.put(`/api/classes/${id}`, data);
    // Invalidate relevant caches
    clearInflight(`classes:detail:${id}`);
    clearInflight('classes:teacher');
    clearInflight('classes:teacher:page:*');
    return result;
  }

  async deleteClass(id) {
    const result = await apiClient.delete(`/api/classes/${id}`);
    // Invalidate relevant caches
    clearInflight(`classes:detail:${id}`);
    clearInflight('classes:teacher');
    clearInflight('classes:teacher:page:*');
    return result;
  }

  async duplicateClass(id, newData) {
    const result = await apiClient.post(`/api/classes/${id}/duplicate`, newData);
    // Invalidate relevant caches
    clearInflight('classes:teacher');
    clearInflight('classes:teacher:page:*');
    return result;
  }

  async archiveClass(id) {
    const result = await apiClient.post(`/api/classes/${id}/archive`);
    // Invalidate relevant caches
    clearInflight(`classes:detail:${id}`);
    clearInflight('classes:teacher');
    clearInflight('classes:teacher:page:*');
    return result;
  }

  async unarchiveClass(id) {
    const result = await apiClient.post(`/api/classes/${id}/unarchive`);
    // Invalidate relevant caches
    clearInflight(`classes:detail:${id}`);
    clearInflight('classes:teacher');
    clearInflight('classes:teacher:page:*');
    return result;
  }

  async getClassStudents(classId, page = 1, limit = 50) {
    const key = `classes:${classId}:students:page:${page}:limit:${limit}`;
    return inflightGet(key, () => apiClient.get(`/api/classes/${classId}/students`, { params: { page, limit } }));
  }

  async addStudentToClass(classId, studentId) {
    const result = await apiClient.post(`/api/classes/${classId}/students`, { studentIds: [studentId] });
    // Invalidate relevant caches
    clearInflight(`classes:${classId}:students*`);
    clearInflight(`classes:detail:${classId}`);
    return result;
  }

  async addMultipleStudentsToClass(classId, studentIds) {
    const result = await apiClient.post(`/api/classes/${classId}/students`, { studentIds });
    // Invalidate relevant caches
    clearInflight(`classes:${classId}:students*`);
    clearInflight(`classes:detail:${classId}`);
    return result;
  }

  async removeStudentFromClass(classId, studentId) {
    const result = await apiClient.delete(`/api/classes/${classId}/students/${studentId}`);
    // Invalidate relevant caches
    clearInflight(`classes:${classId}:students*`);
    clearInflight(`classes:detail:${classId}`);
    return result;
  }

  async bulkRemoveStudents(classId, studentIds) {
    const result = await apiClient.delete(`/api/classes/${classId}/students`, { data: { studentIds } });
    // Invalidate relevant caches
    clearInflight(`classes:${classId}:students*`);
    clearInflight(`classes:detail:${classId}`);
    return result;
  }

  async updateStudentRole(classId, studentId, role) {
    const result = await apiClient.patch(`/api/classes/${classId}/students/${studentId}`, { role });
    // Invalidate relevant caches
    clearInflight(`classes:${classId}:students*`);
    return result;
  }

  async getAnalytics(classId) {
    return inflightGet(`classes:${classId}:analytics`, () => apiClient.get(`/api/classes/${classId}/analytics`));
  }

  async getClassPerformance(classId) {
    return inflightGet(`classes:${classId}:performance`, () => apiClient.get(`/api/classes/${classId}/performance`));
  }

  async getClassProgress(classId) {
    return inflightGet(`classes:${classId}:progress`, () => apiClient.get(`/api/classes/${classId}/progress`));
  }

  async getClassActivity(classId, filters = {}) {
    return apiClient.get(`/api/classes/${classId}/activity`, { params: filters });
  }

  async exportClassData(classId, format = 'csv') {
    return apiClient.get(`/api/classes/${classId}/export`, {
      params: { format },
      responseType: 'blob',
    });
  }

  async getClassSettings(classId) {
    return apiClient.get(`/api/classes/${classId}/settings`);
  }

  async updateClassSettings(classId, settings) {
    return apiClient.put(`/api/classes/${classId}/settings`, settings);
  }

  async getClassSchedule(classId) {
    return apiClient.get(`/api/classes/${classId}/schedule`);
  }

  async updateClassSchedule(classId, schedule) {
    return apiClient.put(`/api/classes/${classId}/schedule`, schedule);
  }

  // === STUDENT OPERATIONS ===

  async getJoinedClasses() {
    return inflightGet('classes:student:joined', () => apiClient.get('/api/student/classes'));
  }

  async joinClass(classCode) {
    const result = await apiClient.post('/api/student/classes/join', { classCode });
    // Invalidate relevant caches
    clearInflight('classes:student:joined');
    return result;
  }

  async regenerateCode(classId) {
    return apiClient.post(`/api/classes/${classId}/regenerate-code`);
  }

  async leaveClass(classId) {
    const result = await apiClient.post(`/api/student/classes/${classId}/leave`);
    // Invalidate relevant caches
    clearInflight('classes:student:joined');
    clearInflight(`classes:student:${classId}`);
    return result;
  }

  async searchClasses(query) {
    return apiClient.get('/api/student/classes/search', { params: { query } });
  }

  async getClassInvites() {
    return inflightGet('classes:student:invites', () => apiClient.get('/api/student/classes/invites'));
  }

  async acceptClassInvite(inviteId) {
    const result = await apiClient.post(`/api/student/classes/invites/${inviteId}/accept`);
    // Invalidate relevant caches
    clearInflight('classes:student:joined');
    clearInflight('classes:student:invites');
    return result;
  }

  async rejectClassInvite(inviteId) {
    const result = await apiClient.post(`/api/student/classes/invites/${inviteId}/reject`);
    // Invalidate relevant caches
    clearInflight('classes:student:invites');
    return result;
  }

  async getStudentClassDetail(classId) {
    return inflightGet(`classes:student:${classId}`, () => apiClient.get(`/api/student/classes/${classId}`));
  }

  async getStudentClassProgress(classId) {
    return inflightGet(`classes:student:${classId}:progress`, () => apiClient.get(`/api/student/classes/${classId}/progress`));
  }

  async getStudentClassAssignments(classId) {
    return inflightGet(`classes:student:${classId}:assignments`, () => apiClient.get(`/api/student/classes/${classId}/assignments`));
  }

  async getStudentClassGrades(classId) {
    return inflightGet(`classes:student:${classId}:grades`, () => apiClient.get(`/api/student/classes/${classId}/grades`));
  }

  async searchStudents(query) {
    return apiClient.get(`/api/student/search?query=${encodeURIComponent(query)}`);
  }

  async getStudentProfile(studentId) {
    return apiClient.get(`/api/students/${studentId}/profile`);
  }

  async getClassAnnouncements(classId) {
    return inflightGet(`classes:${classId}:announcements`, () => apiClient.get(`/api/classes/${classId}/announcements`));
  }

  async getAnnouncements(classId) {
    return this.getClassAnnouncements(classId);
  }

  async createAnnouncement(classId, data) {
    return apiClient.post(`/api/classes/${classId}/announcements`, data);
  }

  async deleteAnnouncement(id) {
    return apiClient.delete(`/api/classes/announcements/${id}`);
  }

  async updateAnnouncement(id, data) {
    return apiClient.patch(`/api/classes/announcements/${id}`, data);
  }

  async sendClassMessage(classId, message) {
    return apiClient.post(`/api/classes/${classId}/messages`, message);
  }

  async getClassMessages(classId) {
    return apiClient.get(`/api/classes/${classId}/messages`);
  }

  async getClassResources(classId) {
    return inflightGet(`classes:${classId}:resources`, () => apiClient.get(`/api/classes/${classId}/resources`));
  }

  async getResources(classId) {
    return this.getClassResources(classId);
  }

  async uploadResource(classId, data) {
    return apiClient.post(`/api/classes/${classId}/resources`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async deleteClassResource(classId, resourceId) {
    return apiClient.delete(`/api/classes/${classId}/resources/${resourceId}`);
  }

  async deleteResource(id) {
    return apiClient.delete(`/api/classes/resources/${id}`);
  }

  async bulkAddStudents(classId, studentData) {
    return apiClient.post(`/api/classes/${classId}/students/bulk`, { students: studentData });
  }

  async bulkMessageStudents(classId, message, studentIds) {
    return apiClient.post(`/api/classes/${classId}/messages/bulk`, { message, studentIds });
  }

  async bulkGradeAssignments(classId, assignmentId, grades) {
    return apiClient.post(`/api/classes/${classId}/assignments/${assignmentId}/bulk-grade`, { grades });
  }
}

export const classroomService = new ClassroomService();
export default classroomService;
