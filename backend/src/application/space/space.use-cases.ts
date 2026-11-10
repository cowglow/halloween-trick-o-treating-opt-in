import { hashToken, isTokenUsable, TOKEN_TTL_MS } from "../../domain/auth/magic-link.js";
import type {
  Space,
  SpaceAccessRequest,
  SpaceInvite,
  SpaceLocation,
  SpaceParticipant,
  SpaceRole,
} from "../../domain/space/space.types.js";
import { LANGUAGES, type Language } from "../../domain/i18n/language.js";
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
  SpaceRepository,
} from "./space.repository.js";
import {
  AccessRequestNotFoundError,
  AlreadyParticipantError,
  ConsentRequiredError,
  DuplicateSpaceSlugError,
  EventEndedError,
  InviteAlreadyUsedError,
  InviteCapExceededError,
  InviteExpiredError,
  InviteNotFoundError,
  InviteOwnershipError,
  InviteRateLimitError,
  InviteRevokedError,
  InviteStillPendingError,
  LocationAlreadyExistsError,
  LocationNotFoundError,
  LocationOwnershipError,
  RoleEscalationError,
  SpaceMailDeliveryError,
} from "./space.errors.js";

// Bumped whenever the privacy notice's substance changes - each participant's
// SpaceParticipant.noticeVersion records which version they consented to
// (docs/SPEC.md section 3). Not env-configurable: it's a fact about the copy in this
// codebase, not a deployment setting.
export const CURRENT_NOTICE_VERSION = "2026-10-30";

export interface CreateSpaceDeps {
  spaceRepository: SpaceRepository;
}

export function createCreateSpaceUseCase(deps: CreateSpaceDeps) {
  return async function createSpace(input: { slug: string; name: string }): Promise<Space> {
    const existing = await deps.spaceRepository.findBySlug(input.slug);
    if (existing) {
      throw new DuplicateSpaceSlugError("A space with that link already exists - pick another name");
    }
    return deps.spaceRepository.create(input);
  };
}

export interface RequestSpaceMagicLinkDeps {
  spaceParticipantRepository: SpaceParticipantRepository;
  spaceMagicLinkTokenRepository: SpaceMagicLinkTokenRepository;
  mailer: Mailer;
  tokenGenerator: TokenGenerator;
  clientOrigin: string;
  clientAppPath: string;
  isDevMode: boolean;
}

// Sign-in only - there is no self-serve sign-up any more (docs/SPEC.md section 2:
// "NO public access... Arrives by invite"). An email with no participant record
// in this space gets the exact same response as one that does, so this endpoint
// can't be used to enumerate who has already joined.
export function createRequestSpaceMagicLinkUseCase(deps: RequestSpaceMagicLinkDeps) {
  return async function requestSpaceMagicLink(
    space: Space,
    email: string,
    language: Language,
  ): Promise<{ message: string; devToken?: string }> {
    const message = "If that email is signed up for this map, a sign-in link has been sent.";

    const participant = await deps.spaceParticipantRepository.findByEmail(space.id, email);
    if (!participant) {
      return { message };
    }
    // The language they use now is the one their emails should be in from
    // here on, including access request notices.
    if (participant.language !== language) {
      await deps.spaceParticipantRepository.setLanguage(participant.id, language);
    }

    const token = deps.tokenGenerator.generate();
    await deps.spaceMagicLinkTokenRepository.create(participant.id, hashToken(token), new Date(Date.now() + TOKEN_TTL_MS));
    const url = `${deps.clientOrigin}${deps.clientAppPath}/#/${space.slug}?token=${token}`;

    try {
      await deps.mailer.sendMagicLink(email, url, language);
    } catch (err) {
      console.error(`[mailer] failed to send space sign-in email to ${email}:`, err);
      // In dev mode there's already a bypass for exactly this situation - the
      // devToken below - so a broken/misconfigured mailer (e.g. Resend
      // refusing an unverified local test address) shouldn't block sign-in.
      // In production there is no such fallback, so a real failure to notify
      // the user must still surface as an error.
      if (!deps.isDevMode) {
        throw new SpaceMailDeliveryError("Couldn't send the sign-in email. Please try again.");
      }
    }

    return { message, ...(deps.isDevMode ? { devToken: token } : {}) };
  };
}

