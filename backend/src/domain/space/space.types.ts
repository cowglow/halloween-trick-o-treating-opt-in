// Pure types for the Meckenhausen Halloween neighborhood map - see
// backend/prisma/schema.prisma for the persisted shape these mirror. Kept
// framework-free like every other domain type; the Zod schemas live at the
// ports/http boundary (ports/http/validation/space.schemas.ts), not here.

import type { Language } from "../i18n/language.js";

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
  consentAt: string;
  noticeVersion: string;
  language: Language;
  createdAt: string;
};

// One per participant - the schema enforces this with a unique constraint on
// participantId, not just application logic (docs/SPEC.md section 1: "one entry
// per participant").
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

// Someone without an invite asking to join - see SpaceAccessRequest in
// schema.prisma.
export type SpaceAccessRequest = {
  id: string;
  spaceId: string;
  email: string;
  message: string;
  noticeVersion: string;
  language: Language;
  createdAt: string;
};

// What became of a request to join once a participant answered it (see
// SpaceAccessAnswer in schema.prisma). Nothing about who asked: if it was
// allowed, only how the resulting invite stands.
export type SpaceAccessAnswer = {
  id: string;
  spaceId: string;
  outcome: "allowed" | "denied";
  // null once that participant has removed themselves.
  answeredById: string | null;
  answeredAt: string;
  // null when denied, when the person was already on the map (no invite was
  // needed), or once the invite has been deleted.
  invite: { usedAt: string | null; revokedAt: string | null; expiresAt: string } | null;
};

export type SpaceInvite = {
  id: string;
  spaceId: string;
  email: string;
  role: SpaceRole;
  tokenHash: string;
  inviterParticipantId: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
};

// The token payload minted for a participant's session - deliberately shaped
// nothing like application/token-signer.ts's SessionPayload (no accountId,
// memberId) so the two can never be confused for one another even if a
// verify step forgot to check `scope`.
export type SpaceSessionPayload = {
  scope: "space";
  participantId: string;
  spaceId: string;
  email: string;
  role: SpaceRole;
};
