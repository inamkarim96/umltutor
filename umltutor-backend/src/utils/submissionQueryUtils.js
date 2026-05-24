"use strict";

const prisma = require("../config/prisma");

/**
 * Load student submission + UML artifacts resiliently across DB schema versions.
 */

function isMissingSubmissionColumnError(err) {
  const msg = String(err?.message || "");
  return (
    msg.includes("does not exist") ||
    msg.includes("Unknown column") ||
    msg.includes("column") && msg.includes("Submission") ||
    (err?.code === "P2022" && /Submission/i.test(msg))
  );
}

function withTutorialFieldDefaults(submission) {
  if (!submission) return submission;
  return {
    ...submission,
    tutorialRequested: submission.tutorialRequested ?? false,
    tutorialApproved: submission.tutorialApproved ?? false,
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

function studentWorkSelect(tutorialFields, includeExtension) {
  const base = {
    id: true,
    assignmentId: true,
    studentId: true,
    status: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
    useCaseDiagram: true,
    useCaseDescriptions: true,
    ssdDiagrams: true,
    classDiagram: true,
    sequenceDiagrams: true,
    evaluation: { select: { totalScore: true, remarks: true } },
  };
  if (!tutorialFields) return base;
  return {
    ...base,
    tutorialRequested: true,
    tutorialApproved: true,
    ...tutorialExtensionSelect(includeExtension),
  };
}

function artifactsOnlySelect() {
  return studentWorkSelect(false, false);
}

async function tryFindSubmission(repo, where, select) {
  return repo.findFirst({ where, select });
}

/**
 * Load diagram relations in separate queries (never fails on missing Submission columns).
 */
async function loadSubmissionArtifactsStaged(where) {
  const base = await prisma.submission.findFirst({
    where,
    select: {
      id: true,
      assignmentId: true,
      studentId: true,
      status: true,
      submittedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!base) return null;

  const submissionId = base.id;

  const [useCaseDiagram, useCaseDescriptions, ssdDiagrams, classDiagram, sequenceDiagrams, evaluation] =
    await Promise.all([
      prisma.useCaseDiagram.findUnique({ where: { submissionId } }).catch(() => null),
      prisma.useCaseDescription.findMany({ where: { submissionId } }).catch(() => []),
      prisma.sSDDiagram.findMany({ where: { submissionId } }).catch(() => []),
      prisma.classDiagram.findUnique({ where: { submissionId } }).catch(() => null),
      prisma.sequenceDiagram.findMany({ where: { submissionId } }).catch(() => []),
      prisma.evaluation
        .findUnique({
          where: { submissionId },
          select: { totalScore: true, remarks: true },
        })
        .catch(() => null),
    ]);

  let tutorialFields = {};
  try {
    const tutorialRow = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        tutorialRequested: true,
        tutorialApproved: true,
        tutorialRejected: true,
        tutorialRequestedAt: true,
        tutorialReviewedAt: true,
        tutorialRejectionReason: true,
      },
    });
    if (tutorialRow) tutorialFields = tutorialRow;
  } catch {
    /* optional columns missing — defaults applied below */
  }

  return withTutorialFieldDefaults({
    ...base,
    ...tutorialFields,
    useCaseDiagram,
    useCaseDescriptions,
    ssdDiagrams,
    classDiagram,
    sequenceDiagrams,
    evaluation,
  });
}

async function findSubmissionWithArtifacts(submissionRepository, where) {
  const attempts = [
    () => tryFindSubmission(submissionRepository, where, studentWorkSelect(true, true)),
    () => tryFindSubmission(submissionRepository, where, studentWorkSelect(true, false)),
    () => tryFindSubmission(submissionRepository, where, artifactsOnlySelect()),
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const row = await attempt();
      if (row) return withTutorialFieldDefaults(row);
    } catch (err) {
      lastError = err;
      if (isMissingSubmissionColumnError(err)) {
        console.warn("[Submission] Select retry:", err.message);
      }
    }
  }

  try {
    const staged = await loadSubmissionArtifactsStaged(where);
    if (staged) {
      console.info(
        `[Submission] Loaded artifacts via staged queries for assignment=${where.assignmentId} student=${where.studentId}`
      );
      return staged;
    }
    return null;
  } catch (err) {
    console.error("[Submission] Staged artifact load failed:", err.message);
    if (lastError) throw lastError;
    throw err;
  }
}

async function findSubmissionStatus(submissionRepository, where, { includeReport = false } = {}) {
  const attempts = [
    () =>
      submissionRepository.findUnique({
        where,
        select: statusSelect(true, includeReport),
      }),
    () =>
      submissionRepository.findUnique({
        where,
        select: statusSelect(false, includeReport),
      }),
    () =>
      submissionRepository.findUnique({
        where,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          evaluation: {
            select: {
              totalScore: true,
              remarks: true,
              ...(includeReport ? { validationReport: true } : {}),
            },
          },
        },
      }),
  ];

  for (const attempt of attempts) {
    try {
      const row = await attempt();
      if (row) return withTutorialFieldDefaults(row);
    } catch (err) {
      if (isMissingSubmissionColumnError(err)) continue;
      throw err;
    }
  }

  return { status: "pending" };
}

module.exports = {
  isMissingSubmissionColumnError,
  withTutorialFieldDefaults,
  findSubmissionStatus,
  findSubmissionWithArtifacts,
  loadSubmissionArtifactsStaged,
};