export interface VerifySpaceMagicLinkDeps {
  spaceMagicLinkTokenRepository: SpaceMagicLinkTokenRepository;
  spaceTokenSigner: SpaceTokenSigner;
}

export function createVerifySpaceMagicLinkUseCase(deps: VerifySpaceMagicLinkDeps) {
  return async function verifySpaceMagicLink(
    token: string,
  ): Promise<{ token: string; participant: SpaceParticipant } | null> {
    const found = await deps.spaceMagicLinkTokenRepository.findByHash(hashToken(token));
    if (!found || !isTokenUsable(found.record, new Date())) {
      return null;
    }

    await deps.spaceMagicLinkTokenRepository.markUsed(found.record.id);
    const session = deps.spaceTokenSigner.sign({
      scope: "space",
      participantId: found.participant.id,
      spaceId: found.participant.spaceId,
      email: found.participant.email,
      role: found.participant.role,
    });
    return { token: session, participant: found.participant };
  };
}

export interface InviteParticipantDeps {
  spaceParticipantRepository: SpaceParticipantRepository;
  spaceInviteRepository: SpaceInviteRepository;
  mailer: Mailer;
  tokenGenerator: TokenGenerator;
  clientOrigin: string;
  clientAppPath: string;
  isDevMode: boolean;
  // docs/SPEC.md section 2: "expire (configurable, default 7 days)... rate-limited
  // per inviter, capped total per participant (configurable)".
  inviteTokenTtlMs: number;
  inviteRateLimitWindowMs: number;
  inviteRateLimitMax: number;
  inviteMaxPerParticipant: number;
  // Everything is deleted then, so no invite may claim to outlive it.
  eventEndAt: Date;
}

export function createInviteParticipantUseCase(deps: InviteParticipantDeps) {
  const sendInvite = createSendInvite(deps);
  return async function inviteParticipant(
    space: Space,
    inviter: SpaceParticipant,
    input: { email: string; role: SpaceRole; language: Language },
  ): Promise<{ message: string; devToken?: string }> {
    // The invite's id stays inside: telling the inviter whether one was
    // created would tell them whether that email is already on the map.
    const { inviteId: _inviteId, ...result } = await sendInvite(space, inviter, input);
    return result;
  };
}

// inviteParticipant, plus the new invite's id (none when the email was
// already on the map), for allowAccessRequest to record.
function createSendInvite(deps: InviteParticipantDeps) {
  return async function sendInvite(
    space: Space,
    inviter: SpaceParticipant,
    // language: what the email is written in - the inviter's, or for an
    // allowed request, the requester's.
    input: { email: string; role: SpaceRole; language: Language },
  ): Promise<{ message: string; devToken?: string; inviteId?: string }> {
    // Defense in depth beyond requireSpaceRole("participant") at the route level
    // (this repo's convention: the frontend/route gate is UX, not the boundary).
    // A visitor can never invite, so there is no role above "participant" one
    // could escalate to - both invitable roles are at or below the inviter's own.
    if (inviter.role !== "participant") {
      throw new RoleEscalationError("Only a participant can send invites");
    }

    const rateLimitSince = new Date(Date.now() - deps.inviteRateLimitWindowMs);
    const recentCount = await deps.spaceInviteRepository.countByInviter(inviter.id, rateLimitSince);
    if (recentCount >= deps.inviteRateLimitMax) {
      throw new InviteRateLimitError("You're sending invites too fast - please wait a bit and try again");
    }

    const lifetimeCount = await deps.spaceInviteRepository.countByInviter(inviter.id);
    if (lifetimeCount >= deps.inviteMaxPerParticipant) {
      throw new InviteCapExceededError("You've reached the limit of invites you can send for this map");
    }

    const message = "If that invite can be sent, it has been.";

    // An email already signed up for this space gets the same generic response
    // rather than a distinct "already a participant" error - same
    // anti-enumeration reasoning as requestSpaceMagicLink, just from the
    // inviter's side instead of the invitee's.
    const existingParticipant = await deps.spaceParticipantRepository.findByEmail(space.id, input.email);
    if (existingParticipant) {
      return { message };
    }

    const token = deps.tokenGenerator.generate();
    const expiresAt = new Date(Math.min(Date.now() + deps.inviteTokenTtlMs, deps.eventEndAt.getTime()));
    const invite = await deps.spaceInviteRepository.create({
      spaceId: space.id,
      email: input.email,
      role: input.role,
      tokenHash: hashToken(token),
      inviterParticipantId: inviter.id,
      expiresAt,
    });
    const url = `${deps.clientOrigin}${deps.clientAppPath}/#/${space.slug}/invite?token=${token}`;

    try {
      await deps.mailer.sendInvite(input.email, url, expiresAt, input.language);
    } catch (err) {
      console.error(`[mailer] failed to send space invite email to ${input.email}:`, err);
      // Same dev-mode fallback as requestSpaceMagicLink above.
      if (!deps.isDevMode) {
        throw new SpaceMailDeliveryError("Couldn't send the invite email. Please try again.");
      }
    }

    return { message, inviteId: invite.id, ...(deps.isDevMode ? { devToken: token } : {}) };
  };
}

