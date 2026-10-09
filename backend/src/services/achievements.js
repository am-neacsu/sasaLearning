import { prisma } from './database.js';
export async function recordStudentActivity(studentId, points=1) {
  const student=await prisma.student.findUnique({where:{id:studentId},select:{points:true,currentStreak:true,lastActivityAt:true}}); if(!student)return;
  const now=new Date(); const previous=student.lastActivityAt; const days=previous?Math.floor((now-previous)/86400000):99; const streak=days===1?student.currentStreak+1:days===0?student.currentStreak:1;
  const updated=await prisma.student.update({where:{id:studentId},data:{points:{increment:points},currentStreak:streak,lastActivityAt:now},select:{points:true,currentStreak:true}});
  const all=await prisma.achievement.findMany(); const answered=await prisma.attempt.count({where:{studentId}}); const completed=await prisma.homeworkAssignment.count({where:{studentId,status:'COMPLETED'}}); const eligible=all.filter(a=>(a.name==='100 Questions Answered'&&answered>=100)||(a.name==='7 Day Practice Streak'&&updated.currentStreak>=7)||(a.name==='First Homework Completed'&&completed>=1));
  for(const achievement of eligible) await prisma.studentAchievement.upsert({where:{studentId_achievementId:{studentId,achievementId:achievement.id}},update:{},create:{studentId,achievementId:achievement.id}}); return updated;
}
