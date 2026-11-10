import { describe, expect, test, vi } from "vitest";
import type { SpaceInvite, SpaceLocation, SpaceParticipant } from "../../domain/space/space.types.js";
import { hashToken } from "../../domain/auth/magic-link.js";
import type { Mailer } from "../mailer.js";
import {
  createAcceptInviteUseCase,
  createAllowAccessRequestUseCase,
  createDenyAccessRequestUseCase,
  createRequestAccessUseCase,
  createAddLocationUseCase,
  createDeleteInviteUseCase,
  createDeleteLocationUseCase,
  createInviteParticipantUseCase,
  createListAccessRequestsUseCase,
  createRequestSpaceMagicLinkUseCase,
  createRevokeInviteUseCase,
  createThankEveryoneUseCase,
  createUpdateLocationUseCase,
  CURRENT_NOTICE_VERSION,
} from "./space.use-cases.js";
import {
  AccessRequestNotFoundError,
  AlreadyParticipantError,
  ConsentRequiredError,
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
import {
  FakeAccessAnswerRepository,
  FakeAccessRequestRepository,
  FakeInviteRepository,
  FakeLocationRepository,
  FakeMagicLinkTokenRepository,
  FakeParticipantRepository,
  SPACE,
  failingMailer,
  fakeMailer,
  fakeSpaceTokenSigner,
  fakeTokenGenerator,
  makeParticipant,
  nextId,
} from "./space.test-support.js";

function inviteDeps(overrides: Partial<Parameters<typeof createInviteParticipantUseCase>[0]> = {}) {
  const base = {
    spaceParticipantRepository: new FakeParticipantRepository(),
    spaceInviteRepository: new FakeInviteRepository(),
    mailer: fakeMailer(),
    tokenGenerator: fakeTokenGenerator(),
    clientOrigin: "https://example.test",
    clientAppPath: "/halloween-trick-o-treating-opt-in",
    isDevMode: true,
    inviteTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
    inviteRateLimitWindowMs: 60 * 60 * 1000,
    inviteRateLimitMax: 10,
    inviteMaxPerParticipant: 50,
    eventEndAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  };
  // Assigning (not spreading) keeps `spaceParticipantRepository` typed as the
  // concrete FakeParticipantRepository (so tests can call its `.seed()`
  // helper, which isn't part of the SpaceParticipantRepository interface)
  // instead of widening to the interface type the way `{...base, ...overrides}`
  // would.
  return Object.assign(base, overrides);
}

function magicLinkDeps(overrides: Partial<Parameters<typeof createRequestSpaceMagicLinkUseCase>[0]> = {}) {
  const base = {
    spaceParticipantRepository: new FakeParticipantRepository(),
    spaceMagicLinkTokenRepository: new FakeMagicLinkTokenRepository(),
    mailer: fakeMailer(),
    tokenGenerator: fakeTokenGenerator(),
    clientOrigin: "https://example.test",
    clientAppPath: "/halloween-trick-o-treating-opt-in",
    isDevMode: true,
  };
  return Object.assign(base, overrides);
}

describe("requestSpaceMagicLink", () => {
  test("emails a link to the app's root, not a sub-path", async () => {
    const deps = magicLinkDeps();
    const requestMagicLink = createRequestSpaceMagicLinkUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    const result = await requestMagicLink(SPACE, participant.email, "en");

    expect(deps.mailer.sendMagicLink).toHaveBeenCalledWith(
      participant.email,
      `https://example.test/halloween-trick-o-treating-opt-in/#/${SPACE.slug}?token=${result.devToken}`,
      "en",
    );
  });

  test("the link is written in the language of the request, which becomes the participant's language", async () => {
    const deps = magicLinkDeps();
    const requestMagicLink = createRequestSpaceMagicLinkUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    await requestMagicLink(SPACE, participant.email, "de");

    expect(deps.mailer.sendMagicLink).toHaveBeenCalledWith(participant.email, expect.any(String), "de");
    expect((await deps.spaceParticipantRepository.findById(participant.id))?.language).toBe("de");
  });

  test("dev mode: a mailer failure still returns a devToken so sign-in isn't blocked", async () => {
    const deps = magicLinkDeps({ mailer: failingMailer(), isDevMode: true });
    const requestMagicLink = createRequestSpaceMagicLinkUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    const result = await requestMagicLink(SPACE, participant.email, "en");

    expect(result.devToken).toBeDefined();
  });

  test("production: a mailer failure throws instead of silently returning no way to sign in", async () => {
    const deps = magicLinkDeps({ mailer: failingMailer(), isDevMode: false });
    const requestMagicLink = createRequestSpaceMagicLinkUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    await expect(requestMagicLink(SPACE, participant.email, "en")).rejects.toBeInstanceOf(SpaceMailDeliveryError);
  });

  test("an unknown email gets the same generic response, mailer never called (anti-enumeration)", async () => {
    const deps = magicLinkDeps();
    const requestMagicLink = createRequestSpaceMagicLinkUseCase(deps);

    const result = await requestMagicLink(SPACE, "nobody@example.com", "en");

    expect(result.devToken).toBeUndefined();
    expect(deps.mailer.sendMagicLink).not.toHaveBeenCalled();
  });
});

describe("inviteParticipant", () => {
  test("a visitor cannot invite anyone (no role escalation path)", async () => {
    const deps = inviteDeps();
    const invite = createInviteParticipantUseCase(deps);
    const visitor = deps.spaceParticipantRepository.seed(makeParticipant("visitor"));

    await expect(invite(SPACE, visitor, { email: "new@example.com", role: "visitor", language: "en" })).rejects.toBeInstanceOf(
      RoleEscalationError,
    );
  });

  test("a participant can invite a visitor or another participant", async () => {
    const deps = inviteDeps();
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    const result = await invite(SPACE, participant, { email: "new@example.com", role: "participant", language: "en" });

    expect(result.devToken).toBeDefined();
    expect(deps.mailer.sendInvite).toHaveBeenCalledWith(
      "new@example.com",
      `https://example.test/halloween-trick-o-treating-opt-in/#/${SPACE.slug}/invite?token=${result.devToken}`,
      expect.any(Date),
      "en",
    );
    expect(deps.mailer.sendMagicLink).not.toHaveBeenCalled();
  });

  test("inviting an email that's already a participant is a silent no-op (anti-enumeration)", async () => {
    const deps = inviteDeps();
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));
    deps.spaceParticipantRepository.seed(makeParticipant("visitor", { email: "already@example.com" }));

    const result = await invite(SPACE, participant, { email: "already@example.com", role: "visitor", language: "en" });

    expect(result.message).toBe("If that invite can be sent, it has been.");
    expect(deps.mailer.sendInvite).not.toHaveBeenCalled();
  });

  test("dev mode: a mailer failure still returns a devToken so the invite isn't blocked", async () => {
    const deps = inviteDeps({ mailer: failingMailer(), isDevMode: true });
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    const result = await invite(SPACE, participant, { email: "new@example.com", role: "visitor", language: "en" });

    expect(result.devToken).toBeDefined();
  });

  test("production: a mailer failure throws instead of silently losing the invite", async () => {
    const deps = inviteDeps({ mailer: failingMailer(), isDevMode: false });
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    await expect(
      invite(SPACE, participant, { email: "new@example.com", role: "visitor", language: "en" }),
    ).rejects.toBeInstanceOf(SpaceMailDeliveryError);
  });

  test("the invite email carries the invite's own expiry, not the sign-in link's", async () => {
    const deps = inviteDeps();
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    await invite(SPACE, participant, { email: "new@example.com", role: "visitor", language: "en" });

    const [created] = await deps.spaceInviteRepository.findAllByInviter(participant.id);
    const sentExpiry = vi.mocked(deps.mailer.sendInvite).mock.calls[0][2];
    expect(sentExpiry.toISOString()).toBe(created.expiresAt);
  });

  test("an invite expires at the event end at the latest, and the email says so", async () => {
    const eventEndAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const deps = inviteDeps({ eventEndAt });
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    await invite(SPACE, participant, { email: "late@example.com", role: "visitor", language: "en" });

    const [created] = await deps.spaceInviteRepository.findAllByInviter(participant.id);
    expect(created.expiresAt).toBe(eventEndAt.toISOString());
    expect(vi.mocked(deps.mailer.sendInvite).mock.calls[0][2]).toEqual(eventEndAt);
  });

  test("well before the event end, an invite keeps its full lifetime", async () => {
    const deps = inviteDeps();
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));
    const before = Date.now();

    await invite(SPACE, participant, { email: "early@example.com", role: "visitor", language: "en" });

    const [created] = await deps.spaceInviteRepository.findAllByInviter(participant.id);
    expect(new Date(created.expiresAt).getTime()).toBeGreaterThanOrEqual(before + deps.inviteTokenTtlMs);
  });

  test("rate limit: too many invites within the window is rejected", async () => {
    const deps = inviteDeps({ inviteRateLimitMax: 1 });
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    await invite(SPACE, participant, { email: "one@example.com", role: "visitor", language: "en" });
    await expect(invite(SPACE, participant, { email: "two@example.com", role: "visitor", language: "en" })).rejects.toBeInstanceOf(
      InviteRateLimitError,
    );
  });

  test("lifetime cap: too many invites ever sent is rejected even outside the rate window", async () => {
    const deps = inviteDeps({ inviteRateLimitMax: 100, inviteMaxPerParticipant: 1 });
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    await invite(SPACE, participant, { email: "one@example.com", role: "visitor", language: "en" });
    await expect(invite(SPACE, participant, { email: "two@example.com", role: "visitor", language: "en" })).rejects.toBeInstanceOf(
      InviteCapExceededError,
    );
  });
});