export interface RevokeInviteDeps {
  spaceInviteRepository: SpaceInviteRepository;
}

export function createRevokeInviteUseCase(deps: RevokeInviteDeps) {
  return async function revokeInvite(inviteId: string, requesterParticipantId: string): Promise<void> {
    const invite = await deps.spaceInviteRepository.findById(inviteId);
    if (!invite) {
      throw new InviteNotFoundError("Invite not found");
    }
    if (invite.inviterParticipantId !== requesterParticipantId) {
      throw new InviteOwnershipError("You can only revoke invites you sent");
    }
    if (invite.usedAt) {
      throw new InviteAlreadyUsedError("This invite was already accepted and can't be revoked");
    }
    await deps.spaceInviteRepository.revoke(inviteId);
  };
}

export interface DeleteInviteDeps {
  spaceInviteRepository: SpaceInviteRepository;
}

// For a mistyped address: once an invite can no longer be accepted (revoked or
// expired), its sender can erase it from their list.
export function createDeleteInviteUseCase(deps: DeleteInviteDeps) {
  return async function deleteInvite(inviteId: string, requesterParticipantId: string): Promise<void> {
    const invite = await deps.spaceInviteRepository.findById(inviteId);
    if (!invite || invite.deletedAt) {
      throw new InviteNotFoundError("Invite not found");
    }
    if (invite.inviterParticipantId !== requesterParticipantId) {
      throw new InviteOwnershipError("You can only delete invites you sent");
    }
    if (invite.usedAt) {
      throw new InviteAlreadyUsedError("This invite was already accepted and can't be deleted");
    }
    if (!invite.revokedAt && new Date(invite.expiresAt) > new Date()) {
      throw new InviteStillPendingError("Revoke this invite before deleting it");
    }
    await deps.spaceInviteRepository.erase(inviteId);
  };
}

export interface RequestAccessDeps {
  spaceParticipantRepository: SpaceParticipantRepository;
  spaceAccessRequestRepository: SpaceAccessRequestRepository;
  mailer: Mailer;
  clientOrigin: string;
  clientAppPath: string;
}

