import { vi } from "vitest";
import type { SpaceAccessAnswer, SpaceAccessRequest, SpaceInvite, SpaceLocation, SpaceParticipant, SpaceRole } from "../../domain/space/space.types.js";
import type { MagicLinkTokenRecord } from "../../domain/auth/magic-link.js";
import type { Language } from "../../domain/i18n/language.js";
import type { Mailer } from "../mailer.js";
import type { TokenGenerator } from "../token-generator.js";
import type { SpaceTokenSigner } from "../space-token-signer.js";
import type {
  SpaceAccessAnswerRepository,
  SpaceAccessRequestRepository,
  SpaceInviteRepository,
  SpaceLocationRepository,
  SpaceMagicLinkTokenRepository,
  SpaceParticipantRepository,
} from "./space.repository.js";

// In-memory fakes shared by the use-case tests and the route-level tests
// (ports/http/routes/space.routes.test.ts).

export const SPACE = { id: "space-1", slug: "meckenhausen", name: "Meckenhausen Halloween", createdAt: new Date().toISOString() };

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function makeParticipant(role: SpaceRole, overrides: Partial<SpaceParticipant> = {}): SpaceParticipant {
  return {
    id: nextId("participant"),
    spaceId: SPACE.id,
    email: overrides.email ?? `${role}@example.com`,
    role,
    consentAt: new Date().toISOString(),
    noticeVersion: "2026-09-21",
    language: "en",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export class FakeParticipantRepository implements SpaceParticipantRepository {
  byId = new Map<string, SpaceParticipant>();
  thanked = new Set<string>();

  seed(participant: SpaceParticipant) {
    this.byId.set(participant.id, participant);
    return participant;
  }

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }

  async findByEmail(spaceId: string, email: string) {
    return [...this.byId.values()].find((p) => p.spaceId === spaceId && p.email === email) ?? null;
  }

  async findRecipientsByRole(spaceId: string, role: SpaceRole) {
    return [...this.byId.values()]
      .filter((p) => p.spaceId === spaceId && p.role === role)
      .map((p) => ({ email: p.email, language: p.language }));
  }

  async setLanguage(id: string, language: Language) {
    const participant = this.byId.get(id);
    if (participant) participant.language = language;
  }

  async findUnthanked(spaceId: string) {
    return [...this.byId.values()]
      .filter((p) => p.spaceId === spaceId && !this.thanked.has(p.id))
      .map((p) => ({ id: p.id, email: p.email, language: p.language }));
  }

  async countThanked(spaceId: string) {
    return [...this.byId.values()].filter((p) => p.spaceId === spaceId && this.thanked.has(p.id)).length;
  }

  async markThanked(id: string) {
    this.thanked.add(id);
  }

  async create(input: {
    spaceId: string;
    email: string;
    role: SpaceRole;
    consentAt: Date;
    noticeVersion: string;
    language: Language;
  }) {
    const participant: SpaceParticipant = {
      id: nextId("participant"),
      spaceId: input.spaceId,
      email: input.email,
      role: input.role,
      consentAt: input.consentAt.toISOString(),
      noticeVersion: input.noticeVersion,
      language: input.language,
      createdAt: new Date().toISOString(),
    };
    this.byId.set(participant.id, participant);
    return participant;
  }

  async deleteCascade(id: string) {
    this.byId.delete(id);
  }
}

export class FakeLocationRepository implements SpaceLocationRepository {
  byId = new Map<string, SpaceLocation>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }

  async findByParticipant(participantId: string) {
    return [...this.byId.values()].find((l) => l.participantId === participantId) ?? null;
  }

  async findAllBySpace(spaceId: string) {
    return [...this.byId.values()].filter((l) => l.spaceId === spaceId);
  }

  async create(input: { spaceId: string; participantId: string; label: string; note: string; lat: number; lng: number }) {
    const location: SpaceLocation = {
      id: nextId("location"),
      spaceId: input.spaceId,
      participantId: input.participantId,
      label: input.label,
      note: input.note,
      lat: input.lat,
      lng: input.lng,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.byId.set(location.id, location);
    return location;
  }

  async update(id: string, input: { label: string; note: string; lat: number; lng: number }) {
    const existing = this.byId.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
    this.byId.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    return this.byId.delete(id);
  }
}

export class FakeInviteRepository implements SpaceInviteRepository {
  byId = new Map<string, SpaceInvite>();

  seed(invite: SpaceInvite) {
    this.byId.set(invite.id, invite);
    return invite;
  }

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }

  async findByTokenHash(tokenHash: string) {
    return [...this.byId.values()].find((i) => i.tokenHash === tokenHash) ?? null;
  }

  async findAllByInviter(inviterParticipantId: string) {
    return [...this.byId.values()].filter((i) => i.inviterParticipantId === inviterParticipantId && !i.deletedAt);
  }

  async create(input: {
    spaceId: string;
    email: string;
    role: SpaceRole;
    tokenHash: string;
    inviterParticipantId: string;
    expiresAt: Date;
  }) {
    const invite: SpaceInvite = {
      id: nextId("invite"),
      spaceId: input.spaceId,
      email: input.email,
      role: input.role,
      tokenHash: input.tokenHash,
      inviterParticipantId: input.inviterParticipantId,
      expiresAt: input.expiresAt.toISOString(),
      usedAt: null,
      revokedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.byId.set(invite.id, invite);
    return invite;
  }

  async markUsed(id: string) {
    const invite = this.byId.get(id);
    if (invite) invite.usedAt = new Date().toISOString();
  }

  async revoke(id: string) {
    const invite = this.byId.get(id);
    if (invite) invite.revokedAt = new Date().toISOString();
  }

  async erase(id: string) {
    const invite = this.byId.get(id);
    if (invite) {
      invite.email = "";
      invite.deletedAt = new Date().toISOString();
    }
  }

  async countByInviter(inviterParticipantId: string, since?: Date) {
    return [...this.byId.values()].filter(
      (i) => i.inviterParticipantId === inviterParticipantId && (!since || new Date(i.createdAt) >= since),
    ).length;
  }
}

export class FakeAccessRequestRepository implements SpaceAccessRequestRepository {
  byId = new Map<string, SpaceAccessRequest>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }

  async findAllBySpace(spaceId: string) {
    return [...this.byId.values()].filter((r) => r.spaceId === spaceId);
  }

  async countBySpace(spaceId: string) {
    return (await this.findAllBySpace(spaceId)).length;
  }

  async createIfAbsent(input: {
    spaceId: string;
    email: string;
    message: string;
    noticeVersion: string;
    language: Language;
  }) {
    if ([...this.byId.values()].some((r) => r.spaceId === input.spaceId && r.email === input.email)) return false;
    const request: SpaceAccessRequest = { id: nextId("access-request"), ...input, createdAt: new Date().toISOString() };
    this.byId.set(request.id, request);
    return true;
  }

  async delete(id: string) {
    this.byId.delete(id);
  }
}

