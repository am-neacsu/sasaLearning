import { Router } from 'express';
import { checkDatabase } from '../services/database.js';
const router = Router();
router.get('/', (_req, res) => res.json({ status: 'ok', service: 'learning-platform-api', timestamp: new Date().toISOString() }));
router.get('/database', async (_req, res) => { try { await checkDatabase(); res.json({ status: 'ok', database: 'connected' }); } catch { res.status(503).json({ status: 'error', database: 'unavailable' }); } });
export default router;
