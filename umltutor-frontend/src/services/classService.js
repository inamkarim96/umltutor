import apiClient from './apiClient';

/**
 * Unified Classroom Service organized by user role and feature
 * Clear separation between Student and Teacher operations
 */
class ClassroomService {
  // === TEACHER OPERATIONS ===
  
  // Class Management
  async getClasses() {
    return apiClient.get('/api/classes');
  }

  async getClass(id) {
    return apiClient.get(`/api/classes/${id}`);
  }

  async createClass(data) {
    return apiClient.post('/api/classes', data);
  }

  async updateClass(id, data) {
    return apiClient.put(`/api/classes/${id}`, data);
  }

  async deleteClass(id) {
    return apiClient.delete(`/api/classes/${id}`);
  }

  async duplicateClass(id, newData) {
    return apiClient.post(`/api/classes/${id}/duplicate`, newData);
  }

  async archiveClass(id) {
    return apiClient.post(`/api/classes/${id}/archive`);
  }

  async unarchiveClass(id) {
    return apiClient.post(`/api/classes/${id}/unarchive`);
  }

  // Student Management
  async getClassStudents(classId) {
    return apiClient.get(`/api/classes/${classId}/students`);
  }

  async addStudentToClass(classId, studentId) {
    return apiClient.post(`/api/classes/${classId}/students`, { studentIds: [studentId] });
  }

  async addMultipleStudentsToClass(classId, studentIds) {
    return apiClient.post(`/api/classes/${classId}/students`, { studentIds });
  }

  async removeStudentFromClass(classId, studentId) {
    return apiClient.delete(`/api/classes/${classId}/students/${studentId}`);
  }

  async bulkRemoveStudents(classId, studentIds) {
    return apiClient.delete(`/api/classes/${classId}/students`, { data: { studentIds } });
  }

  async updateStudentRole(classId, studentId, role) {
    return apiClient.patch(`/api/classes/${classId}/students/${studentId}`, { role });
  }

  // Class Analytics & Reporting
  async getAnalytics(classId) {
    return apiClient.get(`/api/classes/${classId}/analytics`);
  }

  async getClassPerformance(classId) {
    return apiClient.get(`/api/classes/${classId}/performance`);
  }

  async getClassProgress(classId) {
    return apiClient.get(`/api/classes/${classId}/progress`);
  }

  async getClassActivity(classId, filters = {}) {
    return apiClient.get(`/api/classes/${classId}/activity`, { params: filters });
  }

  async exportClassData(classId, format = 'csv') {
    return apiClient.get(`/api/classes/${classId}/export`, { 
      params: { format },
      responseType: 'blob'
    });
  }

  // Class Settings & Configuration
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
  
  // Class Discovery & Joining
  async getJoinedClasses() {
    return apiClient.get('/api/student/classes');
  }

  async joinClass(classCode) {
    return apiClient.post('/api/student/classes/join', { classCode });
  }

  async regenerateCode(classId) {
    return apiClient.post(`/api/classes/${classId}/regenerate-code`);
  }

  async leaveClass(classId) {
    return apiClient.post(`/api/student/classes/${classId}/leave`);
  }

  async searchClasses(query) {
    return apiClient.get('/api/student/classes/search', { params: { query } });
  }

  async getClassInvites() {
    return apiClient.get('/api/student/classes/invites');
  }

  async acceptClassInvite(inviteId) {
    return apiClient.post(`/api/student/classes/invites/${inviteId}/accept`);
  }

  async rejectClassInvite(inviteId) {
    return apiClient.post(`/api/student/classes/invites/${inviteId}/reject`);
  }

  // Student Class Information
  async getStudentClassDetail(classId) {
    return apiClient.get(`/api/student/classes/${classId}`);
  }

  async getStudentClassProgress(classId) {
    return apiClient.get(`/api/student/classes/${classId}/progress`);
  }

  async getStudentClassAssignments(classId) {
    return apiClient.get(`/api/student/classes/${classId}/assignments`);
  }

  async getStudentClassGrades(classId) {
    return apiClient.get(`/api/student/classes/${classId}/grades`);
  }

  // === COMMON OPERATIONS ===
  


  async searchStudents(query) {
    return apiClient.get(`/api/student/search?query=${query}`);
  }

  async getStudentProfile(studentId) {
    return apiClient.get(`/api/students/${studentId}/profile`);
  }

  // Class Communication
  async getClassAnnouncements(classId) {
    return apiClient.get(`/api/classes/${classId}/announcements`);
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

  // Class Resources
  async getClassResources(classId) {
    return apiClient.get(`/api/classes/${classId}/resources`);
  }

  async getResources(classId) {
    return this.getClassResources(classId);
  }

  async uploadResource(classId, data) {
    return apiClient.post(`/api/classes/${classId}/resources`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async deleteClassResource(classId, resourceId) {
    return apiClient.delete(`/api/classes/${classId}/resources/${resourceId}`);
  }

  async deleteResource(id) {
    return apiClient.delete(`/api/classes/resources/${id}`);
  }

  // === BATCH OPERATIONS (Teacher Only) ===
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
