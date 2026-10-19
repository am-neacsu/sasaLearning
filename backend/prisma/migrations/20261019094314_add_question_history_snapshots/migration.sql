-- DropForeignKey
ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_questionId_fkey";

-- DropForeignKey
ALTER TABLE "HomeworkAnswer" DROP CONSTRAINT "HomeworkAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "HomeworkQuestion" DROP CONSTRAINT "HomeworkQuestion_questionId_fkey";

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "questionSnapshot" JSONB,
ALTER COLUMN "questionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "HomeworkAnswer" ADD COLUMN     "questionSnapshot" JSONB,
ALTER COLUMN "questionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "HomeworkQuestion" ADD CONSTRAINT "HomeworkQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAnswer" ADD CONSTRAINT "HomeworkAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
