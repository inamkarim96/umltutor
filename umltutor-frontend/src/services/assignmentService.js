import apiClient from './apiClient';
import { inflightGet } from '../utils/inflightRequest';

/**
 * Unified Assignment Service — GETs deduplicated for fast dashboard loads.
 */
class AssignmentService {
  // === TEACHER OPERATIONS ===

  async getAssignmentDefinitions(status) {
    const key = `assignments:defs:${status || 'all'}`;
    return inflightGet(key, () => apiClient.get('/api/assignments/definitions', { params: { status } }));
  }

  async createAssignmentDefinition(classId, data) {
    const isFormData = data instanceof FormData;
    return apiClient.post(`/api/classes/${classId}/assignments`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
    });
  }

  async updateAssignmentDefinition(id, data) {
    const isFormData = data instanceof FormData;
    return apiClient.put(`/api/assignments/${id}`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
    });
  }

  async deleteAssignmentDefinition(id) {
    return apiClient.delete(`/api/assignments/${id}`);
  }

  async getAssignmentStats() {
    return inflightGet('assignments:stats', () => apiClient.get('/api/assignments/stats'));
  }

  async uploadAssignmentFile(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/api/assignments/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  // === STUDENT OPERATIONS ===

  async getStudentAssignments() {
    return inflightGet('assignments:student:list', () => apiClient.get('/api/student/assignments'));
  }

  async getStudentAssignment(id) {
    return inflightGet(`assignments:student:${id}`, () => apiClient.get(`/api/student/assignments/${id}`));
  }

  async getAssignment(id) {
    return inflightGet(`assignments:detail:${id}`, () => apiClient.get(`/api/assignments/${id}`));
  }
}

export const assignmentService = new AssignmentService();
export default assignmentService;
