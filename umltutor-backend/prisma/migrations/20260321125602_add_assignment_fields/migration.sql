-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "assignmentFileName" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "assignmentFileType" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "assignmentFileUrl" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "instructions" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "maxScore" INTEGER DEFAULT 100;
ALTER TABLE "Assignment" ADD COLUMN "releaseDate" DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Assignment" ADD COLUMN "textContent" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "type" TEXT;
