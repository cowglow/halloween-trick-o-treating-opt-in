import type { SpaceAccessAnswerRepository } from "../../application/space/space.repository.js";
import { prisma } from "./prisma-client.js";

export const prismaSpaceAccessAnswerRepository: SpaceAccessAnswerRepository = {
  async record(input) {
    await prisma.spaceAccessAnswer.create({ data: input });
  },

  async findSince(spaceId, since) {
    const answers = await prisma.spaceAccessAnswer.findMany({
      where: { spaceId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      include: { invite: { select: { usedAt: true, revokedAt: true, expiresAt: true } } },
    });
    return answers.map((answer) => ({
      id: answer.id,
      spaceId: answer.spaceId,
      outcome: answer.outcome === "allowed" ? "allowed" : "denied",
      answeredById: answer.answeredById,
      answeredAt: answer.createdAt.toISOString(),
      invite: answer.invite
        ? {
            usedAt: answer.invite.usedAt?.toISOString() ?? null,
            revokedAt: answer.invite.revokedAt?.toISOString() ?? null,
            expiresAt: answer.invite.expiresAt.toISOString(),
          }
        : null,
    }));
  },
};
