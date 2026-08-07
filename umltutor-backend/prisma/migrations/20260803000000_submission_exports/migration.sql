-- Submission export history: track when/how long students export their work
-- and keep the generated export file accessible.
CREATE TABLE IF NOT EXISTS "SubmissionExport" (
    "id" SERIAL PRIMARY KEY,
    "submissionId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "section" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionExport_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SubmissionExport_submissionId_idx" ON "SubmissionExport"("submissionId");
CREATE INDEX IF NOT EXISTS "SubmissionExport_studentId_idx" ON "SubmissionExport"("studentId");
CREATE INDEX IF NOT EXISTS "SubmissionExport_assignmentId_idx" ON "SubmissionExport"("assignmentId");
CREATE INDEX IF NOT EXISTS "SubmissionExport_createdAt_idx" ON "SubmissionExport"("createdAt");
