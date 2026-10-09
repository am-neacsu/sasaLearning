import { prisma } from './database.js';
export async function recordLearningSnapshot(studentId, { correct, minutes = 0 }) {
  const date = new Date(); date.setUTCHours(0, 0, 0, 0);
  return prisma.learningSnapshot.upsert({ where: { studentId_date: { studentId, date } }, update: { questionsAnswered: { increment: 1 }, correctAnswers: { increment: correct ? 1 : 0 }, minutesSpent: { increment: Math.max(0, Math.round(minutes)) } }, create: { studentId, date, questionsAnswered: 1, correctAnswers: correct ? 1 : 0, accuracy: correct ? 100 : 0, minutesSpent: Math.max(0, Math.round(minutes)) } });
}
export async function refreshSnapshotAccuracy(studentId, date) { const row=await prisma.learningSnapshot.findUnique({where:{studentId_date:{studentId,date}}}); if(!row)return null; return prisma.learningSnapshot.update({where:{id:row.id},data:{accuracy:row.questionsAnswered?Math.round(row.correctAnswers/row.questionsAnswered*100):0}}); }
