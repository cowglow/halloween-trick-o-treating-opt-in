import type { SpaceInvite } from "../../domain/space/space.types.js";
import type { SpaceInviteRepository } from "../../application/space/space.repository.js";
import { prisma } from "./prisma-client.js";

function toDomainInvite(invite: {
  id: string;
  spaceId: string;
  email: string;
  role: SpaceInvite["role"];
  tokenHash: string;
  inviterParticipantId: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}): SpaceInvite {
  return {
    id: invite.id,
    spaceId: invite.spaceId,
    email: invite.email,
    role: invite.role,
    tokenHash: invite.tokenHash,
    inviterParticipantId: invite.inviterParticipantId,
    expiresAt: invite.expiresAt.toISOString(),
    usedAt: invite.usedAt ? invite.usedAt.toISOString() : null,
    revokedAt: invite.revokedAt ? invite.revokedAt.toISOString() : null,
    deletedAt: invite.deletedAt ? invite.deletedAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
  };
}

export const prismaSpaceInviteRepository: SpaceInviteRepository = {
  async findById(id) {
    const invite = await prisma.spaceInvite.findUnique({ where: { id } });
    return invite ? toDomainInvite(invite) : null;
  },

  async findByTokenHash(tokenHash) {
    const invite = await prisma.spaceInvite.findUnique({ where: { tokenHash } });
    return invite ? toDomainInvite(invite) : null;
  },

  async findAllByInviter(inviterParticipantId) {
    const invites = await prisma.spaceInvite.findMany({
      where: { inviterParticipantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return invites.map(toDomainInvite);
  },

  async create(input) {
    const invite = await prisma.spaceInvite.create({
      data: {
        spaceId: input.spaceId,
        email: input.email,
        role: input.role,
        tokenHash: input.tokenHash,
        inviterParticipantId: input.inviterParticipantId,
        expiresAt: input.expiresAt,
      },
    });
    return toDomainInvite(invite);
  },

  async markUsed(id) {
    await prisma.spaceInvite.update({ where: { id }, data: { usedAt: new Date() } });
  },

  async revoke(id) {
    await prisma.spaceInvite.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  async erase(id) {
    await prisma.spaceInvite.update({ where: { id }, data: { email: "", deletedAt: new Date() } });
  },

  async countByInviter(inviterParticipantId, since) {
    return prisma.spaceInvite.count({
      where: { inviterParticipantId, ...(since ? { createdAt: { gte: since } } : {}) },
    });
  },
};
