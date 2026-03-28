"use strict"; Object.defineProperty(exports, "__esModule", { value: true }); var _submissionService = require('../services/submissionService'); var _submissionService2 = _interopRequireDefault(_submissionService); var _fileUpload = require('../utils/fileUpload'); var _fileUpload2 = _interopRequireDefault(_fileUpload); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const submitAssignment = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId || req.params.id;
    const studentId = req.user.id;

    // Handle UML workflow payload: { type: 'UML_WORKFLOW', content: JSON.stringify({ diagramData, descriptions, ssdData }) }
    let workflowPayload = null;
    if (req.body?.type === 'UML_WORKFLOW' && req.body?.content) {
      try {
        workflowPayload = JSON.parse(req.body.content);
      } catch {
        workflowPayload = null;
      }
    }

    // Check if the frontend sent a combined 'diagramData' model object
    const model = req.body.diagramData || {};

    const submissionData = {
      // If model contains internal diagram/descriptions/ssds, use them. 
      // Otherwise fallback to direct fields or legacy names.
      useCaseDiagram: req.body.useCaseDiagram || workflowPayload?.diagramData || model.diagram || req.body.diagramData,
      useCaseDescription: req.body.useCaseDescription || workflowPayload?.descriptions || model.descriptions || req.body.description,
      systemSequenceDiagram: req.body.systemSequenceDiagram || workflowPayload?.ssdData || model.ssds,
      submissionText: req.body.submissionText,

      // Store the optional teacher-facing submission note
      submissionNote: req.body.description || req.body.submissionNote,

      status: req.body.status, // Allow frontend to specify draft vs submitted

      // File handling
      ...(req.file && {
        submissionFile: _fileUpload.getFileInfo(req.file).url,
        submissionFileName: _fileUpload.getFileInfo(req.file).originalName,
        submissionFileType: _fileUpload.getFileInfo(req.file).type
      })
    };

    // Validate that submission is not empty
    const hasContent = !!(submissionData.useCaseDiagram ||
      submissionData.useCaseDescription ||
      submissionData.systemSequenceDiagram ||
      submissionData.submissionText ||
      submissionData.submissionFile);

    if (!hasContent) {
      return res.status(400).json({
        success: false,
        error: { message: 'Submission cannot be empty. Please provide at least one component (diagram, description, SSD, text, or file).' }
      });
    }

    // Validate text submissions are not just whitespace
    if (submissionData.submissionText && submissionData.submissionText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Text submission cannot be empty.' }
      });
    }

    const submission = await _submissionService2.default.createSubmission(Number(assignmentId), studentId, submissionData);

    res.status(201).json({
      success: true,
      data: {
        id: submission.id,
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        submittedAt: submission.submittedAt,
        status: submission.status
      }
    });
  } catch (error) {
    console.error('Error in submitAssignment controller:', error);
    res.status(error.statusCode || error.status || 500).json({
      success: false,
      error: { message: error.message || 'Internal server error during submission', stack: error.stack }
    });
  }
}; exports.submitAssignment = submitAssignment;

// Get the current student's full submission for an assignment (for prefill/edit)
const getMySubmission = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId || req.params.id;
    const studentId = req.user.id;

    const submission = await _submissionService2.default.getSubmissionByAssignmentId(Number(assignmentId), studentId);

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message, stack: error.stack } });
  }
}; exports.getMySubmission = getMySubmission;

const getSubmissionStatus = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId || req.params.id;
    const studentId = req.user.id;

    const submission = await require('../repositories/submissionRepository').default.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: Number(assignmentId),
          studentId: studentId
        }
      },
      include: { evaluation: true }
    });

    if (!submission) {
      return res.json({ success: true, data: { status: 'pending' } });
    }

    // Parse and flatten the validation report from the database
    let report = submission.evaluation?.validationReport;
    if (typeof report === 'string') {
      try {
        report = JSON.parse(report);
      } catch (e) {
        console.error('Failed to parse validationReport:', e);
        report = null;
      }
    }

    const allIssues = [];
    if (report && typeof report === 'object') {
      Object.values(report).forEach(section => {
        if (section && Array.isArray(section.issues)) {
          allIssues.push(...section.issues);
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        score: submission.evaluation?.totalScore ?? 0,
        remarks: submission.evaluation?.remarks,
        feedback: submission.evaluation?.remarks, // Fallback
        issues: allIssues,
        fullReport: report, // Provide raw report as well
        tutorialRequested: submission.tutorialRequested,
        tutorialApproved: submission.tutorialApproved
      }
    });
  } catch (error) {
    res.status(error.statusCode || error.status || 500).json({ success: false, error: { message: error.message } });
  }
}; exports.getSubmissionStatus = getSubmissionStatus;

