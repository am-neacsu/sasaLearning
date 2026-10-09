-- CreateTable
CREATE TABLE "LearningSnapshot" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minutesSpent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LearningSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningSnapshot_studentId_date_idx" ON "LearningSnapshot"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LearningSnapshot_studentId_date_key" ON "LearningSnapshot"("studentId", "date");

-- AddForeignKey
ALTER TABLE "LearningSnapshot" ADD CONSTRAINT "LearningSnapshot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
