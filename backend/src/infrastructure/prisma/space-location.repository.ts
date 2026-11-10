import type { SpaceLocation } from "../../domain/space/space.types.js";
import type { SpaceLocationRepository } from "../../application/space/space.repository.js";
import { prisma } from "./prisma-client.js";

function toDomainLocation(location: {
  id: string;
  spaceId: string;
  participantId: string;
  label: string;
  note: string;
  lat: number;
  lng: number;
  createdAt: Date;
  updatedAt: Date;
}): SpaceLocation {
  return {
    id: location.id,
    spaceId: location.spaceId,
    participantId: location.participantId,
    label: location.label,
    note: location.note,
    lat: location.lat,
    lng: location.lng,
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
  };
}

export const prismaSpaceLocationRepository: SpaceLocationRepository = {
  async findById(id) {
    const location = await prisma.spaceLocation.findUnique({ where: { id } });
    return location ? toDomainLocation(location) : null;
  },

  async findByParticipant(participantId) {
    const location = await prisma.spaceLocation.findUnique({ where: { participantId } });
    return location ? toDomainLocation(location) : null;
  },

  async findAllBySpace(spaceId) {
    const locations = await prisma.spaceLocation.findMany({ where: { spaceId } });
    return locations.map(toDomainLocation);
  },

  async create(input) {
    const location = await prisma.spaceLocation.create({
      data: {
        spaceId: input.spaceId,
        participantId: input.participantId,
        label: input.label,
        note: input.note,
        lat: input.lat,
        lng: input.lng,
      },
    });
    return toDomainLocation(location);
  },

  async update(id, input) {
    const existing = await prisma.spaceLocation.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    const location = await prisma.spaceLocation.update({
      where: { id },
      data: { label: input.label, note: input.note, lat: input.lat, lng: input.lng },
    });
    return toDomainLocation(location);
  },

  async delete(id) {
    const existing = await prisma.spaceLocation.findUnique({ where: { id } });
    if (!existing) {
      return false;
    }
    await prisma.spaceLocation.delete({ where: { id } });
    return true;
  },
};
