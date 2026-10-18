-- DropIndex
DROP INDEX "Homework_familyId_idx";

-- AlterTable
ALTER TABLE "Homework" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Homework_familyId_isArchived_idx" ON "Homework"("familyId", "isArchived");
