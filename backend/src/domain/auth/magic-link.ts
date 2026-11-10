import { createHash } from "node:crypto";

export const TOKEN_TTL_MS = 15 * 60 * 1000;

// Deterministic given the token — a magic link is identified by the hash of its
// token, not the token itself (the raw token is never stored). Generating the
// random token in the first place is an infrastructure concern (it depends on a
// source of randomness); hashing it is a pure domain rule.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type MagicLinkTokenRecord = {
  id: string;
  expiresAt: Date;
  usedAt: Date | null;
};

// A magic link is usable exactly once, within its TTL. This is the whole business
// rule "consuming" a token has to check — kept here, pure, so it's testable and
// reusable without a database.
export function isTokenUsable(record: MagicLinkTokenRecord, now: Date): boolean {
  return record.usedAt === null && record.expiresAt >= now;
}
