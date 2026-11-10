import type { SpaceAccessRequest } from "../../domain/space/space.types.js";
import type { SpaceAccessRequestRepository } from "../../application/space/space.repository.js";
import { toLanguage } from "../../domain/i18n/language.js";
import { COMMUNITY } from "../config/community.js";
import { prisma } from "./prisma-client.js";

function toDomainAccessRequest(request: {
  id: string;
  spaceId: string;
  email: string;
  message: string;
  noticeVersion: string;
  language: string;
  createdAt: Date;
}): SpaceAccessRequest {
  return {
    id: request.id,
    spaceId: request.spaceId,
    email: request.email,
    message: request.message,
    noticeVersion: request.noticeVersion,
    language: toLanguage(request.language, COMMUNITY.defaultLanguage),
    createdAt: request.createdAt.toISOString(),
  };
}

export const prismaSpaceAccessRequestRepository: SpaceAccessRequestRepository = {
  async findById(id) {
    const request = await prisma.spaceAccessRequest.findUnique({ where: { id } });
    return request ? toDomainAccessRequest(request) : null;
  },

  async findAllBySpace(spaceId) {
    const requests = await prisma.spaceAccessRequest.findMany({ where: { spaceId }, orderBy: { createdAt: "asc" } });
    return requests.map(toDomainAccessRequest);
  },

  async countBySpace(spaceId) {
    return prisma.spaceAccessRequest.count({ where: { spaceId } });
  },

  async createIfAbsent(input) {
    // skipDuplicates: the (spaceId, email) unique constraint decides, so two
    // requests racing in for the same address can't both land.
    const { count } = await prisma.spaceAccessRequest.createMany({ data: [input], skipDuplicates: true });
    return count === 1;
  },

  async delete(id) {
    await prisma.spaceAccessRequest.deleteMany({ where: { id } });
  },
};