// Someone without an invite asking to join. The reply is the same whether or
// not the email is already on the map or already waiting, so this can't be
// used to find out who has joined.
export function createRequestAccessUseCase(deps: RequestAccessDeps) {
  return async function requestAccess(
    space: Space,
    input: { email: string; message: string; consent: boolean; language: Language },
  ): Promise<{ message: string }> {
    if (!input.consent) {
      throw new ConsentRequiredError("You must agree to the privacy notice to ask to join");
    }
    const message = "If your request can be passed on, it has been.";

    if (await deps.spaceParticipantRepository.findByEmail(space.id, input.email)) {
      return { message };
    }

    // Participants hear about requests only when the waiting list goes from
    // empty to non-empty: one email per batch, however many requests (or
    // spam) arrive before someone answers.
    const waitingBefore = await deps.spaceAccessRequestRepository.countBySpace(space.id);
    const created = await deps.spaceAccessRequestRepository.createIfAbsent({
      spaceId: space.id,
      email: input.email,
      message: input.message,
      noticeVersion: CURRENT_NOTICE_VERSION,
      language: input.language,
    });
    if (!created || waitingBefore > 0) {
      return { message };
    }

    const url = `${deps.clientOrigin}${deps.clientAppPath}/#/${space.slug}`;
    const recipients = await deps.spaceParticipantRepository.findRecipientsByRole(space.id, "participant");
    const results = await Promise.allSettled(
      recipients.map(({ email, language }) => deps.mailer.sendAccessRequestNotice(email, url, language)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      // The request is stored either way and shows up in the app; a failed
      // notice must not turn into an error for the person asking.
      console.error(`[mailer] ${failed} of ${recipients.length} access request notices failed`);
    }
    return { message };
  };
}

export interface AnswerAccessRequestDeps {
  spaceAccessRequestRepository: SpaceAccessRequestRepository;
  spaceAccessAnswerRepository: SpaceAccessAnswerRepository;
}

async function loadAccessRequest(deps: AnswerAccessRequestDeps, space: Space, approver: SpaceParticipant, id: string) {
  // Same defense in depth as inviteParticipant: the route already requires
  // the participant role.
  if (approver.role !== "participant") {
    throw new RoleEscalationError("Only a participant can answer requests to join");
  }
  const request = await deps.spaceAccessRequestRepository.findById(id);
  if (!request || request.spaceId !== space.id) {
    throw new AccessRequestNotFoundError("Request not found");
  }
  return request;
}

// Any participant can let someone in: it sends a normal invite from them
// (with their rate limit and cap), then the request is gone. What's left is
// an answer record without the email, so the other participants, who got the
// same notice, see that it was handled (listAccessRequests).
export function createAllowAccessRequestUseCase(deps: AnswerAccessRequestDeps & InviteParticipantDeps) {
  const sendInvite = createSendInvite(deps);
  return async function allowAccessRequest(
    space: Space,
    approver: SpaceParticipant,
    id: string,
    role: SpaceRole,
  ): Promise<{ message: string; devToken?: string }> {
    const request = await loadAccessRequest(deps, space, approver, id);
    const { inviteId, ...result } = await sendInvite(space, approver, {
      email: request.email,
      role,
      language: request.language,
    });
    await deps.spaceAccessAnswerRepository.record({
      spaceId: space.id,
      outcome: "allowed",
      answeredById: approver.id,
      inviteId: inviteId ?? null,
    });
    await deps.spaceAccessRequestRepository.delete(request.id);
    return result;
  };
}

// Denying deletes the request; the person asking isn't told.
export function createDenyAccessRequestUseCase(deps: AnswerAccessRequestDeps) {
  return async function denyAccessRequest(space: Space, approver: SpaceParticipant, id: string): Promise<void> {
    const request = await loadAccessRequest(deps, space, approver, id);
    await deps.spaceAccessAnswerRepository.record({
      spaceId: space.id,
      outcome: "denied",
      answeredById: approver.id,
      inviteId: null,
    });
    await deps.spaceAccessRequestRepository.delete(request.id);
  };
}

// How long an answered request stays visible to the other participants.
export const ANSWERED_VISIBLE_MS = 24 * 60 * 60 * 1000;

export type AnsweredAccessRequest = {
  id: string;
  outcome: "allowed" | "denied";
  answeredAt: string;
  byYou: boolean;
  // For an allowed request: how its invite stands. null when denied, when
  // the person was already on the map, or once the invite is gone.
  invite: "joined" | "pending" | "expired" | "revoked" | null;
};

// The list behind "Requests to join": who's waiting, and what was answered
// in the last day. Every participant gets the same notice email, so the ones
// who didn't answer need to see that someone else did.
export function createListAccessRequestsUseCase(deps: AnswerAccessRequestDeps) {
  return async function listAccessRequests(
    space: Space,
    viewer: SpaceParticipant,
  ): Promise<{ requests: SpaceAccessRequest[]; answered: AnsweredAccessRequest[] }> {
    const now = Date.now();
    const [requests, answers] = await Promise.all([
      deps.spaceAccessRequestRepository.findAllBySpace(space.id),
      deps.spaceAccessAnswerRepository.findSince(space.id, new Date(now - ANSWERED_VISIBLE_MS)),
    ]);
    const answered = answers.map((answer) => ({
      id: answer.id,
      outcome: answer.outcome,
      answeredAt: answer.answeredAt,
      byYou: answer.answeredById === viewer.id,
      invite: inviteStatus(answer.invite, now),
    }));
    return { requests, answered };
  };
}

function inviteStatus(
  invite: { usedAt: string | null; revokedAt: string | null; expiresAt: string } | null,
  now: number,
): AnsweredAccessRequest["invite"] {
  if (!invite) return null;
  if (invite.usedAt) return "joined";
  if (invite.revokedAt) return "revoked";
  return new Date(invite.expiresAt).getTime() < now ? "expired" : "pending";
}

export interface AcceptInviteDeps {
  spaceInviteRepository: SpaceInviteRepository;
  spaceParticipantRepository: SpaceParticipantRepository;
  spaceTokenSigner: SpaceTokenSigner;
}

export function createAcceptInviteUseCase(deps: AcceptInviteDeps) {
  return async function acceptInvite(
    space: Space,
    token: string,
    consent: boolean,
    language: Language,
  ): Promise<{ token: string; participant: SpaceParticipant }> {
    const invite = await deps.spaceInviteRepository.findByTokenHash(hashToken(token));
    // Not-found, wrong-space, revoked, used, and expired are deliberately not
    // distinguished in what's thrown up to the route layer's response - all of
    // them collapse to "Invalid or expired invite" there, so a token guess can't
    // be used to probe invite state.
    if (!invite || invite.spaceId !== space.id) {
      throw new InviteNotFoundError("Invite not found");
    }
    if (invite.revokedAt) {
      throw new InviteRevokedError("Invite revoked");
    }
    if (invite.usedAt) {
      throw new InviteAlreadyUsedError("Invite already used");
    }
    if (invite.expiresAt < new Date().toISOString()) {
      throw new InviteExpiredError("Invite expired");
    }
    if (!consent) {
      throw new ConsentRequiredError("Consent is required to join this map");
    }

    const existingParticipant = await deps.spaceParticipantRepository.findByEmail(space.id, invite.email);
    if (existingParticipant) {
      throw new AlreadyParticipantError("This email is already signed up - sign in instead");
    }

    const participant = await deps.spaceParticipantRepository.create({
      spaceId: space.id,
      email: invite.email,
      role: invite.role,
      consentAt: new Date(),
      noticeVersion: CURRENT_NOTICE_VERSION,
      language,
    });
    await deps.spaceInviteRepository.markUsed(invite.id);

    const session = deps.spaceTokenSigner.sign({
      scope: "space",
      participantId: participant.id,
      spaceId: participant.spaceId,
      email: participant.email,
      role: participant.role,
    });
    return { token: session, participant };
  };
}

export interface LocationDeps {
  spaceLocationRepository: SpaceLocationRepository;
}

export function createAddLocationUseCase(deps: LocationDeps) {
  return async function addLocation(
    participant: SpaceParticipant,
    input: { label: string; note: string; lat: number; lng: number },
  ): Promise<SpaceLocation> {
    if (participant.role !== "participant") {
      throw new LocationOwnershipError("Only a participant can place a pin");
    }
    const existing = await deps.spaceLocationRepository.findByParticipant(participant.id);
    if (existing) {
      throw new LocationAlreadyExistsError("You already have a pin - edit it instead of adding another");
    }
    return deps.spaceLocationRepository.create({ spaceId: participant.spaceId, participantId: participant.id, ...input });
  };
}

export function createUpdateLocationUseCase(deps: LocationDeps) {
  return async function updateLocation(
    participant: SpaceParticipant,
    locationId: string,
    input: { label: string; note: string; lat: number; lng: number },
  ): Promise<SpaceLocation> {
    const existing = await deps.spaceLocationRepository.findById(locationId);
    if (!existing) {
      throw new LocationNotFoundError("Pin not found");
    }
    if (existing.participantId !== participant.id) {
      throw new LocationOwnershipError("You can only edit your own pin");
    }
    const updated = await deps.spaceLocationRepository.update(locationId, input);
    if (!updated) {
      throw new LocationNotFoundError("Pin not found");
    }
    return updated;
  };
}

export function createDeleteLocationUseCase(deps: LocationDeps) {
  return async function deleteLocation(participant: SpaceParticipant, locationId: string): Promise<void> {
    const existing = await deps.spaceLocationRepository.findById(locationId);
    if (!existing) {
      throw new LocationNotFoundError("Pin not found");
    }
    if (existing.participantId !== participant.id) {
      throw new LocationOwnershipError("You can only remove your own pin");
    }
    await deps.spaceLocationRepository.delete(locationId);
  };
}

export interface RemoveMeDeps {
  spaceParticipantRepository: SpaceParticipantRepository;
}

// docs/SPEC.md section 2: "Only a participant can remove themselves... 'Remove me'
// deletes their pin, participant record, sessions, and their unaccepted
// invites." Open to both roles (a visitor has no pin but still has consent to
// withdraw) - deliberately not role-gated, since gating it would leave visitors
// with no way to withdraw consent or leave the map.
export function createRemoveMeUseCase(deps: RemoveMeDeps) {
  return async function removeMe(participant: SpaceParticipant): Promise<void> {
    await deps.spaceParticipantRepository.deleteCascade(participant.id);
  };
}

export interface SetLanguageDeps {
  spaceParticipantRepository: SpaceParticipantRepository;
}

// The language someone uses the app in, sent by the map whenever it opens or
// the language changes, so their emails (above all the thank-you) are in it.
export function createSetLanguageUseCase(deps: SetLanguageDeps) {
  return async function setLanguage(participant: SpaceParticipant, language: Language): Promise<void> {
    if (participant.language !== language) {
      await deps.spaceParticipantRepository.setLanguage(participant.id, language);
    }
  };
}

export interface ThankEveryoneDeps {
  spaceParticipantRepository: SpaceParticipantRepository;
  mailer: Mailer;
  eventEndAt: Date;
  // The privacy notice, linked from the email.
  privacyUrl: string;
  // Between two sends, to stay under Resend's rate limit.
  pause: () => Promise<void>;
}

export type ThankEveryoneResult = {
  alreadyThanked: number;
  // Everyone still to thank, per language (the dry run stops here).
  pending: Record<Language, number>;
  sent: number;
  failed: number;
};

// The thank-you on Halloween (TASK.md item 3, docs/WORKLOG.md 2026-10-27):
// one email to everyone on the map, participants and visitors, in their own
// language, before everything is deleted at eventEndAt. Each person is marked
// once their email has gone out, so running it again after a failure only
// retries the ones that failed. Failures are counted, not logged: the caller
// prints counts only, never addresses.
export function createThankEveryoneUseCase(deps: ThankEveryoneDeps) {
  return async function thankEveryone(
    spaceId: string,
    options: { send: boolean; replyTo: string },
  ): Promise<ThankEveryoneResult> {
    const recipients = await deps.spaceParticipantRepository.findUnthanked(spaceId);
    const pending = Object.fromEntries(LANGUAGES.map((language) => [language, 0])) as Record<Language, number>;
    for (const recipient of recipients) pending[recipient.language] += 1;
    const result = {
      alreadyThanked: await deps.spaceParticipantRepository.countThanked(spaceId),
      pending,
      sent: 0,
      failed: 0,
    };
    if (!options.send) return result;

    // The privacy notice promises everything is gone by then.
    if (Date.now() >= deps.eventEndAt.getTime()) {
      throw new EventEndedError("The event is over: the data should already be deleted, so nothing is sent.");
    }

    for (const [index, recipient] of recipients.entries()) {
      if (index > 0) await deps.pause();
      try {
        await deps.mailer.sendThankYou(
          recipient.email,
          deps.privacyUrl,
          deps.eventEndAt,
          options.replyTo,
          recipient.language,
        );
      } catch {
        result.failed += 1;
        continue;
      }
      await deps.spaceParticipantRepository.markThanked(recipient.id, new Date());
      result.sent += 1;
    }
    return result;
  };
}

export type { SpaceInvite };
