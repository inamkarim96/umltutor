import apiClient from './apiClient';

/**
 * Unified Assignment Service organized by user role and feature
 * Clear separation between Student and Teacher operations
 */
class AssignmentService {
  // === TEACHER OPERATIONS ===
  
  // Assignment Definition Management
  async getAssignmentDefinitions(status) {
    return apiClient.get('/api/assignments/definitions', { params: { status } });
  }

  async createAssignmentDefinition(classId, data) {
    const isFormData = data instanceof FormData;
    return apiClient.post(`/api/classes/${classId}/assignments`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }
    });
  }

  async updateAssignmentDefinition(id, data) {
    const isFormData = data instanceof FormData;
    return apiClient.put(`/api/assignments/${id}`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }
    });
  }

  async deleteAssignmentDefinition(id) {
    return apiClient.delete(`/api/assignments/${id}`);
  }

  async duplicateAssignmentDefinition(id, newData) {
    return apiClient.post(`/api/assignments/${id}/duplicate`, newData);
  }

  async publishAssignment(id) {
    return apiClient.post(`/api/assignments/${id}/publish`);
  }

  async unpublishAssignment(id) {
    return apiClient.post(`/api/assignments/${id}/unpublish`);
  }

  // Assignment Analytics & Management
  async getAssignmentStats() {
    return apiClient.get('/api/assignments/stats');
  }

  async getAssignmentAnalytics(id) {
    return apiClient.get(`/api/assignments/${id}/analytics`);
  }

  async getAssignmentProgress(id) {
    return apiClient.get(`/api/assignments/${id}/progress`);
  }

  async getAssignmentSubmissions(id) {
    return apiClient.get(`/api/assignments/${id}/submissions`);
  }

  // Assignment Content Management
  async uploadAssignmentFile(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/api/assignments/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async getAssignmentFiles(id) {
    return apiClient.get(`/api/assignments/${id}/files`);
  }

  async deleteAssignmentFile(id, fileId) {
    return apiClient.delete(`/api/assignments/${id}/files/${fileId}`);
  }

  // === STUDENT OPERATIONS ===
  
  // Assignment Access & Viewing
  async getStudentAssignments() {
    return apiClient.get('/api/student/assignments');
  }

  async getStudentAssignment(id) {
    return apiClient.get(`/api/student/assignments/${id}`);
  }

  async getAssignment(id) {
    return apiClient.get(`/api/assignments/${id}`);
  }

  // Assignment Interaction
  async startAssignment(id) {
    return apiClient.post(`/api/student/assignments/${id}/start`);
  }

  async completeAssignment(id) {
    return apiClient.post(`/api/student/assignments/${id}/complete`);
  }

  async pauseAssignment(id) {
    return apiClient.post(`/api/student/assignments/${id}/pause`);
  }

  async resumeAssignment(id) {
    return apiClient.post(`/api/student/assignments/${id}/resume`);
  }

  // Assignment Progress & Sections
  async getAssignmentProgress(id) {
    return apiClient.get(`/api/student/assignments/${id}/progress`);
  }

  async saveAssignmentSection(id, sectionType, data) {
    return apiClient.post(`/api/student/assignments/${id}/save-section`, { sectionType, data });
  }

  async updateAssignmentSection(id, sectionType, data) {
    return apiClient.put(`/api/student/assignments/${id}/update-section`, { sectionType, data });
  }

  async getAssignmentSection(id, sectionType) {
    return apiClient.get(`/api/student/assignments/${id}/sections/${sectionType}`);
  }

  async resetAssignmentSection(id, sectionType) {
    return apiClient.post(`/api/student/assignments/${id}/reset-section`, { sectionType });
  }

  // Student Analytics
  async getStudentAssignmentAnalytics(id) {
    return apiClient.get(`/api/student/assignments/${id}/analytics`);
  }

  async getStudentOverallAnalytics() {
    return apiClient.get('/api/student/analytics');
  }

  async getStudentProgress() {
    return apiClient.get('/api/student/progress');
  }

  // === COMMON OPERATIONS ===
  
  // Assignment Templates
  async getAssignmentTemplates() {
    return apiClient.get('/api/assignments/templates');
  }

  async createAssignmentTemplate(templateData) {
    return apiClient.post('/api/assignments/templates', templateData);
  }

  async useAssignmentTemplate(id, templateId, customizations) {
    return apiClient.post(`/api/assignments/${id}/use-template`, { templateId, customizations });
  }

  // Assignment Validation
  async validateAssignmentData(data) {
    return apiClient.post('/api/assignments/validate', data);
  }

  async validateAssignmentSection(id, sectionType, data) {
    return apiClient.post(`/api/assignments/${id}/validate-section`, { sectionType, data });
  }

  // Assignment Search & Filtering
  async searchAssignments(query, filters = {}) {
    return apiClient.get('/api/assignments/search', { params: { query, ...filters } });
  }

  async filterAssignments(filters) {
    return apiClient.get('/api/assignments/filter', { params: filters });
  }

  // === BATCH OPERATIONS (Teacher Only) ===
  async batchCreateAssignments(assignmentsData) {
    return apiClient.post('/api/assignments/batch-create', { assignments: assignmentsData });
  }

  async batchUpdateAssignments(updates) {
    return apiClient.put('/api/assignments/batch-update', { updates });
  }

  async batchDeleteAssignments(ids) {
    return apiClient.delete('/api/assignments/batch-delete', { data: { ids } });
  }

  async batchPublishAssignments(ids) {
    return apiClient.post('/api/assignments/batch-publish', { ids });
  }

  async batchUnpublishAssignments(ids) {
    return apiClient.post('/api/assignments/batch-unpublish', { ids });
  }
}

export const assignmentService = new AssignmentService();
export default assignmentService;