describe("acceptInvite / revokeInvite", () => {
  function acceptDeps() {
    const spaceParticipantRepository = new FakeParticipantRepository();
    const spaceInviteRepository = new FakeInviteRepository();
    const spaceTokenSigner = fakeSpaceTokenSigner();
    return { spaceParticipantRepository, spaceInviteRepository, spaceTokenSigner };
  }

  function seedInvite(repo: FakeInviteRepository, token: string, overrides: Partial<SpaceInvite> = {}) {
    return repo.seed({
      id: nextId("invite"),
      spaceId: SPACE.id,
      email: "invitee@example.com",
      role: "visitor",
      tokenHash: hashToken(token),
      inviterParticipantId: "inviter-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: null,
      revokedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      ...overrides,
    });
  }

  test("accepting creates a participant with the invited role and marks the invite used", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "good-token", { role: "participant" });

    const result = await accept(SPACE, "good-token", true, "en");

    expect(result.participant.role).toBe("participant");
    expect(result.participant.email).toBe("invitee@example.com");
    expect(result.participant.language).toBe("en");
    const stored = await deps.spaceParticipantRepository.findByEmail(SPACE.id, "invitee@example.com");
    expect(stored).not.toBeNull();
  });

  test("consent is required to accept", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "good-token");

    await expect(accept(SPACE, "good-token", false, "en")).rejects.toBeInstanceOf(ConsentRequiredError);
  });

  test("an unknown token is rejected", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);

    await expect(accept(SPACE, "no-such-token", true, "en")).rejects.toBeInstanceOf(InviteNotFoundError);
  });

  test("an expired invite is rejected", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "expired-token", { expiresAt: new Date(Date.now() - 1000).toISOString() });

    await expect(accept(SPACE, "expired-token", true, "en")).rejects.toBeInstanceOf(InviteExpiredError);
  });

  test("a revoked invite is rejected", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "revoked-token", { revokedAt: new Date().toISOString() });

    await expect(accept(SPACE, "revoked-token", true, "en")).rejects.toBeInstanceOf(InviteRevokedError);
  });

  test("an already-used invite cannot be accepted twice", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "used-token", { usedAt: new Date().toISOString() });

    await expect(accept(SPACE, "used-token", true, "en")).rejects.toBeInstanceOf(InviteAlreadyUsedError);
  });

  test("cannot accept if the email is already a participant (race with another invite)", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "good-token");
    await deps.spaceParticipantRepository.create({
      spaceId: SPACE.id,
      email: "invitee@example.com",
      role: "visitor",
      consentAt: new Date(),
      noticeVersion: "2026-09-21",
      language: "en",
    });

    await expect(accept(SPACE, "good-token", true, "en")).rejects.toBeInstanceOf(AlreadyParticipantError);
  });

  test("only the inviter can revoke their invite", async () => {
    const spaceInviteRepository = new FakeInviteRepository();
    const revoke = createRevokeInviteUseCase({ spaceInviteRepository });
    const invite = seedInvite(spaceInviteRepository, "some-token", { inviterParticipantId: "inviter-1" });

    await expect(revoke(invite.id, "someone-else")).rejects.toBeInstanceOf(InviteOwnershipError);
    await expect(revoke(invite.id, "inviter-1")).resolves.toBeUndefined();
  });

  test("an already-accepted invite cannot be revoked", async () => {
    const spaceInviteRepository = new FakeInviteRepository();
    const revoke = createRevokeInviteUseCase({ spaceInviteRepository });
    const invite = seedInvite(spaceInviteRepository, "some-token", {
      inviterParticipantId: "inviter-1",
      usedAt: new Date().toISOString(),
    });

    await expect(revoke(invite.id, "inviter-1")).rejects.toBeInstanceOf(InviteAlreadyUsedError);
  });

  test("a revoked invite can be deleted by its sender: the address is erased and it leaves the list", async () => {
    const spaceInviteRepository = new FakeInviteRepository();
    const deleteInvite = createDeleteInviteUseCase({ spaceInviteRepository });
    const invite = seedInvite(spaceInviteRepository, "some-token", {
      inviterParticipantId: "inviter-1",
      email: "mistyped@exmaple.com",
      revokedAt: new Date().toISOString(),
    });

    await expect(deleteInvite(invite.id, "someone-else")).rejects.toBeInstanceOf(InviteOwnershipError);
    await deleteInvite(invite.id, "inviter-1");

    expect(await spaceInviteRepository.findAllByInviter("inviter-1")).toEqual([]);
    expect(spaceInviteRepository.byId.get(invite.id)?.email).toBe("");
    await expect(deleteInvite(invite.id, "inviter-1")).rejects.toBeInstanceOf(InviteNotFoundError);
  });

  test("a deleted invite still counts toward the sender's limits", async () => {
    const spaceInviteRepository = new FakeInviteRepository();
    const deleteInvite = createDeleteInviteUseCase({ spaceInviteRepository });
    const invite = seedInvite(spaceInviteRepository, "some-token", {
      inviterParticipantId: "inviter-1",
      revokedAt: new Date().toISOString(),
    });

    await deleteInvite(invite.id, "inviter-1");

    expect(await spaceInviteRepository.countByInviter("inviter-1")).toBe(1);
  });

  test("an expired invite can be deleted without revoking it first", async () => {
    const spaceInviteRepository = new FakeInviteRepository();
    const deleteInvite = createDeleteInviteUseCase({ spaceInviteRepository });
    const invite = seedInvite(spaceInviteRepository, "some-token", {
      inviterParticipantId: "inviter-1",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    await expect(deleteInvite(invite.id, "inviter-1")).resolves.toBeUndefined();
  });

  test("a pending invite must be revoked first, and an accepted one can't be deleted", async () => {
    const spaceInviteRepository = new FakeInviteRepository();
    const deleteInvite = createDeleteInviteUseCase({ spaceInviteRepository });
    const pending = seedInvite(spaceInviteRepository, "pending-token", { inviterParticipantId: "inviter-1" });
    const accepted = seedInvite(spaceInviteRepository, "used-token", {
      inviterParticipantId: "inviter-1",
      usedAt: new Date().toISOString(),
    });

    await expect(deleteInvite(pending.id, "inviter-1")).rejects.toBeInstanceOf(InviteStillPendingError);
    await expect(deleteInvite(accepted.id, "inviter-1")).rejects.toBeInstanceOf(InviteAlreadyUsedError);
  });
});