// Get a full submission (student + assignment + artifacts) by submissionId
const getSubmissionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const submission = await _submissionService2.default.getSubmissionDetailWithRole(Number(id), Number(userId), userRole);

    res.json({ success: true, data: submission });
  } catch (error) {
    res.status(error.statusCode || error.status || 500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch submission' }
    });
  }
}; exports.getSubmissionDetail = getSubmissionDetail;

// Teacher: Run checking engine against a submission's saved UML data
const runSubmissionCheck = async (req, res) => {
  try {
    const submissionId = req.params.submissionId || req.params.id;
    const teacherId = req.user.id;
    const { section, targetId } = req.body || {};
    const report = await _submissionService2.default.runCheckForTeacher(Number(submissionId), Number(teacherId), { section, targetId });
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(error.statusCode || error.status || 500).json({
      success: false,
      error: { message: error.message || 'Failed to run checking' }
    });
  }
}; exports.runSubmissionCheck = runSubmissionCheck;

// Teacher: Save remarks (and optional score) for a submission
const saveSubmissionRemarks = async (req, res) => {
  try {
    const submissionId = req.params.submissionId || req.params.id;
    const teacherId = req.user.id;
    const { remarks, score } = req.body || {};
    const updated = await _submissionService2.default.saveTeacherRemarks(Number(submissionId), Number(teacherId), { remarks, score });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(error.statusCode || error.status || 500).json({
      success: false,
      error: { message: error.message || 'Failed to save remarks' }
    });
  }
}; exports.saveSubmissionRemarks = saveSubmissionRemarks;

// Teacher: Save evaluation (report + remarks + score)
const saveSubmissionFeedback = async (req, res) => {
  try {
    const submissionId = req.params.submissionId || req.params.id;
    const teacherId = req.user.id;
    const { report, remarks, score, isDraft } = req.body || {};
    const saved = await _submissionService2.default.saveFeedbackForTeacher(Number(submissionId), Number(teacherId), { report, remarks, score, isDraft });
    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(error.statusCode || error.status || 500).json({
      success: false,
      error: { message: error.message || 'Failed to save feedback' }
    });
  }
}; exports.saveSubmissionFeedback = saveSubmissionFeedback;

const updateSubmission = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId || req.params.id;
    const studentId = req.user.id;

    // Handle different submission types
    let submissionData = {};

    if (req.file) {
      // File submission
      const fileInfo = _fileUpload.getFileInfo(req.file);
      submissionData = {
        submissionFile: fileInfo.url,
        submissionFileName: fileInfo.originalName,
        submissionFileType: fileInfo.type
      };
    } else if (req.body.submissionText) {
      // Text submission
      submissionData = {
        submissionText: req.body.submissionText
      };
    } else if (req.body.diagramData) {
      // Diagram submission
      submissionData = {
        diagramData: req.body.diagramData,
        description: req.body.description
      };
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Submission content is required. Provide text, file, or diagram data.' }
      });
    }

    const submission = await _submissionService2.default.updateSubmission(Number(assignmentId), studentId, submissionData);

    res.status(200).json({
      success: true,
      data: {
        id: submission.id,
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        status: submission.status,
        updatedAt: submission.updatedAt
      }
    });
  } catch (error) {
    console.error('Error in updateSubmission controller:', error);
    res.status(error.statusCode || error.status || 500).json({
      success: false,
      error: { message: error.message || 'Internal server error during update' }
    });
  }
}; exports.updateSubmission = updateSubmission;

