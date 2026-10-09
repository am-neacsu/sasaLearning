import { verifyToken } from '../services/auth.js';
export function requireAuth(req, res, next) {
  const header = req.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.brightpath_token;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try { req.auth = verifyToken(token); next(); } catch { return res.status(401).json({ error: 'Your session has expired. Please sign in again.' }); }
}
export function requireRole(...roles) { return (req, res, next) => roles.includes(req.auth?.role) ? next() : res.status(403).json({ error: 'You do not have permission to access this resource.' }); }
