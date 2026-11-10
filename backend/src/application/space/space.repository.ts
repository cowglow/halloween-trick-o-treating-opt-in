import type { Space, SpaceAccessAnswer, SpaceAccessRequest, SpaceInvite, SpaceLocation, SpaceParticipant, SpaceRole } from "../../domain/space/space.types.js";
import type { MagicLinkTokenRecord } from "../../domain/auth/magic-link.js";
import type { Language } from "../../domain/i18n/language.js";

export interface SpaceRepository {
  findBySlug(slug: string): Promise<Space | null>;
  // Only used by the seed script now - there's no public self-serve "create a
  // space" endpoint any more (docs/SPEC.md section 2: "NO public access").
  create(input: { slug: string; name: string }): Promise<Space>;
}

export interface SpaceParticipantRepository {
  findById(id: string): Promise<SpaceParticipant | null>;
  findByEmail(spaceId: string, email: string): Promise<SpaceParticipant | null>;
  // Who to tell about a new access request, and in which language.
  findRecipientsByRole(spaceId: string, role: SpaceRole): Promise<{ email: string; language: Language }[]>;
  setLanguage(id: string, language: Language): Promise<void>;
  // The thank-you email (prisma/thank-space.ts): everyone not thanked yet,
  // how many already were, and marking one as thanked once it's sent.
  findUnthanked(spaceId: string): Promise<{ id: string; email: string; language: Language }[]>;
  countThanked(spaceId: string): Promise<number>;
  markThanked(id: string, at: Date): Promise<void>;
  create(input: {
    spaceId: string;
    email: string;
    role: SpaceRole;
    consentAt: Date;
    noticeVersion: string;
    language: Language;
  }): Promise<SpaceParticipant>;
  // "Remove me" (docs/SPEC.md section 2): deletes the participant row itself plus
  // everything that depends on it - their pin, their sign-in sessions, every
  // invite they sent (accepted ones too: they reference the inviter by foreign
  // key), and every invite addressed to their email (erasure must not leave
  // their address behind), plus any access request from that address. One transaction so a crash
  // mid-delete can't leave an orphaned pin or a live session for a deleted account.
  deleteCascade(id: string): Promise<void>;
}

export interface SpaceLocationRepository {
  findById(id: string): Promise<SpaceLocation | null>;
  findByParticipant(participantId: string): Promise<SpaceLocation | null>;
  findAllBySpace(spaceId: string): Promise<SpaceLocation[]>;
  create(input: {
    spaceId: string;
    participantId: string;
    label: string;
    note: string;
    lat: number;
    lng: number;
  }): Promise<SpaceLocation>;
  update(id: string, input: { label: string; note: string; lat: number; lng: number }): Promise<SpaceLocation | null>;
  delete(id: string): Promise<boolean>;
}

// Sign-in tokens, keyed to a SpaceParticipant. The rules (hashToken,
// isTokenUsable, TOKEN_TTL_MS) live in domain/auth/magic-link.ts. Sign-in
// only, not sign-up - see space.use-cases.ts's requestSpaceMagicLink.
export interface SpaceMagicLinkTokenRepository {
  create(participantId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByHash(tokenHash: string): Promise<{ record: MagicLinkTokenRecord; participant: SpaceParticipant } | null>;
  markUsed(id: string): Promise<void>;
}

export interface SpaceInviteRepository {
  findById(id: string): Promise<SpaceInvite | null>;
  findByTokenHash(tokenHash: string): Promise<SpaceInvite | null>;
  // Leaves out erased invites.
  findAllByInviter(inviterParticipantId: string): Promise<SpaceInvite[]>;
  create(input: {
    spaceId: string;
    email: string;
    role: SpaceRole;
    tokenHash: string;
    inviterParticipantId: string;
    expiresAt: Date;
  }): Promise<SpaceInvite>;
  markUsed(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
  // Erases the address and hides the invite from findAllByInviter; the row
  // stays for countByInviter (see SpaceInvite.deletedAt in schema.prisma).
  erase(id: string): Promise<void>;
  // Rate limiting/capping (docs/SPEC.md section 2: "rate-limited per inviter, capped
  // total per participant") - both counts are scoped to invites *sent by* the
  // given participant, `since` bounding the rate-limit window and left undefined
  // for the lifetime cap.
  countByInviter(inviterParticipantId: string, since?: Date): Promise<number>;
}

export interface SpaceAccessRequestRepository {
  findById(id: string): Promise<SpaceAccessRequest | null>;
  findAllBySpace(spaceId: string): Promise<SpaceAccessRequest[]>;
  countBySpace(spaceId: string): Promise<number>;
  // false when this email already has a request waiting for this space.
  createIfAbsent(input: {
    spaceId: string;
    email: string;
    message: string;
    noticeVersion: string;
    language: Language;
  }): Promise<boolean>;
  delete(id: string): Promise<void>;
}

export interface SpaceAccessAnswerRepository {
  record(input: {
    spaceId: string;
    outcome: "allowed" | "denied";
    answeredById: string;
    inviteId: string | null;
  }): Promise<void>;
  // Newest first.
  findSince(spaceId: string, since: Date): Promise<SpaceAccessAnswer[]>;
}
