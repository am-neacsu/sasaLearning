import { Router } from 'express';
import { prisma } from '../services/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { masteryBand } from '../services/mastery.js';

const router = Router();
router.use(requireAuth, requireRole('PARENT'));

router.get('/students/:studentId/progress', async (req, res, next) => {
  try {
    const student = await prisma.student.findFirst({
      where: { id: req.params.studentId, familyId: req.auth.familyId },
      include: {
        user: { select: { firstName: true } },
        yearGroup: true,
        mastery: { include: { skill: { include: { topic: { include: { subject: true } } } } }, orderBy: { score: 'asc' } },
        assignments: { include: { homework: { include: { subject: true } }, answers: true }, orderBy: { id: 'desc' }, take: 20 }
      }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({
      student: { id: student.id, firstName: student.user.firstName, yearGroup: student.yearGroup?.name, points: student.points, streak: student.currentStreak },
      skills: student.mastery.map(m => ({ ...m, band: masteryBand(m.score) })),
      assignments: student.assignments
    });
  } catch (error) { next(error); }
});

router.get('/homework/:id/results', async (req, res, next) => {
  try {
    const homework = await prisma.homework.findFirst({
      where: { id: req.params.id, familyId: req.auth.familyId },
      include: {
        subject: true,
        questions: { include: { question: true }, orderBy: { order: 'asc' } },
        assignments: { include: { student: { include: { user: { select: { firstName: true } } } }, answers: true } }
      }
    });
    if (!homework) return res.status(404).json({ error: 'Homework not found' });
    res.json({ homework });
  } catch (error) { next(error); }
});

export default router;
