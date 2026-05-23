-- Tutorial request management fields
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "tutorialRejected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "tutorialRequestedAt" TIMESTAMP(3);
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "tutorialReviewedAt" TIMESTAMP(3);
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "tutorialRejectionReason" TEXT;

CREATE INDEX IF NOT EXISTS "Submission_tutorialRequested_tutorialApproved_tutorialRejected_idx"
ON "Submission"("tutorialRequested", "tutorialApproved", "tutorialRejected");
