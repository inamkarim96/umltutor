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


  // Assignment Analytics & Management
  async getAssignmentStats() {
    return apiClient.get('/api/assignments/stats');
  }



  // Assignment Content Management
  async uploadAssignmentFile(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/api/assignments/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
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


}

export const assignmentService = new AssignmentService();
export default assignmentService;
