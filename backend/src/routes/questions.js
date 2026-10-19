import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth, requireRole('PARENT'));
const types = ['MULTIPLE_CHOICE', 'TYPED_ANSWER', 'NUMERIC', 'TRUE_FALSE', 'MULTI_SELECT', 'WRITTEN', 'READING_COMPREHENSION', 'MULTI_PART'];
const schema = z.object({ subjectId: z.string(), topicId: z.string(), subtopicId: z.string().optional(), yearGroupId: z.string().optional(), type: z.enum(types), text: z.string().min(1), correctAnswer: z.any(), options: z.any().optional(), explanation: z.string().optional(), hint: z.string().optional(), difficulty: z.number().int().min(1).max(5), points: z.number().int().min(1).default(1), skillIds: z.array(z.string()).default([]) });

r.get('/', async (req, res, next) => {
  try {
    const questions = await prisma.question.findMany({ where: { subjectId: req.query.subjectId || undefined, topicId: req.query.topicId || undefined, difficulty: req.query.difficulty ? Number(req.query.difficulty) : undefined, type: req.query.type || undefined, isActive: req.query.includeInactive === 'true' ? undefined : true }, include: { subject: true, topic: true, subtopic: true, yearGroup: true, skills: { include: { skill: true } } }, orderBy: [{ subject: { name: 'asc' } }, { topic: { name: 'asc' } }, { difficulty: 'asc' }, { updatedAt: 'desc' }] });
    res.json({ questions });
  } catch (e) { next(e); }
});

r.get('/history', async (req, res, next) => {
  try {
    const studentIds = String(req.query.studentIds || '').split(',').filter(Boolean);
    if (!studentIds.length) return res.json({ history: {} });
    const students = await prisma.student.findMany({ where: { id: { in: studentIds }, familyId: req.auth.familyId }, select: { id: true } });
    if (students.length !== studentIds.length) return res.status(403).json({ error: 'Students must belong to your family.' });
    const [answers, attempts] = await Promise.all([
      prisma.homeworkAnswer.findMany({ where: { assignment: { studentId: { in: studentIds } } }, select: { questionId: true, isCorrect: true, answeredAt: true } }),
      prisma.attempt.findMany({ where: { studentId: { in: studentIds } }, select: { questionId: true, isCorrect: true, createdAt: true } }),
    ]);
    const history = new Map();
    [...answers.map((row) => ({ ...row, date: row.answeredAt })), ...attempts.map((row) => ({ ...row, date: row.createdAt }))].forEach((row) => {
      const previous = history.get(row.questionId);
      if (!previous || row.date > previous.date) history.set(row.questionId, { status: row.isCorrect ? 'CORRECT' : 'INCORRECT', date: row.date });
    });
    res.json({ history: Object.fromEntries([...history.entries()].map(([id, value]) => [id, value.status])) });
  } catch (e) { next(e); }
});

r.post('/select', async (req, res, next) => {
  try {
    const input = z.object({ subjectId: z.string(), topicIds: z.array(z.string()).default([]), count: z.number().int().min(1).max(500), studentIds: z.array(z.string()).min(1) }).parse(req.body);
    const students = await prisma.student.findMany({ where: { id: { in: input.studentIds }, familyId: req.auth.familyId }, select: { id: true } });
    if (students.length !== input.studentIds.length) return res.status(403).json({ error: 'Students must belong to your family.' });
    const candidates = await prisma.question.findMany({ where: { subjectId: input.subjectId, topicId: input.topicIds.length ? { in: input.topicIds } : undefined, isActive: true }, include: { subject: true, topic: true, subtopic: true, yearGroup: true, skills: { include: { skill: true } } } });
    const ids = candidates.map((question) => question.id);
    const [answers, attempts] = await Promise.all([
      prisma.homeworkAnswer.findMany({ where: { questionId: { in: ids }, assignment: { studentId: { in: input.studentIds } } }, select: { questionId: true, isCorrect: true, answeredAt: true } }),
      prisma.attempt.findMany({ where: { questionId: { in: ids }, studentId: { in: input.studentIds } }, select: { questionId: true, isCorrect: true, createdAt: true } }),
    ]);
    const history = new Map();
    [...answers.map((row) => ({ ...row, date: row.answeredAt })), ...attempts.map((row) => ({ ...row, date: row.createdAt }))].forEach((row) => {
      const previous = history.get(row.questionId);
      if (!previous || row.date > previous.date) history.set(row.questionId, { status: row.isCorrect ? 'CORRECT' : 'INCORRECT', date: row.date });
    });
    const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, Math.min(input.count, candidates.length));
    res.json({ questions: shuffled, available: candidates.length, selected: shuffled.length, history: Object.fromEntries([...history.entries()].map(([id, value]) => [id, value.status])) });
  } catch (e) { if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid question selection.', details: e.issues }); next(e); }
});

