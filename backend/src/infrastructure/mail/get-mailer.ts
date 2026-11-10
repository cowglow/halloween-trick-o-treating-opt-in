import type { Mailer } from "../../application/mailer.js";
import { consoleMailer } from "./console-mailer.js";
import { resendMailer } from "./resend-mailer.js";

// Picks the real Resend-backed mailer or the console fallback based on whether
// RESEND_API_KEY/EMAIL_FROM are set — independent of NODE_ENV, so local dev needs
// no real email account and a production box with those unset still works, just
// without real email delivery.
export function getMailer(): Mailer {
  return process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? resendMailer : consoleMailer;
}
