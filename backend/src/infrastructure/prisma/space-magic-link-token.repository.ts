import type { SpaceMagicLinkTokenRepository } from "../../application/space/space.repository.js";
import { prisma } from "./prisma-client.js";
import { toDomainParticipant } from "./space.repository.js";

export const prismaSpaceMagicLinkTokenRepository: SpaceMagicLinkTokenRepository = {
  async create(participantId, tokenHash, expiresAt) {
    await prisma.spaceMagicLinkToken.create({ data: { participantId, tokenHash, expiresAt } });
  },

  async findByHash(tokenHash) {
    const record = await prisma.spaceMagicLinkToken.findUnique({
      where: { tokenHash },
      include: { participant: true },
    });
    if (!record) {
      return null;
    }
    return {
      record: { id: record.id, expiresAt: record.expiresAt, usedAt: record.usedAt },
      participant: toDomainParticipant(record.participant),
    };
  },

  async markUsed(id) {
    await prisma.spaceMagicLinkToken.update({ where: { id }, data: { usedAt: new Date() } });
  },
};
