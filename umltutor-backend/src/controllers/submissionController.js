"use strict"; Object.defineProperty(exports, "__esModule", { value: true }); var _submissionService = require('../services/submissionService'); var _submissionService2 = _interopRequireDefault(_submissionService); var _fileUpload = require('../utils/fileUpload'); var _fileUpload2 = _interopRequireDefault(_fileUpload); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const submitAssignment = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId || req.params.id;
    const studentId = req.user.id;

    let workflowPayload = null;
    if (req.body?.type === 'UML_WORKFLOW' && req.body?.content) {
      try {
        workflowPayload = JSON.parse(req.body.content);
      } catch {
        workflowPayload = null;
      }
    }

    const model = req.body.diagramData || {};

    const submissionData = {
      useCaseDiagram: req.body.useCaseDiagram || workflowPayload?.diagramData || model.diagram || req.body.diagramData,
      useCaseDescription: req.body.useCaseDescription || workflowPayload?.descriptions || model.descriptions || req.body.description,
      systemSequenceDiagram: req.body.systemSequenceDiagram || workflowPayload?.ssdData || model.ssds,
      submissionText: req.body.submissionText,
      submissionNote: req.body.description || req.body.submissionNote,
      status: req.body.status,
      ...(req.file && {
        submissionFile: _fileUpload.getFileInfo(req.file).url,
        submissionFileName: _fileUpload.getFileInfo(req.file).originalName,
        submissionFileType: _fileUpload.getFileInfo(req.file).type
      })
    };

    const hasContent = !!(submissionData.useCaseDiagram || submissionData.useCaseDescription || submissionData.systemSequenceDiagram || submissionData.submissionText || submissionData.submissionFile);

    if (!hasContent) {
      return res.status(400).json({
        success: false,
        error: { message: 'Submission cannot be empty.' }
      });
    }

    const submission = await _submissionService2.default.createSubmission(Number(assignmentId), studentId, submissionData);

    res.status(201).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Error in submitAssignment controller:', error);
    res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || 'Internal server error' }
    });
  }
}; exports.submitAssignment = submitAssignment;

const getMySubmission = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId || req.params.id;
    const studentId = req.user.id;
    const submission = await _submissionService2.default.getSubmissionByAssignmentId(Number(assignmentId), studentId);
    res.json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}; exports.getMySubmission = getMySubmission;

const getSubmissionStatus = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId || req.params.id;
    const studentId = req.user.id;
    const submission = await require('../repositories/submissionRepository').default.findUnique({
      where: { assignmentId_studentId: { assignmentId: Number(assignmentId), studentId } },
      include: { evaluation: true }
    });

    if (!submission) return res.json({ success: true, data: { status: 'pending' } });

    let report = submission.evaluation?.validationReport;
    if (typeof report === 'string') try { report = JSON.parse(report); } catch (e) { report = null; }

    const allIssues = [];
    if (report && typeof report === 'object') {
      Object.values(report).forEach(section => { if (section && Array.isArray(section.issues)) allIssues.push(...section.issues); });
    }

    res.json({
      success: true,
      data: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        score: submission.evaluation?.totalScore ?? 0,
        remarks: submission.evaluation?.remarks,
        issues: allIssues,
        fullReport: report,
        tutorialRequested: submission.tutorialRequested,
        tutorialApproved: submission.tutorialApproved
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}; exports.getSubmissionStatus = getSubmissionStatus;

const getSubmissionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await _submissionService2.default.getSubmissionDetailWithRole(Number(id), Number(req.user.id), req.user.role);
    res.json({ success: true, data: submission });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: { message: error.message } });
  }
}; exports.getSubmissionDetail = getSubmissionDetail;

const runSubmissionCheck = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { section, targetId } = req.body || {};
    const report = await _submissionService2.default.runCheckForTeacher(Number(submissionId), Number(req.user.id), { section, targetId });
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: { message: error.message } });
  }
}; exports.runSubmissionCheck = runSubmissionCheck;

const saveSubmissionRemarks = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { remarks, score } = req.body || {};
    const updated = await _submissionService2.default.saveTeacherRemarks(Number(submissionId), Number(req.user.id), { remarks, score });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}; exports.saveSubmissionRemarks = saveSubmissionRemarks;

const gradeSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { score, remarks, feedback } = req.body;
    const finalRemarks = remarks || feedback;
    const saved = await _submissionService2.default.saveFeedbackForTeacher(Number(submissionId), Number(req.user.id), { remarks: finalRemarks, score: score });
    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}; exports.gradeSubmission = gradeSubmission;

const saveSubmissionFeedback = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { report, remarks, score, isDraft } = req.body || {};
    const saved = await _submissionService2.default.saveFeedbackForTeacher(Number(submissionId), Number(req.user.id), { report, remarks, score, isDraft });
    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}; exports.saveSubmissionFeedback = saveSubmissionFeedback;

const getAllAssignmentSubmissions = async (req, res) => {
    try {
        const submissions = await _submissionService2.default.getAllSubmissionsForTeacher(req.user.id, req.query);
        res.json({ success: true, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
}; exports.getAllAssignmentSubmissions = getAllAssignmentSubmissions;

const getAssignmentSubmissions = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const submissions = await _submissionService2.default.getAssignmentSubmissions(Number(assignmentId), req.user.id);
        res.json({ success: true, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
}; exports.getAssignmentSubmissions = getAssignmentSubmissions;

const getMySubmissions = async (req, res) => {
    try {
        const submissions = await _submissionService2.default.getMySubmissions(req.user.id);
        res.json({ success: true, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
}; exports.getMySubmissions = getMySubmissions;

const getStudentAnalytics = async (req, res) => {
    try {
        const analytics = await _submissionService2.default.getStudentAnalytics(req.user.id);
        res.json({ success: true, data: analytics });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
}; exports.getStudentAnalytics = getStudentAnalytics;

const getSubmissionReceipt = async (req, res) => {
    try {
        const receipt = await _submissionService2.default.getSubmissionReceipt(req.params.id, req.user.id);
        res.json({ success: true, data: receipt });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
}; exports.getSubmissionReceipt = getSubmissionReceipt;

const requestTutorialMode = async (req, res) => {
    try {
        const submissionId = req.params.id;
        const updated = await _submissionService2.default.requestTutorial(Number(submissionId), req.user.id);
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, error: { message: error.message } });
    }
}; exports.requestTutorialMode = requestTutorialMode;

const approveTutorialMode = async (req, res) => {
    try {
        const submissionId = req.params.id;
        const updated = await _submissionService2.default.approveTutorial(Number(submissionId), req.user.id);
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, error: { message: error.message } });
    }
}; exports.approveTutorialMode = approveTutorialMode;
