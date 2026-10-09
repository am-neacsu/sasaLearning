import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const family = await prisma.family.findFirst({ where:{name:'BrightPath Demo Family'} }) ?? await prisma.family.create({ data:{name:'BrightPath Demo Family'} });
  const curriculum = await prisma.curriculum.upsert({ where:{name:'UK National Curriculum'}, update:{}, create:{name:'UK National Curriculum'} });
  const yearGroup = await prisma.yearGroup.upsert({ where:{curriculumId_name:{curriculumId:curriculum.id,name:'Year 6'}}, update:{}, create:{name:'Year 6',curriculumId:curriculum.id} });
  const subjects = {};
  for (const [name,slug] of [['Maths','maths'],['English','english'],['Science','science']]) subjects[slug] = await prisma.subject.upsert({where:{slug},update:{},create:{name,slug}});
  const maths = subjects.maths;
  const topic = await prisma.topic.upsert({where:{subjectId_name:{subjectId:maths.id,name:'Number'}},update:{},create:{name:'Number',subjectId:maths.id}});
  const subtopic = await prisma.subtopic.upsert({where:{topicId_name:{topicId:topic.id,name:'Fractions'}},update:{},create:{name:'Fractions',topicId:topic.id}});
  const skill = await prisma.skill.upsert({where:{topicId_name:{topicId:topic.id,name:'Adding fractions'}},update:{},create:{name:'Adding fractions',topicId:topic.id,subtopicId:subtopic.id}});
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);
  const parent = await prisma.user.upsert({where:{email:'parent@example.test'},update:{},create:{email:'parent@example.test',passwordHash,firstName:'Alex',role:'PARENT',familyId:family.id}});
  for (const firstName of ['Sophie','Oliver']) { const email=`${firstName.toLowerCase()}@example.test`; const user=await prisma.user.upsert({where:{email},update:{},create:{email,passwordHash,firstName,role:'STUDENT',familyId:family.id}}); await prisma.student.upsert({where:{userId:user.id},update:{},create:{userId:user.id,familyId:family.id,yearGroupId:yearGroup.id}}); }
  const samples=[['What is 1/2 + 1/4?','3/4'],['What is 2/5 + 1/5?','3/5'],['What is 1/3 + 1/3?','2/3']];
  for (const [text,answer] of samples) { const exists=await prisma.question.findFirst({where:{text}}); if(!exists) await prisma.question.create({data:{subjectId:maths.id,topicId:topic.id,subtopicId:subtopic.id,yearGroupId:yearGroup.id,type:'TYPED_ANSWER',text,correctAnswer:answer,explanation:'Find a common denominator, then add the numerators.',difficulty:3,skills:{create:{skillId:skill.id}}}}); }
  for (const [name,description,points] of [['First Homework Completed','Complete your first homework.',20],['100 Questions Answered','Answer 100 questions.',50],['Fractions Master','Build strong fractions skills.',100]]) await prisma.achievement.upsert({where:{name},update:{},create:{name,description,points}});
  console.log(`Seeded family ${family.name}; parent ${parent.email}`);
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
