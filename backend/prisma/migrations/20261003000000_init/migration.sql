-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SpaceRole" AS ENUM ('participant', 'visitor');

-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceParticipant" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SpaceRole" NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceLocation" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceMagicLinkToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceMagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceInvite" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SpaceRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "inviterParticipantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Space_slug_key" ON "Space"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceParticipant_spaceId_email_key" ON "SpaceParticipant"("spaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceLocation_participantId_key" ON "SpaceLocation"("participantId");

-- CreateIndex
CREATE INDEX "SpaceLocation_spaceId_idx" ON "SpaceLocation"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceMagicLinkToken_tokenHash_key" ON "SpaceMagicLinkToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceInvite_tokenHash_key" ON "SpaceInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "SpaceInvite_spaceId_idx" ON "SpaceInvite"("spaceId");

-- CreateIndex
CREATE INDEX "SpaceInvite_email_idx" ON "SpaceInvite"("email");

-- CreateIndex
CREATE INDEX "SpaceInvite_inviterParticipantId_idx" ON "SpaceInvite"("inviterParticipantId");

-- AddForeignKey
ALTER TABLE "SpaceParticipant" ADD CONSTRAINT "SpaceParticipant_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceLocation" ADD CONSTRAINT "SpaceLocation_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceLocation" ADD CONSTRAINT "SpaceLocation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SpaceParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceMagicLinkToken" ADD CONSTRAINT "SpaceMagicLinkToken_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SpaceParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceInvite" ADD CONSTRAINT "SpaceInvite_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceInvite" ADD CONSTRAINT "SpaceInvite_inviterParticipantId_fkey" FOREIGN KEY ("inviterParticipantId") REFERENCES "SpaceParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

