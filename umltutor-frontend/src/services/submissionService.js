import apiClient from './apiClient';

/**
 * Unified Submission Service organized by user role and feature
 * Clear separation between Student and Teacher operations
 */
class SubmissionService {
  // === TEACHER OPERATIONS ===
  
  // Submission Management
  async getAllSubmissions(filters) {
    return apiClient.get('/api/submissions/teacher/all', { params: filters });
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

  async saveSubmissionFeedback(submissionId, { report, remarks, score, isDraft } = {}) {
    return apiClient.post(`/api/submissions/${submissionId}/save-feedback`, { report, remarks, score, isDraft });
  }

  async gradeSubmission(submissionId, data) {
    const score = data.score || data.grade;
    const remarks = data.remarks || data.feedback;
    return apiClient.post(`/api/submissions/${submissionId}/grade`, { score, remarks });
  }

  // Analytics & Reporting
  async getSubmissionAnalytics(assignmentId) {
    return apiClient.get(`/api/submissions/${assignmentId}/analytics`);
  }

  // === STUDENT OPERATIONS ===
  
  // Submission Lifecycle
  async submitAssignmentData(assignmentId, data) {
    // Standard UML workflow save
    return apiClient.post(`/api/submissions/${assignmentId}`, data);
  }

  async updateSubmission(assignmentId, data) {
    // Legacy support or specific update if needed
    return apiClient.post(`/api/submissions/${assignmentId}`, { ...data, status: 'draft' });
  }

  // Submission Status & Progress
  async getMySubmission(assignmentId) {
    return apiClient.get(`/api/submissions/${assignmentId}/me`);
  }

  async getMySubmissions() {
    return apiClient.get('/api/submissions/student/me');
  }

  async getSubmissionStatus(assignmentId) {
    return apiClient.get(`/api/submissions/${assignmentId}/status`);
  }

  async getSubmissionReceipt(id) {
    return apiClient.get(`/api/submissions/${id}/receipt`);
  }

  // Student Analytics
  async getStudentAnalytics() {
    return apiClient.get('/api/submissions/student/analytics');
  }

  // Tutorial Mode
  async requestTutorialMode(submissionId) {
    return apiClient.post(`/api/submissions/${submissionId}/request-tutorial`);
  }

  async approveTutorialMode(submissionId) {
    return apiClient.post(`/api/submissions/${submissionId}/approve-tutorial`);
  }
}

export const submissionService = new SubmissionService();
export default submissionService;
