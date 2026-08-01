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
    (msg.includes("column") && msg.includes("Submission")) ||
    (err?.code === "P2022" && /Submission/i.test(msg))
  );
}

function isMissingTableOrColumnError(err) {
  const msg = String(err?.message || "");
  return (
    isMissingSubmissionColumnError(err) ||
    msg.includes("does not exist") ||
    (err?.code === "P2021") ||
    (err?.code === "P2022")
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

async function findSubmissionWithArtifacts(submissionRepository, where) {
  // Prisma's findUnique requires a unique selector (`id` or the compound
  // `assignmentId_studentId`). Callers often pass the flat
  // `{ assignmentId, studentId }` shape, which Prisma rejects — normalize it
  // to the compound key so the student's saved work actually loads.
  let uniqueWhere = where;
  if (where && where.assignmentId !== undefined && where.studentId !== undefined) {
    uniqueWhere = {
      assignmentId_studentId: {
        assignmentId: where.assignmentId,
        studentId: where.studentId,
      },
    };
  }

  // Simplified: just use the primary query with all artifacts included
  const row = await submissionRepository.findUnique({
    where: uniqueWhere,
    include: {
      useCaseDiagram: { select: { data: true } },
      useCaseDescriptions: { select: { relatedId: true, data: true } },
      ssdDiagrams: { select: { relatedId: true, data: true } },
      classDiagram: { select: { data: true } },
      sequenceDiagrams: { select: { relatedId: true, data: true } },
      evaluation: { select: { totalScore: true, remarks: true, validationReport: true } },
    },
  });

  if (row) return withTutorialFieldDefaults(row);
  return null;
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

/**
 * Load full submission detail by id without failing on optional Submission columns.
 */
async function findSubmissionDetailById(submissionId) {
  const id = Number(submissionId);
  if (!id || Number.isNaN(id)) return null;

  // Single query with all relations instead of multiple staged queries
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, email: true, firstName: true, lastName: true } },
      assignment: {
        select: {
          id: true,
          title: true,
          maxScore: true,
          classId: true,
          createdBy: true,
          textContent: true,
          class: { select: { teacherId: true, name: true } },
        },
      },
      useCaseDiagram: { select: { data: true } },
      useCaseDescriptions: { select: { relatedId: true, data: true } },
      ssdDiagrams: { select: { relatedId: true, data: true } },
      classDiagram: { select: { data: true } },
      sequenceDiagrams: { select: { relatedId: true, data: true } },
      evaluation: true,
    },
  });

  if (!submission) return null;

  return withTutorialFieldDefaults({
    ...submission,
    evaluation: submission.evaluation || null,
  });
}

async function findTutorialRequestsForTeacher(teacherId, { status = "all", pageNum = 1, limitNum = 20 } = {}) {
  const tid = Number(teacherId);
  const skip = (pageNum - 1) * limitNum;

  const buildWhere = (includeRejected) => {
    const where = { assignment: { createdBy: tid } };
    if (status === "pending") {
      where.tutorialRequested = true;
      where.tutorialApproved = false;
      if (includeRejected) where.tutorialRejected = false;
    } else if (status === "approved") {
      where.tutorialApproved = true;
    } else if (status === "rejected" && includeRejected) {
      where.tutorialRejected = true;
      where.tutorialApproved = false;
    } else {
      where.OR = [
        { tutorialRequested: true },
        { tutorialApproved: true },
        ...(includeRejected ? [{ tutorialRejected: true }] : []),
      ];
    }
    return where;
  };

  const include = {
    student: { select: { id: true, firstName: true, lastName: true, email: true } },
    assignment: { select: { id: true, title: true, dueDate: true } },
    useCaseDiagram: { select: { data: true } },
    useCaseDescriptions: { select: { id: true } },
    ssdDiagrams: { select: { id: true } },
  };

  const where = buildWhere(true);
  const orderBy = [{ tutorialRequestedAt: "desc" }, { submittedAt: "desc" }];

  // Single query with count
  const [rows, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include,
      orderBy,
      skip,
      take: limitNum,
    }),
    prisma.submission.count({ where }),
  ]);

  return {
    rows: rows.map(withTutorialFieldDefaults),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Update tutorial-related Submission columns with fallbacks for older DB schemas.
 */
async function updateSubmissionTutorialFields(submissionId, data) {
  const id = Number(submissionId);
  if (!id || Number.isNaN(id)) {
    throw new Error("Invalid submission id for tutorial update");
  }

  const {
    tutorialApproved,
    tutorialRejected,
    tutorialRequested,
    tutorialRejectionReason,
    tutorialReviewedAt,
    tutorialRequestedAt,
  } = data;

  const attempts = [
    data,
    {
      tutorialApproved,
      tutorialRejected,
      tutorialRequested,
      tutorialRejectionReason,
      tutorialReviewedAt,
      tutorialRequestedAt,
    },
    { tutorialApproved, tutorialRejected, tutorialRequested },
    { tutorialApproved, tutorialRequested },
    { tutorialApproved },
  ]
    .map((payload) =>
      Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
      )
    )
    .filter((payload) => Object.keys(payload).length > 0);

  const seen = new Set();
  const uniqueAttempts = attempts.filter((payload) => {
    const key = JSON.stringify(payload);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let lastError = null;
  for (const payload of uniqueAttempts) {
    try {
      return await prisma.submission.update({ where: { id }, data: payload });
    } catch (err) {
      lastError = err;
      if (!isMissingSubmissionColumnError(err) && !isMissingTableOrColumnError(err)) {
        throw err;
      }
      console.warn("[Submission] Tutorial field update retry:", err.message);
    }
  }

  throw lastError || new Error("Unable to update tutorial fields on submission");
}

module.exports = {
  isMissingSubmissionColumnError,
  withTutorialFieldDefaults,
  findSubmissionStatus,
  findSubmissionWithArtifacts,
  findSubmissionDetailById,
  findTutorialRequestsForTeacher,
  updateSubmissionTutorialFields,
};
