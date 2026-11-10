-- AlterTable
ALTER TABLE "SpaceAccessRequest" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "SpaceParticipant" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';
