// Mirrors backend/src/domain/space/space.types.ts - this is a separate package
// from the backend (see CLAUDE.md), so, like every other domain type in this
// app, it's duplicated rather than shared.

export type SpaceRole = "participant" | "visitor";

export type Space = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
};

export type SpaceParticipant = {
  id: string;
  spaceId: string;
  email: string;
  role: SpaceRole;
};

// One per participant (docs/SPEC.md section 1: "one entry per participant").
export type SpaceLocation = {
  id: string;
  spaceId: string;
  participantId: string;
  label: string;
  note: string;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
};
