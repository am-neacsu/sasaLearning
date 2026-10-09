-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerificationHash" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);
