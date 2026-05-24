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

/**
 * Load full submission detail by id without failing on optional Submission columns.
 */
async function findSubmissionDetailById(submissionId) {
  const id = Number(submissionId);
  if (!id || Number.isNaN(id)) return null;

  const staged = await loadSubmissionArtifactsStaged({ id });
  if (!staged) return null;

  const [student, assignment, evaluation] = await Promise.all([
    prisma.user
      .findUnique({
        where: { id: staged.studentId },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
      .catch(() => null),
    prisma.assignment
      .findUnique({
        where: { id: staged.assignmentId },
        select: {
          id: true,
          title: true,
          maxScore: true,
          classId: true,
          createdBy: true,
          textContent: true,
          class: { select: { teacherId: true, name: true } },
        },
      })
      .catch(() => null),
    prisma.evaluation
      .findUnique({
        where: { submissionId: id },
      })
      .catch(() => null),
  ]);

  return withTutorialFieldDefaults({
    ...staged,
    student,
    assignment,
    evaluation,
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

  const baseInclude = {
    student: { select: { id: true, firstName: true, lastName: true, email: true } },
    assignment: { select: { id: true, title: true, dueDate: true } },
    useCaseDiagram: { select: { data: true } },
    useCaseDescriptions: { select: { id: true } },
    ssdDiagrams: { select: { id: true } },
  };

  // Production DB may not have ClassDiagram / SequenceDiagram tables yet
  const includeVariants = [
    {
      ...baseInclude,
      classDiagram: { select: { data: true } },
      sequenceDiagrams: { select: { id: true } },
    },
    baseInclude,
  ];

  const whereAttempts = [
    {
      where: buildWhere(true),
      orderBy: [{ tutorialRequestedAt: "desc" }, { submittedAt: "desc" }],
    },
    {
      where: buildWhere(false),
      orderBy: [{ submittedAt: "desc" }],
    },
    {
      where: { assignment: { createdBy: tid }, tutorialRequested: true },
      orderBy: [{ submittedAt: "desc" }],
    },
    {
      where: {
        assignment: { createdBy: tid },
        status: { in: ["submitted", "graded"] },
      },
      orderBy: [{ submittedAt: "desc" }],
      filterInMemory: true,
    },
  ];

  let lastError = null;
  for (const attempt of whereAttempts) {
    for (const include of includeVariants) {
      try {
        let rows = await prisma.submission.findMany({
          where: attempt.where,
          include,
          orderBy: attempt.orderBy,
          skip: attempt.filterInMemory ? 0 : skip,
          take: attempt.filterInMemory ? Math.min(200, limitNum * 10) : limitNum,
        });
        rows = rows.map(withTutorialFieldDefaults);

        if (attempt.filterInMemory) {
          rows = rows.filter((s) => {
            const st = s.tutorialApproved
              ? "approved"
              : s.tutorialRejected
                ? "rejected"
                : s.tutorialRequested
                  ? "pending"
                  : "none";
            if (status === "pending") return st === "pending";
            if (status === "approved") return st === "approved";
            if (status === "rejected") return st === "rejected";
            return st !== "none";
          });
          const total = rows.length;
          rows = rows.slice(skip, skip + limitNum);
          return {
            rows,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total,
              totalPages: Math.ceil(total / limitNum) || 1,
            },
          };
        }

        const total = await prisma.submission.count({ where: attempt.where });
        return {
          rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1,
          },
        };
      } catch (err) {
        lastError = err;
        if (!isMissingTableOrColumnError(err)) throw err;
        console.warn("[Submission] Tutorial requests query retry:", err.message);
      }
    }
  }

  console.warn("[Submission] Tutorial requests unavailable — returning empty list");
  return {
    rows: [],
    pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 1 },
  };
}

module.exports = {
  isMissingSubmissionColumnError,
  withTutorialFieldDefaults,
  findSubmissionStatus,
  findSubmissionWithArtifacts,
  loadSubmissionArtifactsStaged,
  findSubmissionDetailById,
  findTutorialRequestsForTeacher,
};
