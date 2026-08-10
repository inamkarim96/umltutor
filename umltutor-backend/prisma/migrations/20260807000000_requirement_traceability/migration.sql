-- Case-study requirements traceability:
-- 1. Assignments may carry a free-text case-study requirement prompt.
-- 2. Each submission stores a parsed RequirementModel snapshot that drives the
--    5-step traceability checks (UCD → Description → SSD → Class → Sequence).
ALTER TABLE "Assignment"
ADD COLUMN "requirementText" TEXT;

CREATE TABLE IF NOT EXISTS "RequirementSnapshot" (
    "id" SERIAL PRIMARY KEY,
    "submissionId" INTEGER NOT NULL UNIQUE,
    "rawText" TEXT NOT NULL,
    "parsedModel" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT '1',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementSnapshot_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RequirementSnapshot_submissionId_idx" ON "RequirementSnapshot"("submissionId");
