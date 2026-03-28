import apiClient from './apiClient';

/**
 * Unified Submission Service organized by user role and feature
 * Clear separation between Student and Teacher operations
 */
class SubmissionService {
  // === TEACHER OPERATIONS ===
  
  // Submission Management
  async getAllSubmissions(filters) {
    return apiClient.get('/api/assignments/submissions', { params: filters });
  }

  async getAssignmentSubmissions(assignmentId) {
    return apiClient.get(`/api/submissions/${assignmentId}/all`);
  }

  async getSubmissionDetail(submissionId) {
    return apiClient.get(`/api/submissions/${submissionId}`);
  }

  // Grading & Feedback
  async runSubmissionCheck(submissionId, { section, targetId } = {}) {
    return apiClient.post(`/api/submissions/${submissionId}/run-check`, { section, targetId });
  }

  async saveSubmissionRemarks(submissionId, { remarks, score } = {}) {
    return apiClient.patch(`/api/submissions/${submissionId}/remarks`, { remarks, score });
  }

  async saveSubmissionFeedback(submissionId, { report, remarks, score } = {}) {
    return apiClient.post(`/api/submissions/${submissionId}/save-feedback`, { report, remarks, score });
  }

  async gradeSubmission(submissionId, data) {
    return apiClient.post(`/api/assignments/submissions/${submissionId}/grade`, data);
  }

  async updateSubmissionGrade(submissionId, gradeData) {
    return apiClient.put(`/api/submissions/${submissionId}/grade`, gradeData);
  }

  // Analytics & Reporting
  async getSubmissionAnalytics(assignmentId) {
    return apiClient.get(`/api/assignments/${assignmentId}/analytics`);
  }

  async getClassSubmissionsAnalytics(classId) {
    return apiClient.get(`/api/classes/${classId}/submissions/analytics`);
  }

  async exportSubmissions(assignmentId, format = 'csv') {
    return apiClient.get(`/api/assignments/${assignmentId}/export`, { 
      params: { format },
      responseType: 'blob'
    });
  }

  // === STUDENT OPERATIONS ===
  
  // Submission Lifecycle
  async submitAssignment(assignmentId, data) {
    const isFormData = data instanceof FormData;
    return apiClient.post(`/api/student/assignments/${assignmentId}/submit`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }
    });
  }

  async submitAssignmentData(assignmentId, data) {
    return apiClient.post(`/api/student/assignments/${assignmentId}/submissions`, data);
  }

  async updateSubmission(assignmentId, data) {
    return apiClient.put(`/api/student/assignments/${assignmentId}/submission`, data);
  }

  async deleteSubmission(assignmentId) {
    return apiClient.delete(`/api/student/assignments/${assignmentId}/submission`);
  }

  // Submission Status & Progress
  async getMySubmission(assignmentId) {
    return apiClient.get(`/api/student/assignments/${assignmentId}/submissions`);
  }

  async getMySubmissions() {
    return apiClient.get('/api/student/me/submissions');
  }

  async getSubmissionStatus(assignmentId) {
    return apiClient.get(`/api/student/assignments/${assignmentId}/submissions/status`);
  }

  async getSubmissionReceipt(id) {
    return apiClient.get(`/api/student/assignments/${id}/receipt`);
  }

  // Student Analytics
  async getStudentAnalytics() {
    return apiClient.get('/api/student/analytics');
  }

  async getStudentProgress() {
    return apiClient.get('/api/student/progress');
  }

  async getSubmissionHistory(assignmentId) {
    return apiClient.get(`/api/student/assignments/${assignmentId}/history`);
  }

  // === COMMON OPERATIONS ===
  
  // File Operations
  async uploadSubmissionFile(assignmentId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/api/student/assignments/${assignmentId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async downloadSubmissionFile(submissionId, fileId) {
    return apiClient.get(`/api/submissions/${submissionId}/files/${fileId}`, {
      responseType: 'blob'
    });
  }

  // Validation Operations
  async validateSubmission(submissionId) {
    return apiClient.post(`/api/submissions/${submissionId}/validate`);
  }

  async getSubmissionValidation(submissionId) {
    return apiClient.get(`/api/submissions/${submissionId}/validation`);
  }

  // Comments & Communication
  async addSubmissionComment(submissionId, comment) {
    return apiClient.post(`/api/submissions/${submissionId}/comments`, comment);
  }

  async getSubmissionComments(submissionId) {
    return apiClient.get(`/api/submissions/${submissionId}/comments`);
  }

  // Tutorial Mode
  async requestTutorialMode(submissionId) {
    return apiClient.post(`/api/submissions/${submissionId}/request-tutorial`);
  }

  async approveTutorialMode(submissionId) {
    return apiClient.post(`/api/submissions/${submissionId}/approve-tutorial`);
  }

  // === BATCH OPERATIONS (Teacher Only) ===
  async batchGrade(submissionIds, gradeData) {
    return apiClient.post('/api/submissions/batch-grade', { submissionIds, gradeData });
  }

  async batchValidate(submissionIds) {
    return apiClient.post('/api/submissions/batch-validate', { submissionIds });
  }
}

export const submissionService = new SubmissionService();
export default submissionService;
