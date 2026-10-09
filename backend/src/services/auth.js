import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const TOKEN_TTL = '8h';
export async function hashPassword(password) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password, hash) { return bcrypt.compare(password, hash); }
export function createToken(user) { return jwt.sign({ sub: user.id, role: user.role, familyId: user.familyId, studentId: user.student?.id ?? null }, env.JWT_SECRET, { expiresIn: TOKEN_TTL }); }
export function verifyToken(token) { return jwt.verify(token, env.JWT_SECRET); }
export function publicUser(user) { return { id: user.id, email: user.email, firstName: user.firstName, role: user.role, familyId: user.familyId, studentId: user.student?.id ?? null, mustChangePassword: user.mustChangePassword ?? false }; }
