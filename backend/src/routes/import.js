import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('PARENT'));
const types = ['MULTIPLE_CHOICE', 'TYPED_ANSWER', 'NUMERIC', 'TRUE_FALSE', 'MULTI_SELECT', 'WRITTEN', 'READING_COMPREHENSION', 'MULTI_PART'];

const item = z.object({
  subjectId: z.string().optional(), topicId: z.string().optional(), subtopicId: z.string().optional(), yearGroupId: z.string().optional(), skillIds: z.array(z.string()).optional(),
  subject: z.string().trim().min(1).optional(), topic: z.string().trim().min(1).optional(), category: z.string().trim().min(1).optional(), subtopic: z.string().trim().min(1).optional(), skill: z.string().trim().min(1).optional(), yearGroup: z.string().trim().min(1).optional(),
  type: z.enum(types), text: z.string().trim().min(1), correctAnswer: z.any(), options: z.any().optional(), explanation: z.string().optional(), hint: z.string().optional(), workedSolution: z.string().optional(), difficulty: z.coerce.number().int().min(1).max(5).default(3), points: z.coerce.number().int().min(1).default(1),
}).superRefine((value, ctx) => {
  if (!value.subjectId && !value.subject) ctx.addIssue({ code: 'custom', path: ['subject'], message: 'Provide subject or subjectId.' });
  if (!value.topicId && !value.topic && !value.category) ctx.addIssue({ code: 'custom', path: ['topic'], message: 'Provide topic, category or topicId.' });
});

const key = (value) => value.trim().toLowerCase();

export async function findOrCreateCatalog(tx, row) {
  const subjectName = row.subject || row.subjectId;
  let subject = row.subjectId ? await tx.subject.findUnique({ where: { id: row.subjectId } }) : null;
  if (!subject) subject = await tx.subject.findFirst({ where: { name: { equals: subjectName, mode: 'insensitive' } } });
  if (!subject) subject = await tx.subject.create({ data: { name: subjectName, slug: key(subjectName).replace(/[^a-z0-9]+/g, '-') } });

  const topicName = row.topic || row.category || row.topicId;
  let topic = row.topicId ? await tx.topic.findUnique({ where: { id: row.topicId } }) : null;
  if (!topic || topic.subjectId !== subject.id) topic = await tx.topic.findFirst({ where: { subjectId: subject.id, name: { equals: topicName, mode: 'insensitive' } } });
  if (!topic) topic = await tx.topic.create({ data: { name: topicName, subjectId: subject.id } });

  let subtopic = null;
  const subtopicName = row.subtopic || row.subtopicId;
  if (subtopicName) {
    subtopic = row.subtopicId ? await tx.subtopic.findUnique({ where: { id: row.subtopicId } }) : null;
    if (!subtopic || subtopic.topicId !== topic.id) subtopic = await tx.subtopic.findFirst({ where: { topicId: topic.id, name: { equals: subtopicName, mode: 'insensitive' } } });
    if (!subtopic) subtopic = await tx.subtopic.create({ data: { name: subtopicName, topicId: topic.id } });
  }

  let yearGroup = null;
  const yearName = row.yearGroup || row.yearGroupId;
  if (yearName) {
    yearGroup = row.yearGroupId ? await tx.yearGroup.findUnique({ where: { id: row.yearGroupId } }) : null;
    if (!yearGroup) yearGroup = await tx.yearGroup.findFirst({ where: { name: { equals: yearName, mode: 'insensitive' } } });
    if (!yearGroup) {
      let curriculum = await tx.curriculum.findFirst({ where: { name: 'Imported curriculum' } });
      if (!curriculum) curriculum = await tx.curriculum.create({ data: { name: 'Imported curriculum' } });
      yearGroup = await tx.yearGroup.create({ data: { name: yearName, curriculumId: curriculum.id } });
    }
  }

  const names = [...(row.skill ? [row.skill] : []), ...(row.skillIds || [])];
  const skills = [];
  for (const value of names) {
    let skill = await tx.skill.findUnique({ where: { id: value } });
    if (!skill || skill.topicId !== topic.id) skill = await tx.skill.findFirst({ where: { topicId: topic.id, name: { equals: value, mode: 'insensitive' } } });
    if (!skill) skill = await tx.skill.create({ data: { name: value, topicId: topic.id } });
    if (!skills.some((existing) => existing.id === skill.id)) skills.push(skill);
  }
  return { subjectId: subject.id, topicId: topic.id, subtopicId: subtopic?.id, yearGroupId: yearGroup?.id, skillIds: skills.map((skill) => skill.id) };
}