describe("location ownership", () => {
  const validInput = { label: "Cage Family", note: "Ring the bell", lat: 49.17, lng: 11.29 };

  test("only a participant role can place a pin, not a visitor", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const addLocation = createAddLocationUseCase({ spaceLocationRepository });
    const visitor = makeParticipant("visitor");

    await expect(addLocation(visitor, validInput)).rejects.toBeInstanceOf(LocationOwnershipError);
  });

  test("a participant can only ever have one pin", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const addLocation = createAddLocationUseCase({ spaceLocationRepository });
    const participant = makeParticipant("participant");

    await addLocation(participant, validInput);
    await expect(addLocation(participant, validInput)).rejects.toBeInstanceOf(LocationAlreadyExistsError);
  });

  test("a participant can only edit their own pin", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const addLocation = createAddLocationUseCase({ spaceLocationRepository });
    const updateLocation = createUpdateLocationUseCase({ spaceLocationRepository });
    const owner = makeParticipant("participant");
    const stranger = makeParticipant("participant");

    const location = await addLocation(owner, validInput);

    await expect(updateLocation(stranger, location.id, { ...validInput, label: "Hacked" })).rejects.toBeInstanceOf(
      LocationOwnershipError,
    );
    await expect(updateLocation(owner, location.id, { ...validInput, label: "New label" })).resolves.toMatchObject({
      label: "New label",
    });
  });

  test("a participant can only delete their own pin", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const addLocation = createAddLocationUseCase({ spaceLocationRepository });
    const deleteLocation = createDeleteLocationUseCase({ spaceLocationRepository });
    const owner = makeParticipant("participant");
    const stranger = makeParticipant("participant");

    const location = await addLocation(owner, validInput);

    await expect(deleteLocation(stranger, location.id)).rejects.toBeInstanceOf(LocationOwnershipError);
    await expect(deleteLocation(owner, location.id)).resolves.toBeUndefined();
  });

  test("editing a pin that doesn't exist raises not-found", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const updateLocation = createUpdateLocationUseCase({ spaceLocationRepository });
    const owner = makeParticipant("participant");

    await expect(updateLocation(owner, "no-such-id", validInput)).rejects.toBeInstanceOf(LocationNotFoundError);
  });
});

