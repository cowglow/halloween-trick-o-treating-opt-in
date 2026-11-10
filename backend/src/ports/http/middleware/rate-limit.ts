import rateLimit from "express-rate-limit";

// /spaces/:slug/magic-link sends a real email per request - without a limit,
// one IP can spam an arbitrary inbox with sign-in links or burn through the
// Resend quota. Keyed by IP rather than the submitted email, since the email
// itself isn't authenticated yet at this point in the flow. 20, not something
// tighter like 5: neighbors share home NATs and may all sign in around the same
// time, and a limit that fails legitimate use is a worse outage than the abuse
// it's meant to stop.
export const spaceMagicLinkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login link requests. Please wait a few minutes and try again." },
});

// Defense in depth on top of the per-inviter window/lifetime caps enforced in
// space.use-cases.ts's inviteParticipant (which is the authoritative check,
// since it's keyed by participant rather than IP) - this stops raw request
// flooding against the endpoint regardless of whether a request even carries a
// valid session.
export const spaceInviteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many invites sent. Please wait a few minutes and try again." },
});

// /spaces/:slug/invites/:token/accept has no session yet. Invite tokens are
// 256 bits of random data (see infrastructure/auth/token-generator.ts), so
// guessing one is infeasible regardless - this exists to slow and surface
// repeated attempts rather than to make brute force merely difficult.
export const spaceInviteAcceptRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

// /spaces/:slug/access-requests has no session. Spam lands in front of every
// participant, so this is per hour rather than per 15 minutes; 20 because,
// as with sign-in, neighbors share home NATs. The participant emails are
// limited separately (one per batch, see requestAccess).
export const spaceAccessRequestRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a while and try again." },
});
