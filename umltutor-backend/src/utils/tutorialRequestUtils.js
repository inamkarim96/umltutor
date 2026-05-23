"use strict";

function safeParseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hasDiagramData(diagram) {
  const parsed = safeParseJson(diagram?.data ?? diagram);
  if (!parsed) return false;
  const nodes = parsed.nodes || [];
  return Array.isArray(nodes) && nodes.length > 0;
}

function hasRelatedArtifacts(items) {
  if (!items || items.length === 0) return false;
  return items.some((item) => {
    const parsed = safeParseJson(item?.data);
    return parsed && Object.keys(parsed).length > 0;
  });
}

/**
 * Compute UML workspace completion (5 sections × 20%).
 */
function computeSubmissionCompletion(submission) {
  const sections = {
    useCaseDiagram: hasDiagramData(submission?.useCaseDiagram),
    useCaseDescriptions: hasRelatedArtifacts(submission?.useCaseDescriptions),
    systemSequenceDiagrams: hasRelatedArtifacts(submission?.ssdDiagrams),
    classDiagram: hasDiagramData(submission?.classDiagram),
    sequenceDiagrams: hasRelatedArtifacts(submission?.sequenceDiagrams),
  };

  const completed = Object.values(sections).filter(Boolean).length;
  const percent = Math.round((completed / 5) * 100);

  return {
    percent,
    sections,
    isComplete: completed === 5,
    completedCount: completed,
    totalSections: 5,
  };
}

function resolveTutorialRequestStatus(submission) {
  if (!submission) return "none";
  if (submission.tutorialApproved) return "approved";
  if (submission.tutorialRejected) return "rejected";
  if (submission.tutorialRequested) return "pending";
  return "none";
}

function isSubmissionSubmitted(submission) {
  if (!submission) return false;
  const status = (submission.status || "").toLowerCase();
  return status === "submitted" || status === "graded" || !!submission.submittedAt;
}

/**
 * Whether a teacher may approve tutorial access.
 */
function validateTutorialApproval(submission) {
  if (!submission) {
    return { canApprove: false, message: "Submission required before requesting Tutorial Mode." };
  }
  if (!isSubmissionSubmitted(submission)) {
    return {
      canApprove: false,
      message: "Tutorial Mode cannot be approved because the assignment is not submitted.",
    };
  }
  const completion = computeSubmissionCompletion(submission);
  if (!completion.isComplete) {
    return {
      canApprove: false,
      message: `Tutorial Mode cannot be approved because assignment is incomplete (${completion.percent}% complete).`,
      completion,
    };
  }
  return { canApprove: true, message: null, completion };
}

module.exports = {
  safeParseJson,
  computeSubmissionCompletion,
  resolveTutorialRequestStatus,
  isSubmissionSubmitted,
  validateTutorialApproval,
};
