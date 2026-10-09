import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({ DATABASE_URL: z.string().min(1), PORT: z.coerce.number().default(4000), CLIENT_URL: z.string().default('http://localhost:5173'), JWT_SECRET: z.string().min(32), NODE_ENV: z.enum(['development','test','production']).default('development') });
export const env = schema.parse(process.env);
