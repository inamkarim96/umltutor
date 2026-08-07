import apiClient from './apiClient';
import { inflightGet, clearInflight } from '../utils/inflightRequest';

/**
 * Unified Submission Service — GETs deduplicated; writes use lean draft saves.
 * Optimized with optimistic updates, artifact compression, and cache invalidation.
 */

// Local cache for optimistic updates
const optimisticCache = new Map();

function setOptimisticCache(key, value) {
  optimisticCache.set(key, { value, timestamp: Date.now() });
}

function getOptimisticCache(key) {
  const cached = optimisticCache.get(key);
  if (cached && Date.now() - cached.timestamp < 5000) { // 5 second TTL
    return cached.value;
  }
  optimisticCache.delete(key);
  return null;
}

function clearOptimisticCache(pattern) {
  for (const key of optimisticCache.keys()) {
    if (key.includes(pattern)) {
      optimisticCache.delete(key);
    }
  }
}
class SubmissionService {
  // === TEACHER OPERATIONS ===

  async getAllSubmissions(filters) {
    const key = `submissions:teacher:all:${JSON.stringify(filters || {})}`;
    return inflightGet(key, () => apiClient.get('/api/submissions/teacher/all', { params: filters }));
  }

  async getAllSubmissionsPaginated(filters, page = 1, limit = 20) {
    const key = `submissions:teacher:all:page:${page}:limit:${limit}:${JSON.stringify(filters || {})}`;
    return inflightGet(key, () => apiClient.get('/api/submissions/teacher/all', { params: { ...filters, page, limit } }));
  }

  async getAssignmentSubmissions(assignmentId) {
    return inflightGet(`submissions:assignment:${assignmentId}`, () =>
      apiClient.get(`/api/submissions/${assignmentId}/all`)
    );
  }

  async getSubmissionDetail(submissionId) {
    return inflightGet(`submissions:detail:${submissionId}`, () =>
      apiClient.get(`/api/submissions/${submissionId}`)
    );
  }

  async runSubmissionCheck(submissionId, { section, targetId } = {}) {
    const result = await apiClient.post(`/api/submissions/${submissionId}/run-check`, { section, targetId });
    // Invalidate relevant caches
    clearInflight(`submissions:detail:${submissionId}`);
    clearInflight(`submissions:status:*`);
    return result;
  }

  async saveSubmissionRemarks(submissionId, { remarks, score } = {}) {
    const result = await apiClient.patch(`/api/submissions/${submissionId}/remarks`, { remarks, score });
    // Invalidate relevant caches
    clearInflight(`submissions:detail:${submissionId}`);
    clearInflight(`submissions:assignment:*`);
    return result;
  }

  async saveSubmissionFeedback(submissionId, { report, remarks, score, isDraft } = {}) {
    const result = await apiClient.post(`/api/submissions/${submissionId}/save-feedback`, {
      report,
      remarks,
      score,
      isDraft,
    });
    // Invalidate relevant caches
    clearInflight(`submissions:detail:${submissionId}`);
    clearInflight(`submissions:assignment:*`);
    clearInflight(`submissions:analytics:*`);
    return result;
  }

  async gradeSubmission(submissionId, data) {
    const score = data.score || data.grade;
    const remarks = data.remarks || data.feedback;
    const result = await apiClient.post(`/api/submissions/${submissionId}/grade`, { score, remarks });
    // Invalidate relevant caches
    clearInflight(`submissions:detail:${submissionId}`);
    clearInflight(`submissions:assignment:*`);
    clearInflight(`submissions:analytics:*`);
    return result;
  }

  async getSubmissionAnalytics(assignmentId) {
    return inflightGet(`submissions:analytics:${assignmentId}`, () =>
      apiClient.get(`/api/submissions/${assignmentId}/analytics`)
    );
  }

  // === STUDENT OPERATIONS ===

  async submitAssignmentData(assignmentId, data, { lean = true, optimistic = false } = {}) {
    const params = lean ? { lean: 'true' } : {};
    
    if (optimistic) {
      const cacheKey = `submissions:me:${assignmentId}`;
      setOptimisticCache(cacheKey, { ...data, status: 'submitting' });
    }
    
    try {
      const result = await apiClient.post(`/api/submissions/${assignmentId}`, data, { params });
      // Invalidate relevant caches
      clearInflight(`submissions:me:${assignmentId}`);
      clearInflight('submissions:student:me');
      clearOptimisticCache(assignmentId);
      return result;
    } catch (error) {
      clearOptimisticCache(assignmentId);
      throw error;
    }
  }

