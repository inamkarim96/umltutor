"use strict";

/**
 * Production DBs that have not run migration 20260524120000 lack tutorial extension
 * columns. Prisma fails if those fields are selected. Retry with a legacy select.
 */

function isMissingSubmissionColumnError(err) {
  const msg = String(err?.message || "");
  return (
    msg.includes("does not exist") ||
    msg.includes("Unknown column") ||
    (err?.code === "P2022" && /Submission/i.test(msg))
  );
}

function withTutorialFieldDefaults(submission) {
  if (!submission) return submission;
  return {
    ...submission,
    tutorialRejected: submission.tutorialRejected ?? false,
    tutorialRequestedAt: submission.tutorialRequestedAt ?? null,
    tutorialReviewedAt: submission.tutorialReviewedAt ?? null,
    tutorialRejectionReason: submission.tutorialRejectionReason ?? null,
  };
}

function tutorialExtensionSelect(includeExtension) {
  if (!includeExtension) return {};
  return {
    tutorialRejected: true,
    tutorialRequestedAt: true,
    tutorialReviewedAt: true,
    tutorialRejectionReason: true,
  };
}

function statusSelect(includeExtension, includeReport) {
  return {
    id: true,
    status: true,
    submittedAt: true,
    tutorialRequested: true,
    tutorialApproved: true,
    ...tutorialExtensionSelect(includeExtension),
    evaluation: {
      select: {
        totalScore: true,
        remarks: true,
        ...(includeReport ? { validationReport: true } : {}),
      },
    },
  };
}

function studentWorkSelect(includeExtension) {
  return {
    id: true,
    assignmentId: true,
    studentId: true,
    status: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
    tutorialRequested: true,
    tutorialApproved: true,
    ...tutorialExtensionSelect(includeExtension),
    useCaseDiagram: true,
    useCaseDescriptions: true,
    ssdDiagrams: true,
    classDiagram: true,
    sequenceDiagrams: true,
    evaluation: { select: { totalScore: true, remarks: true } },
  };
}

async function queryWithLegacyFallback(runQuery) {
  try {
    return withTutorialFieldDefaults(await runQuery(true));
  } catch (err) {
    if (!isMissingSubmissionColumnError(err)) throw err;
    console.warn(
      "[Submission] DB missing tutorial extension columns — using legacy query. Run: npx prisma migrate deploy"
    );
    return withTutorialFieldDefaults(await runQuery(false));
  }
}

async function findSubmissionStatus(submissionRepository, where, { includeReport = false } = {}) {
  return queryWithLegacyFallback((includeExtension) =>
    submissionRepository.findUnique({
      where,
      select: statusSelect(includeExtension, includeReport),
    })
  );
}

async function findSubmissionWithArtifacts(submissionRepository, where) {
  return queryWithLegacyFallback((includeExtension) =>
    submissionRepository.findFirst({
      where,
      select: studentWorkSelect(includeExtension),
    })
  );
}

module.exports = {
  isMissingSubmissionColumnError,
  withTutorialFieldDefaults,
  findSubmissionStatus,
  findSubmissionWithArtifacts,
};