describe("requests to join", () => {
  function requestDeps() {
    const base = inviteDeps();
    return {
      ...base,
      spaceAccessRequestRepository: new FakeAccessRequestRepository(),
      spaceAccessAnswerRepository: new FakeAccessAnswerRepository(base.spaceInviteRepository),
    };
  }
  const asking = { email: "asker@example.com", message: "Anna from the bakery", consent: true, language: "de" as const };

  test("consent is required to ask", async () => {
    const deps = requestDeps();
    await expect(createRequestAccessUseCase(deps)(SPACE, { ...asking, consent: false })).rejects.toBeInstanceOf(
      ConsentRequiredError,
    );
    expect(await deps.spaceAccessRequestRepository.countBySpace(SPACE.id)).toBe(0);
  });

  test("a request records which privacy notice was agreed to", async () => {
    const deps = requestDeps();
    await createRequestAccessUseCase(deps)(SPACE, asking);
    const [stored] = await deps.spaceAccessRequestRepository.findAllBySpace(SPACE.id);
    expect(stored).toMatchObject({
      email: "asker@example.com",
      message: "Anna from the bakery",
      noticeVersion: CURRENT_NOTICE_VERSION,
      language: "de",
    });
  });

  test("someone already on the map gets the same reply and no request is stored", async () => {
    const deps = requestDeps();
    deps.spaceParticipantRepository.seed(makeParticipant("visitor", { email: "asker@example.com" }));
    const result = await createRequestAccessUseCase(deps)(SPACE, asking);
    expect(result.message).toBe("If your request can be passed on, it has been.");
    expect(await deps.spaceAccessRequestRepository.countBySpace(SPACE.id)).toBe(0);
    expect(deps.mailer.sendAccessRequestNotice).not.toHaveBeenCalled();
  });

  test("a failing notice email doesn't fail the request", async () => {
    const deps = { ...requestDeps(), mailer: failingMailer() };
    deps.spaceParticipantRepository.seed(makeParticipant("participant"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(createRequestAccessUseCase(deps)(SPACE, asking)).resolves.toEqual({
      message: "If your request can be passed on, it has been.",
    });
    expect(await deps.spaceAccessRequestRepository.countBySpace(SPACE.id)).toBe(1);
  });

  test("the notice links to the map, carries nothing the requester typed, and is in each participant's language", async () => {
    const deps = requestDeps();
    deps.spaceParticipantRepository.seed(makeParticipant("participant", { email: "member@example.com", language: "es" }));
    deps.spaceParticipantRepository.seed(makeParticipant("participant", { email: "other@example.com" }));
    await createRequestAccessUseCase(deps)(SPACE, asking);
    expect(deps.mailer.sendAccessRequestNotice).toHaveBeenCalledWith(
      "member@example.com",
      `https://example.test/halloween-trick-o-treating-opt-in/#/${SPACE.slug}`,
      "es",
    );
    expect(deps.mailer.sendAccessRequestNotice).toHaveBeenCalledWith("other@example.com", expect.any(String), "en");
  });

  test("a visitor can't answer requests, and a request from another space is not found", async () => {
    const deps = requestDeps();
    await createRequestAccessUseCase(deps)(SPACE, asking);
    const [request] = await deps.spaceAccessRequestRepository.findAllBySpace(SPACE.id);
    const visitor = makeParticipant("visitor");
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));
    const otherSpace = { ...SPACE, id: "space-2", slug: "other-village" };

    await expect(createDenyAccessRequestUseCase(deps)(SPACE, visitor, request.id)).rejects.toBeInstanceOf(RoleEscalationError);
    await expect(createAllowAccessRequestUseCase(deps)(SPACE, visitor, request.id, "visitor")).rejects.toBeInstanceOf(
      RoleEscalationError,
    );
    await expect(createDenyAccessRequestUseCase(deps)(otherSpace, participant, request.id)).rejects.toBeInstanceOf(
      AccessRequestNotFoundError,
    );
    expect(await deps.spaceAccessRequestRepository.countBySpace(SPACE.id)).toBe(1);
  });

  test("allowing invites with the chosen role from the approver; if the invite fails, the request stays", async () => {
    const deps = requestDeps();
    await createRequestAccessUseCase(deps)(SPACE, asking);
    const [request] = await deps.spaceAccessRequestRepository.findAllBySpace(SPACE.id);
    const approver = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    const capped = createAllowAccessRequestUseCase({ ...deps, inviteMaxPerParticipant: 0 });
    await expect(capped(SPACE, approver, request.id, "participant")).rejects.toBeInstanceOf(InviteCapExceededError);
    expect(await deps.spaceAccessRequestRepository.countBySpace(SPACE.id)).toBe(1);

    await createAllowAccessRequestUseCase(deps)(SPACE, approver, request.id, "participant");
    // In the requester's language, not the approver's.
    expect(deps.mailer.sendInvite).toHaveBeenCalledWith("asker@example.com", expect.any(String), expect.any(Date), "de");
    const [invite] = await deps.spaceInviteRepository.findAllByInviter(approver.id);
    expect(invite).toMatchObject({ email: "asker@example.com", role: "participant" });
    expect(await deps.spaceAccessRequestRepository.countBySpace(SPACE.id)).toBe(0);
  });

  test("an answered request stays visible for a day, without the email, with who answered and how the invite stands", async () => {
    const deps = requestDeps();
    const ask = createRequestAccessUseCase(deps);
    const list = createListAccessRequestsUseCase(deps);
    const approver = deps.spaceParticipantRepository.seed(makeParticipant("participant", { email: "approver@example.com" }));
    const other = deps.spaceParticipantRepository.seed(makeParticipant("participant", { email: "other@example.com" }));
    await ask(SPACE, asking);
    await ask(SPACE, { ...asking, email: "spam@example.com" });
    const [first, second] = await deps.spaceAccessRequestRepository.findAllBySpace(SPACE.id);

    await createAllowAccessRequestUseCase(deps)(SPACE, approver, first.id, "participant");
    await createDenyAccessRequestUseCase(deps)(SPACE, approver, second.id);

    const seenByOther = await list(SPACE, other);
    expect(seenByOther.requests).toEqual([]);
    expect(seenByOther.answered.map(({ outcome, byYou, invite }) => ({ outcome, byYou, invite }))).toEqual([
      { outcome: "denied", byYou: false, invite: null },
      { outcome: "allowed", byYou: false, invite: "pending" },
    ]);
    expect(JSON.stringify(seenByOther.answered)).not.toMatch(/example\.com|bakery/);
    expect((await list(SPACE, approver)).answered.every((answer) => answer.byYou)).toBe(true);

    // The invite gets used: the answer says so.
    const [invite] = await deps.spaceInviteRepository.findAllByInviter(approver.id);
    await deps.spaceInviteRepository.markUsed(invite.id);
    expect((await list(SPACE, other)).answered.find((a) => a.outcome === "allowed")?.invite).toBe("joined");

    // After a day it's gone from the list.
    for (const row of deps.spaceAccessAnswerRepository.rows) row.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect((await list(SPACE, other)).answered).toEqual([]);
  });

  test("allowing someone who is already on the map records the answer without an invite", async () => {
    const deps = requestDeps();
    const approver = deps.spaceParticipantRepository.seed(makeParticipant("participant"));
    await createRequestAccessUseCase(deps)(SPACE, asking);
    const [request] = await deps.spaceAccessRequestRepository.findAllBySpace(SPACE.id);
    // They joined through someone else's invite in the meantime.
    deps.spaceParticipantRepository.seed(makeParticipant("visitor", { email: asking.email }));
    const result = await createAllowAccessRequestUseCase(deps)(SPACE, approver, request.id, "visitor");
    expect(result).not.toHaveProperty("inviteId");
    const [answer] = (await createListAccessRequestsUseCase(deps)(SPACE, approver)).answered;
    expect(answer).toMatchObject({ outcome: "allowed", invite: null });
  });
});