async function createQuestion(tx, row) {
  const catalog = await findOrCreateCatalog(tx, row);
  const { subject, topic, category, subtopic, skill, yearGroup, subjectId, topicId, subtopicId, skillIds, yearGroupId, ...question } = row;
  return tx.question.create({ data: { ...question, ...catalog, skills: { create: catalog.skillIds.map((skillId) => ({ skillId })) } } });
}

router.post('/json', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body) || !req.body.length) return res.status(400).json({ error: 'Send a non-empty JSON array of questions.' });
    if (req.body.length > 500) return res.status(400).json({ error: 'Import is limited to 500 questions.' });
    const parsed = req.body.map((value, index) => { const result = item.safeParse(value); return result.success ? { index, data: result.data } : { index, issues: result.error.issues }; });
    const errors = parsed.filter((value) => value.issues);
    if (errors.length) return res.status(400).json({ error: 'Import validation failed.', errors });
    const created = await prisma.$transaction(async (tx) => Promise.all(parsed.map(({ data }) => createQuestion(tx, data))), { maxWait: 10000, timeout: 120000 });
    res.status(201).json({ inserted: created.length, message: 'Questions imported; missing catalog items were created automatically.' });
  } catch (error) { next(error); }
});

const homeworkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().optional(),
  instructions: z.string().optional(),
  subject: z.string().trim().min(1).optional(),
  subjectId: z.string().optional(),
  yearGroup: z.string().trim().min(1).optional(),
  studentIds: z.array(z.string()).min(1),
  questions: z.array(item).min(1).max(500),
}).superRefine((value, ctx) => {
  if (!value.subject && !value.subjectId) ctx.addIssue({ code: 'custom', path: ['subject'], message: 'Provide a subject or subjectId.' });
});

router.post('/homework-json', async (req, res, next) => {
  try {
    const parsed = homeworkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Homework validation failed.', errors: parsed.error.issues });
    const data = parsed.data;
    const students = await prisma.student.findMany({ where: { id: { in: data.studentIds }, familyId: req.auth.familyId }, select: { id: true } });
    if (students.length !== data.studentIds.length) return res.status(403).json({ error: 'Students must belong to your family.' });
    const rows = data.questions.map((question) => ({ ...question, subject: question.subject || data.subject, subjectId: question.subjectId || data.subjectId, yearGroup: question.yearGroup || data.yearGroup }));
    const missingSubject = rows.some((question) => !question.subject && !question.subjectId);
    if (missingSubject) return res.status(400).json({ error: 'Every question needs a subject, or the homework must provide one.' });

    const result = await prisma.$transaction(async (tx) => {
      const createdQuestions = [];
      for (const row of rows) createdQuestions.push(await createQuestion(tx, row));
      const subjectId = createdQuestions[0].subjectId;
      if (createdQuestions.some((question) => question.subjectId !== subjectId)) throw new Error('All questions in one homework must use the same subject.');
      const homework = await tx.homework.create({
        data: {
          title: data.title,
          description: data.description,
          instructions: data.instructions,
          subjectId,
          familyId: req.auth.familyId,
          questions: { create: createdQuestions.map((question, order) => ({ questionId: question.id, order })) },
          assignments: { create: data.studentIds.map((studentId) => ({ studentId })) },
        },
        include: { questions: { include: { question: true }, orderBy: { order: 'asc' } }, assignments: true },
      });
      return homework;
    }, { maxWait: 10000, timeout: 120000 });
    res.status(201).json({ homework: result, importedQuestions: result.questions.length, message: 'Homework imported and assigned successfully.' });
  } catch (error) { next(error); }
});

export default router;
