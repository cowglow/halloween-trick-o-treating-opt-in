import type { Mailer } from "../../application/mailer.js";

// Logs the raw link instead of sending real email. Used in dev, and as the
// fallback whenever RESEND_API_KEY/EMAIL_FROM aren't set — see get-mailer.ts.
export const consoleMailer: Mailer = {
  async sendMagicLink(email, url, language) {
    console.log(`[mailer] magic link for ${email} (${language}): ${url}`);
  },

  async sendInvite(email, url, expiresAt, language) {
    console.log(`[mailer] invite for ${email} (${language}, until ${expiresAt.toISOString()}): ${url}`);
  },

  async sendAccessRequestNotice(email, url, language) {
    console.log(`[mailer] access request notice for ${email} (${language}): ${url}`);
  },

  async sendThankYou(email, privacyUrl, deletedAt, replyTo, language) {
    console.log(
      `[mailer] thank-you for ${email} (${language}, deleted ${deletedAt.toISOString()}, reply to ${replyTo}): ${privacyUrl}`,
    );
  },
};
