import { Resend } from "resend";
import type { Mailer } from "../../application/mailer.js";
import {
  buildAccessRequestNoticeEmail,
  buildInviteEmail,
  buildMagicLinkEmail,
  buildThankYouEmail,
  type Email,
} from "./email-copy.js";

async function send(to: string, { subject, text, html }: Email, replyTo?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM must be set to send email in production");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, text, html, replyTo });
  if (error) {
    throw new Error(`Resend failed to send "${subject}" email: ${error.message}`);
  }
}

// Real email delivery via Resend (resend.com). Isolated behind the same Mailer
// interface as consoleMailer so the provider can be swapped later without touching
// callers — see get-mailer.ts for how the two are selected.
export const resendMailer: Mailer = {
  async sendMagicLink(email, url, language) {
    await send(email, buildMagicLinkEmail(url, language));
  },

  async sendInvite(email, url, expiresAt, language) {
    await send(email, buildInviteEmail(url, expiresAt, language));
  },

  async sendAccessRequestNotice(email, url, language) {
    await send(email, buildAccessRequestNoticeEmail(url, language));
  },

  async sendThankYou(email, privacyUrl, deletedAt, replyTo, language) {
    await send(email, buildThankYouEmail(privacyUrl, deletedAt, language), replyTo);
  },
};
