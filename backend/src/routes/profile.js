import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../services/database.js';
const router=Router();
router.get('/parent', requireAuth, requireRole('PARENT'), async (req,res,next)=>{try{const students=await prisma.student.findMany({where:{familyId:req.auth.familyId},select:{id:true,user:{select:{firstName:true,email:true}},yearGroup:{select:{name:true}}}});res.json({students})}catch(e){next(e)}});
router.get('/student', requireAuth, requireRole('STUDENT'), async(req,res,next)=>{try{const student=await prisma.student.findFirst({where:{id:req.auth.studentId,familyId:req.auth.familyId},select:{id:true,user:{select:{firstName:true}},yearGroup:{select:{name:true}}}});res.json({student})}catch(e){next(e)}});
export default router;
