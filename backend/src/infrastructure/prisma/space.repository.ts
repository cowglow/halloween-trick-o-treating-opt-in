import type { Space, SpaceParticipant } from "../../domain/space/space.types.js";
import type { SpaceParticipantRepository, SpaceRepository } from "../../application/space/space.repository.js";
import { toLanguage } from "../../domain/i18n/language.js";
import { COMMUNITY } from "../config/community.js";
import { prisma } from "./prisma-client.js";

function toDomainSpace(space: { id: string; slug: string; name: string; createdAt: Date }): Space {
  return { id: space.id, slug: space.slug, name: space.name, createdAt: space.createdAt.toISOString() };
}

export const prismaSpaceRepository: SpaceRepository = {
  async findBySlug(slug) {
    const space = await prisma.space.findUnique({ where: { slug } });
    return space ? toDomainSpace(space) : null;
  },

  async create(input) {
    const space = await prisma.space.create({ data: { slug: input.slug, name: input.name } });
    return toDomainSpace(space);
  },
};

export function toDomainParticipant(participant: {
  id: string;
  spaceId: string;
  email: string;
  role: SpaceParticipant["role"];
  consentAt: Date;
  noticeVersion: string;
  language: string;
  createdAt: Date;
}): SpaceParticipant {
  return {
    id: participant.id,
    spaceId: participant.spaceId,
    email: participant.email,
    role: participant.role,
    consentAt: participant.consentAt.toISOString(),
    noticeVersion: participant.noticeVersion,
    language: toLanguage(participant.language, COMMUNITY.defaultLanguage),
    createdAt: participant.createdAt.toISOString(),
  };
}

export const prismaSpaceParticipantRepository: SpaceParticipantRepository = {
  async findById(id) {
    const participant = await prisma.spaceParticipant.findUnique({ where: { id } });
    return participant ? toDomainParticipant(participant) : null;
  },

  async findByEmail(spaceId, email) {
    const participant = await prisma.spaceParticipant.findUnique({ where: { spaceId_email: { spaceId, email } } });
    return participant ? toDomainParticipant(participant) : null;
  },

  async findRecipientsByRole(spaceId, role) {
    const participants = await prisma.spaceParticipant.findMany({
      where: { spaceId, role },
      select: { email: true, language: true },
    });
    return participants.map((p) => ({ email: p.email, language: toLanguage(p.language, COMMUNITY.defaultLanguage) }));
  },

  async setLanguage(id, language) {
    await prisma.spaceParticipant.update({ where: { id }, data: { language } });
  },

  async findUnthanked(spaceId) {
    const participants = await prisma.spaceParticipant.findMany({
      where: { spaceId, thankedAt: null },
      select: { id: true, email: true, language: true },
      orderBy: { createdAt: "asc" },
    });
    return participants.map((p) => ({ id: p.id, email: p.email, language: toLanguage(p.language, COMMUNITY.defaultLanguage) }));
  },

  async countThanked(spaceId) {
    return prisma.spaceParticipant.count({ where: { spaceId, thankedAt: { not: null } } });
  },

  async markThanked(id, at) {
    await prisma.spaceParticipant.update({ where: { id }, data: { thankedAt: at } });
  },

  async create(input) {
    const participant = await prisma.spaceParticipant.create({
      data: {
        spaceId: input.spaceId,
        email: input.email,
        role: input.role,
        consentAt: input.consentAt,
        noticeVersion: input.noticeVersion,
        language: input.language,
      },
    });
    return toDomainParticipant(participant);
  },

  async deleteCascade(id) {
    const participant = await prisma.spaceParticipant.findUnique({ where: { id }, select: { email: true } });
    if (!participant) return;
    const { email } = participant;
    // One transaction: a crash partway through must not leave a live session or
    // an orphaned pin for a participant whose row is gone (docs/SPEC.md section 2).
    await prisma.$transaction([
      prisma.spaceLocation.deleteMany({ where: { participantId: id } }),
      prisma.spaceMagicLinkToken.deleteMany({ where: { participantId: id } }),
      // Every invite they sent (accepted ones still point at them through
      // the inviter foreign key, which made removal 500) and every invite
      // addressed to their email (it would otherwise keep the erased
      // person's address after withdrawal of consent). Invitees they brought
      // in keep their own participant rows - only the invite record goes.
      prisma.spaceInvite.deleteMany({ where: { OR: [{ inviterParticipantId: id }, { email }] } }),
      prisma.spaceAccessRequest.deleteMany({ where: { email } }),
      prisma.spaceParticipant.delete({ where: { id } }),
    ]);
  },
};
