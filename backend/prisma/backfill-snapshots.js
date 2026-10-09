import '../src/config/env.js';
import { prisma } from '../src/services/database.js';
import { backfillLearningSnapshots } from '../src/services/snapshotBackfill.js';

try {
  const result = await backfillLearningSnapshots();
  console.log(`Backfilled ${result.snapshots} daily snapshots from ${result.attempts} attempts.`);
} finally {
  await prisma.$disconnect();
}
