// The one place concrete infrastructure gets wired into the application/ports
// layers — everything else in this codebase depends on interfaces, not on Prisma,
// jsonwebtoken, or Resend directly. See docs/CLEAR_ARCHITECTURE_TS.md.
import type { AppDeps } from "./ports/http/app.js";
import { getMailer } from "./infrastructure/mail/get-mailer.js";
import { randomTokenGenerator } from "./infrastructure/auth/token-generator.js";
import { createRequireSpaceAuth } from "./ports/http/middleware/require-space-auth.js";
import { prismaSpaceParticipantRepository, prismaSpaceRepository } from "./infrastructure/prisma/space.repository.js";
import { prismaSpaceMagicLinkTokenRepository } from "./infrastructure/prisma/space-magic-link-token.repository.js";
import { prismaSpaceLocationRepository } from "./infrastructure/prisma/space-location.repository.js";
import { prismaSpaceInviteRepository } from "./infrastructure/prisma/space-invite.repository.js";
import { prismaSpaceAccessRequestRepository } from "./infrastructure/prisma/space-access-request.repository.js";
import { prismaSpaceAccessAnswerRepository } from "./infrastructure/prisma/space-access-answer.repository.js";
import { spaceJwtTokenSigner } from "./infrastructure/auth/space-jwt-token-signer.js";
import { readDate, readNumber } from "./infrastructure/config/env.js";
import { COMMUNITY } from "./infrastructure/config/community.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
// Must match vite.config.ts's `base` (without the trailing slash; the
// links append "/#/..."). Empty: the SPA is served from the root of
// CLIENT_ORIGIN (its own domain, see docs/SELF_HOSTING.md).
const CLIENT_APP_PATH = "";

const DAY_MS = 24 * 60 * 60 * 1000;

// docs/SPEC.md section 2/3: all configurable via env, all with sane defaults so a
// fresh checkout works without setting anything.
const INVITE_TOKEN_TTL_MS = readNumber(process.env, "SPACE_INVITE_TTL_MS", 7 * DAY_MS);
const INVITE_RATE_LIMIT_WINDOW_MS = readNumber(process.env, "SPACE_INVITE_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000);
const INVITE_RATE_LIMIT_MAX = readNumber(process.env, "SPACE_INVITE_RATE_LIMIT_MAX", 10);
const INVITE_MAX_PER_PARTICIPANT = readNumber(process.env, "SPACE_INVITE_MAX_PER_PARTICIPANT", 50);
// Usually midnight after Halloween (docs/SPEC.md section 3): community.json's
// eventEndAt, unless EVENT_END_AT overrides it.
const EVENT_END_AT = readDate(process.env, "EVENT_END_AT", COMMUNITY.eventEndAt);

export function buildAppDeps(): AppDeps {
  return {
    mailer: getMailer(),
    tokenGenerator: randomTokenGenerator,
    clientOrigin: CLIENT_ORIGIN,
    clientAppPath: CLIENT_APP_PATH,
    isDevMode: process.env.NODE_ENV !== "production",
    requireSpaceAuth: createRequireSpaceAuth(spaceJwtTokenSigner, prismaSpaceParticipantRepository),
    spaceRepository: prismaSpaceRepository,
    spaceParticipantRepository: prismaSpaceParticipantRepository,
    spaceMagicLinkTokenRepository: prismaSpaceMagicLinkTokenRepository,
    spaceLocationRepository: prismaSpaceLocationRepository,
    spaceInviteRepository: prismaSpaceInviteRepository,
    spaceAccessRequestRepository: prismaSpaceAccessRequestRepository,
    spaceAccessAnswerRepository: prismaSpaceAccessAnswerRepository,
    spaceTokenSigner: spaceJwtTokenSigner,
    inviteTokenTtlMs: INVITE_TOKEN_TTL_MS,
    inviteRateLimitWindowMs: INVITE_RATE_LIMIT_WINDOW_MS,
    inviteRateLimitMax: INVITE_RATE_LIMIT_MAX,
    inviteMaxPerParticipant: INVITE_MAX_PER_PARTICIPANT,
    eventEndAt: EVENT_END_AT,
  };
}