  async updateSubmission(assignmentId, data, { optimistic = false } = {}) {
    if (optimistic) {
      const cacheKey = `submissions:me:${assignmentId}`;
      setOptimisticCache(cacheKey, { ...data, status: 'draft' });
    }
    
    try {
      const result = await apiClient.post(`/api/submissions/${assignmentId}`, { ...data, status: 'draft' }, { params: { lean: 'true' } });
      // Invalidate relevant caches
      clearInflight(`submissions:me:${assignmentId}`);
      clearInflight('submissions:student:me');
      clearOptimisticCache(assignmentId);
      return result;
    } catch (error) {
      clearOptimisticCache(assignmentId);
      throw error;
    }
  }

  async getMySubmission(assignmentId) {
    const key = `submissions:me:${assignmentId}`;
    // Check optimistic cache first
    const optimistic = getOptimisticCache(key);
    if (optimistic) return optimistic;
    
    return inflightGet(key, () => apiClient.get(`/api/submissions/${assignmentId}/me`));
  }

  async getMySubmissions() {
    return inflightGet('submissions:student:me', () => apiClient.get('/api/submissions/student/me'));
  }

  async getSubmissionStatus(assignmentId, { includeReport = false } = {}) {
    const key = `submissions:status:${assignmentId}:${includeReport ? 'full' : 'lite'}`;
    const params = includeReport ? { includeReport: 'true' } : {};
    return inflightGet(key, () =>
      apiClient.get(`/api/submissions/${assignmentId}/status`, {
        params,
        skipErrorToast: true,
      })
    );
  }

  async getSubmissionReceipt(id) {
    return apiClient.get(`/api/submissions/${id}/receipt`);
  }

  async getStudentAnalytics() {
    return inflightGet('submissions:student:analytics', () =>
      apiClient.get('/api/submissions/student/analytics')
    );
  }

  async requestTutorialMode(submissionId) {
    return apiClient.post(`/api/submissions/${submissionId}/request-tutorial`);
  }

  async approveTutorialMode(submissionId) {
    const result = await apiClient.post(`/api/submissions/${submissionId}/approve-tutorial`);
    clearInflight('submissions:teacher:');
    clearInflight('tutorial:requests:');
    return result;
  }

  async rejectTutorialMode(submissionId, reason) {
    const result = await apiClient.post(`/api/submissions/${submissionId}/reject-tutorial`, { reason });
    clearInflight('submissions:teacher:');
    clearInflight('tutorial:requests:');
    return result;
  }

  async getTutorialRequests({ status = 'all', page = 1, limit = 20 } = {}) {
    const key = `tutorial:requests:${status}:${page}:${limit}`;
    return inflightGet(key, () =>
      apiClient.get('/api/submissions/teacher/tutorial-requests', {
        params: { status, page, limit },
      })
    );
  }

  // === EXPORT RECORDING ===

  async recordExport(assignmentId, { format, section, durationMs }, fileBlob = null) {
    const formData = new FormData();
    formData.append('format', format || 'pdf');
    if (section) formData.append('section', section);
    formData.append('durationMs', String(Math.round(durationMs || 0)));
    if (fileBlob) formData.append('file', fileBlob, fileBlob.name || `uml-export.${fileBlob.type.split('/')[1] || 'png'}`);
    const result = await apiClient.post(`/api/submissions/${assignmentId}/exports`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return result;
  }

  async getAssignmentExports(assignmentId, { page = 1, limit = 20 } = {}) {
    const key = `submissions:exports:assignment:${assignmentId}:${page}:${limit}`;
    return inflightGet(key, () =>
      apiClient.get(`/api/submissions/${assignmentId}/exports`, { params: { page, limit } })
    );
  }

  async getMyExports({ page = 1, limit = 20 } = {}) {
    const key = `submissions:exports:student:${page}:${limit}`;
    return inflightGet(key, () =>
      apiClient.get('/api/submissions/student/exports', { params: { page, limit } })
    );
  }
}

export const submissionService = new SubmissionService();
export default submissionService;
