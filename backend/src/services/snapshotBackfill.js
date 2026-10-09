import { prisma } from './database.js';

export async function backfillLearningSnapshots() {
  const attempts = await prisma.attempt.findMany({ select: { studentId: true, createdAt: true, isCorrect: true, timeSpentSeconds: true } });
  const grouped = new Map();
  for (const attempt of attempts) {
    const date = new Date(attempt.createdAt); date.setUTCHours(0, 0, 0, 0);
    const key = `${attempt.studentId}:${date.toISOString()}`;
    const row = grouped.get(key) || { studentId: attempt.studentId, date, questionsAnswered: 0, correctAnswers: 0, minutesSpent: 0 };
    row.questionsAnswered += 1;
    if (attempt.isCorrect) row.correctAnswers += 1;
    row.minutesSpent += Math.round((attempt.timeSpentSeconds || 0) / 60);
    grouped.set(key, row);
  }
  for (const row of grouped.values()) {
    row.accuracy = row.questionsAnswered ? Math.round(row.correctAnswers / row.questionsAnswered * 100) : 0;
    await prisma.learningSnapshot.upsert({ where: { studentId_date: { studentId: row.studentId, date: row.date } }, update: row, create: row });
  }
  return { attempts: attempts.length, snapshots: grouped.size };
}