export class FakeAccessAnswerRepository implements SpaceAccessAnswerRepository {
  rows: { id: string; spaceId: string; outcome: "allowed" | "denied"; answeredById: string; inviteId: string | null; createdAt: Date }[] =
    [];

  // The invite fake, to report how an allowed request's invite stands.
  constructor(private readonly invites?: FakeInviteRepository) {}

  async record(input: { spaceId: string; outcome: "allowed" | "denied"; answeredById: string; inviteId: string | null }) {
    this.rows.push({ id: nextId("answer"), ...input, createdAt: new Date() });
  }

  async findSince(spaceId: string, since: Date): Promise<SpaceAccessAnswer[]> {
    // Newest first; reversed before the (stable) sort so rows recorded in
    // the same millisecond still come out newest first.
    return [...this.rows]
      .reverse()
      .filter((row) => row.spaceId === spaceId && row.createdAt >= since)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => {
        const invite = row.inviteId ? this.invites?.byId.get(row.inviteId) : undefined;
        return {
          id: row.id,
          spaceId: row.spaceId,
          outcome: row.outcome,
          answeredById: row.answeredById,
          answeredAt: row.createdAt.toISOString(),
          invite: invite ? { usedAt: invite.usedAt, revokedAt: invite.revokedAt, expiresAt: invite.expiresAt } : null,
        };
      });
  }
}

export function fakeMailer(): Mailer {
  return {
    sendMagicLink: vi.fn().mockResolvedValue(undefined),
    sendInvite: vi.fn().mockResolvedValue(undefined),
    sendAccessRequestNotice: vi.fn().mockResolvedValue(undefined),
    sendThankYou: vi.fn().mockResolvedValue(undefined),
  };
}

export function failingMailer(): Mailer {
  const fail = () => vi.fn().mockRejectedValue(new Error("Resend rejected the recipient"));
  return { sendMagicLink: fail(), sendInvite: fail(), sendAccessRequestNotice: fail(), sendThankYou: fail() };
}

export class FakeMagicLinkTokenRepository implements SpaceMagicLinkTokenRepository {
  byHash = new Map<string, { record: MagicLinkTokenRecord; participant: SpaceParticipant }>();

  // Pass the participant fake when the token's participant must be a real row
  // (the route tests need its spaceId); otherwise a bare {id} stub is enough.
  constructor(private readonly participants?: FakeParticipantRepository) {}

  async create(participantId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    this.byHash.set(tokenHash, {
      record: { id: nextId("magic-link"), expiresAt, usedAt: null },
      participant: this.participants?.byId.get(participantId) ?? ({ id: participantId } as SpaceParticipant),
    });
  }

  async findByHash(tokenHash: string) {
    return this.byHash.get(tokenHash) ?? null;
  }

  async markUsed(id: string): Promise<void> {
    for (const entry of this.byHash.values()) {
      if (entry.record.id === id) entry.record.usedAt = new Date();
    }
  }
}

export function fakeTokenGenerator(): TokenGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `token-${n}`;
    },
  };
}

export function fakeSpaceTokenSigner(): SpaceTokenSigner {
  return {
    sign: (payload) => JSON.stringify(payload),
    verify: (token) => JSON.parse(token),
  };
}

