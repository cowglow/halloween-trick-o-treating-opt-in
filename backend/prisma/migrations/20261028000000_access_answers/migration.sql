-- CreateTable
CREATE TABLE "SpaceAccessAnswer" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "answeredById" TEXT,
    "inviteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceAccessAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpaceAccessAnswer_spaceId_createdAt_idx" ON "SpaceAccessAnswer"("spaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "SpaceAccessAnswer" ADD CONSTRAINT "SpaceAccessAnswer_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceAccessAnswer" ADD CONSTRAINT "SpaceAccessAnswer_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "SpaceParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceAccessAnswer" ADD CONSTRAINT "SpaceAccessAnswer_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "SpaceInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
