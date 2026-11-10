import type { Language } from "../domain/i18n/language.js";

// Every email is written in the recipient's language, as far as it's known
// (see docs/WORKLOG.md 2026-10-26, "Emails in en/de/es").
export interface Mailer {
  sendMagicLink(email: string, url: string, language: Language): Promise<void>;
  // Invites outlive sign-in links by days (SPACE_INVITE_TTL_MS), so they get
  // their own text with the actual expiry.
  sendInvite(email: string, url: string, expiresAt: Date, language: Language): Promise<void>;
  // To a participant: someone asked to join, open the map to answer. Carries
  // nothing the requester typed.
  sendAccessRequestNotice(email: string, url: string, language: Language): Promise<void>;
  // The one-off thank-you on Halloween (prisma/thank-space.ts), sent before
  // the data is deleted at `deletedAt`, with a link to the privacy notice;
  // replies go to `replyTo`.
  sendThankYou(email: string, privacyUrl: string, deletedAt: Date, replyTo: string, language: Language): Promise<void>;
}