describe("thank-you email", () => {
  const REPLY_TO = "philip@example.com";
  const EVENT_END = new Date(Date.now() + 60 * 60 * 1000);
  const PRIVACY_URL = "https://example.test/#/meckenhausen/privacy";

  function thankDeps(mailer: Mailer = fakeMailer(), eventEndAt = EVENT_END) {
    const spaceParticipantRepository = new FakeParticipantRepository();
    spaceParticipantRepository.seed(makeParticipant("participant", { email: "host@example.com", language: "de" }));
    spaceParticipantRepository.seed(makeParticipant("visitor", { email: "visitor@example.com", language: "es" }));
    spaceParticipantRepository.seed(makeParticipant("visitor", { email: "other@example.com", language: "de" }));
    spaceParticipantRepository.seed(makeParticipant("visitor", { spaceId: "another-space", email: "away@example.com" }));
    return {
      spaceParticipantRepository,
      mailer,
      eventEndAt,
      privacyUrl: PRIVACY_URL,
      pause: vi.fn().mockResolvedValue(undefined),
    };
  }

  test("a dry run counts everyone per language and sends nothing", async () => {
    const deps = thankDeps();
    const result = await createThankEveryoneUseCase(deps)(SPACE.id, { send: false, replyTo: REPLY_TO });
    expect(result).toEqual({ alreadyThanked: 0, pending: { en: 0, de: 2, es: 1 }, sent: 0, failed: 0 });
    expect(deps.mailer.sendThankYou).not.toHaveBeenCalled();
  });

  test("participants and visitors of this space get it, in their own language, with the deletion time, the privacy link and Philip as Reply-To", async () => {
    const deps = thankDeps();
    const result = await createThankEveryoneUseCase(deps)(SPACE.id, { send: true, replyTo: REPLY_TO });
    expect(result).toMatchObject({ sent: 3, failed: 0 });
    expect(vi.mocked(deps.mailer.sendThankYou).mock.calls.map(([email, , , , language]) => [email, language])).toEqual([
      ["host@example.com", "de"],
      ["visitor@example.com", "es"],
      ["other@example.com", "de"],
    ]);
    expect(deps.mailer.sendThankYou).toHaveBeenCalledWith("host@example.com", PRIVACY_URL, EVENT_END, REPLY_TO, "de");
    // Paced between sends, not before the first.
    expect(deps.pause).toHaveBeenCalledTimes(2);
  });

  test("running it again sends nothing twice", async () => {
    const deps = thankDeps();
    const thankEveryone = createThankEveryoneUseCase(deps);
    await thankEveryone(SPACE.id, { send: true, replyTo: REPLY_TO });
    const again = await thankEveryone(SPACE.id, { send: true, replyTo: REPLY_TO });
    expect(again).toEqual({ alreadyThanked: 3, pending: { en: 0, de: 0, es: 0 }, sent: 0, failed: 0 });
    expect(deps.mailer.sendThankYou).toHaveBeenCalledTimes(3);
  });

  test("a failed send is counted, the rest still go out, and a rerun retries only the failed one", async () => {
    const mailer = fakeMailer();
    vi.mocked(mailer.sendThankYou).mockRejectedValueOnce(new Error("Resend rejected the recipient"));
    const deps = thankDeps(mailer);
    const thankEveryone = createThankEveryoneUseCase(deps);
    expect(await thankEveryone(SPACE.id, { send: true, replyTo: REPLY_TO })).toMatchObject({ sent: 2, failed: 1 });
    expect(await thankEveryone(SPACE.id, { send: true, replyTo: REPLY_TO })).toMatchObject({
      alreadyThanked: 2,
      sent: 1,
      failed: 0,
    });
    expect(vi.mocked(mailer.sendThankYou).mock.calls.at(-1)?.[0]).toBe("host@example.com");
  });

  test("after the event nothing is sent: the data should already be gone", async () => {
    const deps = thankDeps(fakeMailer(), new Date(Date.now() - 1000));
    await expect(createThankEveryoneUseCase(deps)(SPACE.id, { send: true, replyTo: REPLY_TO })).rejects.toBeInstanceOf(
      EventEndedError,
    );
    expect(deps.mailer.sendThankYou).not.toHaveBeenCalled();
  });
});