r.post('/', async (req, res, next) => { try { const x = schema.parse(req.body); const { skillIds, ...questionData } = x; const q = await prisma.question.create({ data: { ...questionData, skills: { create: skillIds.map((skillId) => ({ skillId })) } } }); res.status(201).json({ question: q }); } catch (e) { if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid question data.', details: e.issues }); next(e); } });
r.post('/bulk-delete', async (req, res, next) => {
  try {
    const input = z.object({ questionIds: z.array(z.string()).min(1), force: z.boolean().default(false) }).parse(req.body);
    const questions = await prisma.question.findMany({ where: { id: { in: input.questionIds } }, include: { homeworkQuestions: true, homeworkAnswers: true, attempts: true } });
    const removable = questions.filter((q) => !q.homeworkQuestions.length && !q.homeworkAnswers.length && !q.attempts.length);
    const protectedQuestions = questions.filter((q) => !removable.includes(q));
    if (!input.force && protectedQuestions.length) return res.status(409).json({ error: `${protectedQuestions.length} question(s) are used by learning history.`, deleted: 0, protectedIds: protectedQuestions.map((q) => q.id), canForce: true });
    if (removable.length) await prisma.question.deleteMany({ where: { id: { in: removable.map((q) => q.id) } } });
    if (input.force && protectedQuestions.length) {
      for (const question of protectedQuestions) {
        const snapshot = { id: question.id, text: question.text, type: question.type, correctAnswer: question.correctAnswer, options: question.options, explanation: question.explanation, difficulty: question.difficulty, points: question.points };
        await prisma.homeworkAnswer.updateMany({ where: { questionId: question.id }, data: { questionSnapshot: snapshot, questionId: null } });
        await prisma.attempt.updateMany({ where: { questionId: question.id }, data: { questionSnapshot: snapshot, questionId: null } });
        await prisma.homeworkQuestion.deleteMany({ where: { questionId: question.id } });
        await prisma.question.delete({ where: { id: question.id } });
      }
    }
    res.json({ deleted: removable.length + (input.force ? protectedQuestions.length : 0), disabled: 0, message: input.force ? 'Selected questions permanently deleted; historical answers and attempts were preserved.' : 'Questions deleted.' });
  } catch (e) { if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid bulk question action.' }); next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    const question = await prisma.question.findUnique({ where: { id: req.params.id }, include: { homeworkQuestions: true, homeworkAnswers: true, attempts: true } });
    if (!question) return res.status(404).json({ error: 'Question not found.' });
    if (question.homeworkQuestions.length || question.homeworkAnswers.length || question.attempts.length) return res.status(409).json({ error: 'This question is used by homework or learning history and cannot be deleted. Disable it instead.', canDisable: true });
    await prisma.question.delete({ where: { id: question.id } });
    res.json({ message: 'Question deleted.' });
  } catch (e) { next(e); }
});

r.patch('/:id', async (req, res, next) => { try { const data = z.object({ isActive: z.boolean().optional(), text: z.string().min(1).optional(), explanation: z.string().optional(), hint: z.string().optional(), options: z.any().optional(), correctAnswer: z.any().optional(), difficulty: z.number().int().min(1).max(5).optional() }).parse(req.body); const q = await prisma.question.update({ where: { id: req.params.id }, data }); res.json({ question: q }); } catch (e) { if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid question update.', details: e.issues }); next(e); } });
export default r;