const deleteSubmission = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId || req.params.id;
    const studentId = req.user.id;

    const submission = await require('../repositories/submissionRepository').default.delete({
      where: {
        assignmentId_studentId: {
          assignmentId: Number(assignmentId),
          studentId: studentId
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        id: submission.id,
        assignmentId: submission.assignmentId,
        message: 'Submission deleted successfully'
      }
    });
  } catch (error) {
    console.error('Error in deleteSubmission controller:', error);
    res.status(error.statusCode || error.status || 500).json({
      success: false,
      error: { message: error.message || 'Internal server error during deletion' }
    });
  }
}; exports.deleteSubmission = deleteSubmission;

const getAssignmentSubmissions = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId || req.params.id;
    const teacherId = req.user.id;

    if (req.user.role !== 'TEACHER') {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied. Teacher role required.' }
      });
    }

    const submissions = await _submissionService2.default.getAssignmentSubmissions(Number(assignmentId), teacherId);

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching submissions for teacher:', error);
    res.status(error.statusCode || error.status || 500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch submissions' }
    });
  }
}; exports.getAssignmentSubmissions = getAssignmentSubmissions;

const requestTutorialMode = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const studentId = req.user.id;

    // Verify submission exists and belongs to student
    const submission = await require('../repositories/submissionRepository').default.findUnique({
      where: { id: Number(submissionId) },
      include: {
        useCaseDiagram: true,
        useCaseDescriptions: true,
        ssdDiagrams: true,
        student: { select: { id: true, firstName: true, lastName: true } },
        assignment: { select: { id: true, title: true, createdBy: true } }
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, error: { message: 'Submission not found' } });
    }

    if (submission.studentId !== studentId) {
      return res.status(403).json({ success: false, error: { message: 'Access denied' } });
    }

    // Must be submitted before requesting tutorial
    if (submission.status !== 'submitted') {
      return res.status(400).json({ success: false, error: { message: 'You must submit your assignment before requesting Tutorial Mode.' } });
    }

    // Check artifacts exist
    if (!submission.useCaseDiagram || submission.useCaseDescriptions.length === 0 || submission.ssdDiagrams.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Incomplete artifacts. Use case diagram, use case description, and system sequence diagram are required to request tutorial mode.' } });
    }

    const updated = await require('../repositories/submissionRepository').default.update({
      where: { id: Number(submissionId) },
      data: { tutorialRequested: true }
    });

    // Notify Teacher
    try {
      const notificationService = require('../services/notificationService').default;
      await notificationService.createNotification({
        userId: submission.assignment.createdBy,
        title: 'Tutorial Mode Requested',
        message: `${submission.student.firstName} ${submission.student.lastName} has requested Tutorial Mode for "${submission.assignment.title}".`,
        type: 'TUTORIAL_REQUESTED',
        relatedId: submission.id.toString()
      });
    } catch (notifyError) {
      console.error('Failed to send teacher notification:', notifyError);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}; exports.requestTutorialMode = requestTutorialMode;

const approveTutorialMode = async (req, res) => {
  try {
    const submissionId = req.params.id;

    const submission = await require('../repositories/submissionRepository').default.findUnique({
      where: { id: Number(submissionId) },
      include: {
        assignment: { select: { id: true, title: true } },
        student: { select: { id: true } }
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, error: { message: 'Submission not found' } });
    }

    const updated = await require('../repositories/submissionRepository').default.update({
      where: { id: Number(submissionId) },
      data: {
        tutorialApproved: true,
        status: 'draft' // Unlock for tutorial editing
      }
    });

    // Notify Student
    try {
      const notificationService = require('../services/notificationService').default;
      await notificationService.createNotification({
        userId: submission.student.id,
        title: 'Tutorial Mode Approved',
        message: `Your request for Tutorial Mode in "${submission.assignment.title}" has been approved. You can now continue your work.`,
        type: 'TUTORIAL_APPROVED',
        relatedId: submission.id.toString()
      });
    } catch (notifyError) {
      console.error('Failed to send student notification:', notifyError);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}; exports.approveTutorialMode = approveTutorialMode;
