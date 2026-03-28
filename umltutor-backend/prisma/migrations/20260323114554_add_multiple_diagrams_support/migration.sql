/*
  Warnings:

  - You are about to drop the `UMLData` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN "validationReport" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UMLData";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "UseCaseDiagram" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submissionId" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UseCaseDiagram_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UseCaseDescription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submissionId" INTEGER NOT NULL,
    "relatedId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UseCaseDescription_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SSDDiagram" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submissionId" INTEGER NOT NULL,
    "relatedId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SSDDiagram_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UseCaseDiagram_submissionId_key" ON "UseCaseDiagram"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UseCaseDescription_submissionId_relatedId_key" ON "UseCaseDescription"("submissionId", "relatedId");

-- CreateIndex
CREATE UNIQUE INDEX "SSDDiagram_submissionId_relatedId_key" ON "SSDDiagram"("submissionId", "relatedId");
