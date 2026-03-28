/*
  Warnings:

  - You are about to drop the column `crossDiagramScore` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionScore` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `ssdScore` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `useCaseScore` on the `Evaluation` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Evaluation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submissionId" INTEGER NOT NULL,
    "totalScore" INTEGER,
    "remarks" TEXT,
    "validationReport" TEXT,
    "evaluatedBy" INTEGER NOT NULL,
    "evaluatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_evaluatedBy_fkey" FOREIGN KEY ("evaluatedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Evaluation" ("evaluatedAt", "evaluatedBy", "id", "remarks", "submissionId", "totalScore", "validationReport") SELECT "evaluatedAt", "evaluatedBy", "id", "remarks", "submissionId", "totalScore", "validationReport" FROM "Evaluation";
DROP TABLE "Evaluation";
ALTER TABLE "new_Evaluation" RENAME TO "Evaluation";
CREATE UNIQUE INDEX "Evaluation_submissionId_key" ON "Evaluation"("submissionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
