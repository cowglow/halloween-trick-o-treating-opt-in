import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createSpaceRouter } from "./space.routes.js";
import { createRequireSpaceAuth } from "../middleware/require-space-auth.js";
import { errorHandler } from "../middleware/error-handler.js";
import { jsonBody } from "../middleware/json-body.js";
import type { SpaceParticipant, SpaceRole } from "../../../domain/space/space.types.js";
import type { SpaceRepository } from "../../../application/space/space.repository.js";
import {
  FakeAccessAnswerRepository,
  FakeAccessRequestRepository,
  FakeInviteRepository,
  FakeLocationRepository,
  FakeMagicLinkTokenRepository,
  FakeParticipantRepository,
  SPACE,
  fakeMailer,
  fakeSpaceTokenSigner,
  fakeTokenGenerator,
  makeParticipant,
} from "../../../application/space/space.test-support.js";

// The Space router driven over real HTTP (a real Express app on an ephemeral
// port) with in-memory repositories: this is what proves the *wiring* -
// authentication, cross-space isolation, role gating, the event-end gate,
// status codes and headers - that the use-case tests can't see. The database
// itself (foreign keys, cascades) is covered by e2e/spaces.

const OTHER_SPACE = { id: "space-2", slug: "other-village", name: "Other village", createdAt: SPACE.createdAt };
const INSIDE = { lat: 49.17, lng: 11.29 };
const BERLIN = { lat: 52.52, lng: 13.405 };
const PAST = new Date(Date.now() - 60_000);
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000);

class FakeSpaceRepository implements SpaceRepository {
  async findBySlug(slug: string) {
    return [SPACE, OTHER_SPACE].find((s) => s.slug === slug) ?? null;
  }
  async create(): Promise<never> {
    throw new Error("not used");
  }
}

interface World {
  base: string;
  participants: FakeParticipantRepository;
  locations: FakeLocationRepository;
  invites: FakeInviteRepository;
  accessRequests: FakeAccessRequestRepository;
  mailer: ReturnType<typeof fakeMailer>;
  tokenFor(participant: SpaceParticipant): string;
  seed(role: SpaceRole, email: string, spaceId?: string): SpaceParticipant;
  close(): Promise<void>;
}

async function startWorld(options: { eventEndAt?: Date; inviteMaxPerParticipant?: number } = {}): Promise<World> {
  const participants = new FakeParticipantRepository();
  const locations = new FakeLocationRepository();
  const invites = new FakeInviteRepository();
  const accessRequests = new FakeAccessRequestRepository();
  const accessAnswers = new FakeAccessAnswerRepository(invites);
  const mailer = fakeMailer();
  const signer = fakeSpaceTokenSigner();

  const router = createSpaceRouter({
    requireSpaceAuth: createRequireSpaceAuth(signer, participants),
    spaceRepository: new FakeSpaceRepository(),
    spaceParticipantRepository: participants,
    spaceMagicLinkTokenRepository: new FakeMagicLinkTokenRepository(participants),
    spaceLocationRepository: locations,
    spaceInviteRepository: invites,
    spaceAccessRequestRepository: accessRequests,
    spaceAccessAnswerRepository: accessAnswers,
    spaceTokenSigner: signer,
    mailer,
    tokenGenerator: fakeTokenGenerator(),
    clientOrigin: "https://example.test",
    clientAppPath: "/halloween-trick-o-treating-opt-in",
    isDevMode: true,
    inviteTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
    inviteRateLimitWindowMs: 60 * 60 * 1000,
    inviteRateLimitMax: 100,
    inviteMaxPerParticipant: options.inviteMaxPerParticipant ?? 50,
    eventEndAt: options.eventEndAt ?? FUTURE,
  });

  const app = express();
  app.use(jsonBody);
  app.use("/spaces", router);
  app.use(errorHandler);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    base: `http://127.0.0.1:${port}`,
    participants,
    locations,
    invites,
    accessRequests,
    mailer,
    tokenFor: (p) =>
      signer.sign({ scope: "space", participantId: p.id, spaceId: p.spaceId, email: p.email, role: p.role }),
    seed: (role, email, spaceId = SPACE.id) => participants.seed(makeParticipant(role, { email, spaceId })),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function api(world: World, token?: string) {
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const response = await fetch(`${world.base}/spaces/${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, json: text ? JSON.parse(text) : null };
  };
  return call;
}

describe("authentication and cross-space isolation", () => {
  let world: World;
  beforeAll(async () => {
    world = await startWorld();
  });
  afterAll(() => world.close());

  test("every protected route rejects a request with no token", async () => {
    const call = api(world);
    for (const [method, path] of [
      ["GET", "meckenhausen/me"],
      ["GET", "meckenhausen/locations"],
      ["POST", "meckenhausen/locations"],
      ["GET", "meckenhausen/invites"],
      ["POST", "meckenhausen/invites"],
      ["POST", "meckenhausen/invites/anything/erase"],
      ["GET", "meckenhausen/access-requests"],
      ["POST", "meckenhausen/access-requests/anything/allow"],
      ["DELETE", "meckenhausen/access-requests/anything"],
      ["DELETE", "meckenhausen/me"],
      ["PUT", "meckenhausen/me/language"],
    ] as const) {
      expect((await call(method, path, method === "POST" ? {} : undefined)).status, `${method} ${path}`).toBe(401);
    }
  });

  test("a garbage token is rejected", async () => {
    expect((await api(world, "not-a-token")("GET", "meckenhausen/locations")).status).toBe(401);
  });

  test("a session for another space cannot read or write this one", async () => {
    const outsider = world.seed("participant", "outsider@example.com", OTHER_SPACE.id);
    const call = api(world, world.tokenFor(outsider));
    expect((await call("GET", "meckenhausen/locations")).status).toBe(403);
    expect((await call("POST", "meckenhausen/locations", { label: "x", note: "", ...INSIDE })).status).toBe(403);
    expect((await call("GET", "meckenhausen/invites")).status).toBe(403);
    expect((await call("POST", "meckenhausen/invites", { email: "a@example.com", role: "visitor" })).status).toBe(403);
  });

  test("a valid token whose participant no longer exists is rejected", async () => {
    const ghost = makeParticipant("participant", { email: "ghost@example.com" });
    expect((await api(world, world.tokenFor(ghost))("GET", "meckenhausen/locations")).status).toBe(401);
  });

  test("an unknown space is a 404 (slugs are public; nothing about other spaces leaks)", async () => {
    const someone = world.seed("participant", "someone@example.com");
    expect((await api(world, world.tokenFor(someone))("GET", "no-such-space/locations")).status).toBe(404);
    expect((await api(world)("GET", "no-such-space")).status).toBe(404);
  });
});

describe("role gating", () => {
  let world: World;
  let visitorCall: ReturnType<typeof api>;
  let participantCall: ReturnType<typeof api>;
  let locationId: string;

  beforeAll(async () => {
    world = await startWorld();
    const visitor = world.seed("visitor", "visitor@example.com");
    const participant = world.seed("participant", "participant@example.com");
    visitorCall = api(world, world.tokenFor(visitor));
    participantCall = api(world, world.tokenFor(participant));
    const created = await participantCall("POST", "meckenhausen/locations", { label: "Familie Addams", note: "", ...INSIDE });
    locationId = created.json.location.id;
  });
  afterAll(() => world.close());

  test("a visitor can read the map", async () => {
    const response = await visitorCall("GET", "meckenhausen/locations");
    expect(response.status).toBe(200);
    expect(response.json.locations).toHaveLength(1);
  });

  test("a visitor cannot create, edit or delete pins, or manage invites", async () => {
    const body = { label: "nope", note: "", ...INSIDE };
    expect((await visitorCall("POST", "meckenhausen/locations", body)).status).toBe(403);
    expect((await visitorCall("PATCH", `meckenhausen/locations/${locationId}`, body)).status).toBe(403);
    expect((await visitorCall("DELETE", `meckenhausen/locations/${locationId}`)).status).toBe(403);
    expect((await visitorCall("GET", "meckenhausen/invites")).status).toBe(403);
    expect((await visitorCall("POST", "meckenhausen/invites", { email: "x@example.com", role: "visitor" })).status).toBe(403);
    expect((await visitorCall("DELETE", "meckenhausen/invites/anything")).status).toBe(403);
    expect((await visitorCall("POST", "meckenhausen/invites/anything/erase")).status).toBe(403);
    expect((await visitorCall("GET", "meckenhausen/access-requests")).status).toBe(403);
    expect((await visitorCall("POST", "meckenhausen/access-requests/anything/allow", { role: "visitor" })).status).toBe(403);
    expect((await visitorCall("DELETE", "meckenhausen/access-requests/anything")).status).toBe(403);
  });

  test("a visitor can still remove themselves", async () => {
    const leaver = world.seed("visitor", "leaver@example.com");
    const call = api(world, world.tokenFor(leaver));
    expect((await call("DELETE", "meckenhausen/me")).status).toBe(204);
    expect((await call("GET", "meckenhausen/me")).status, "the session dies with the account").toBe(401);
  });
});

describe("pins: ownership, one per participant, validation, caching", () => {
  let world: World;
  let aliceCall: ReturnType<typeof api>;
  let bobCall: ReturnType<typeof api>;
  let alicesPin: string;

  beforeAll(async () => {
    world = await startWorld();
    aliceCall = api(world, world.tokenFor(world.seed("participant", "alice@example.com")));
    bobCall = api(world, world.tokenFor(world.seed("participant", "bob@example.com")));
  });
  afterAll(() => world.close());

  test("a participant gets exactly one pin", async () => {
    const first = await aliceCall("POST", "meckenhausen/locations", { label: "Familie Munster", note: "hi", ...INSIDE });
    expect(first.status).toBe(201);
    alicesPin = first.json.location.id;
    expect((await aliceCall("POST", "meckenhausen/locations", { label: "again", note: "", ...INSIDE })).status).toBe(409);
  });

  test("another participant cannot edit or delete it", async () => {
    const body = { label: "hijacked", note: "", ...INSIDE };
    expect((await bobCall("PATCH", `meckenhausen/locations/${alicesPin}`, body)).status).toBe(403);
    expect((await bobCall("DELETE", `meckenhausen/locations/${alicesPin}`)).status).toBe(403);
    const still = await aliceCall("GET", "meckenhausen/locations");
    expect(still.json.locations[0].label).toBe("Familie Munster");
  });

  test("an unknown pin is a 404", async () => {
    expect((await aliceCall("PATCH", "meckenhausen/locations/nope", { label: "x", note: "", ...INSIDE })).status).toBe(404);
    expect((await aliceCall("DELETE", "meckenhausen/locations/nope")).status).toBe(404);
  });

  test("the owner can edit and delete", async () => {
    const edited = await aliceCall("PATCH", `meckenhausen/locations/${alicesPin}`, { label: "Familie Stoker", note: "", ...INSIDE });
    expect(edited.status).toBe(200);
    expect(edited.json.location.label).toBe("Familie Stoker");
    expect((await aliceCall("DELETE", `meckenhausen/locations/${alicesPin}`)).status).toBe(204);
    expect((await aliceCall("GET", "meckenhausen/locations")).json.locations).toEqual([]);
  });

  test("the server re-validates everything the client already checked", async () => {
    const bad = async (body: unknown) => (await bobCall("POST", "meckenhausen/locations", body)).status;
    expect(await bad({ label: "Berlin", note: "", ...BERLIN }), "outside the boundary").toBe(400);
    expect(await bad({ label: "", note: "", ...INSIDE }), "empty label").toBe(400);
    expect(await bad({ label: "x".repeat(61), note: "", ...INSIDE }), "label too long").toBe(400);
    expect(await bad({ label: "ok", note: "x".repeat(501), ...INSIDE }), "note too long").toBe(400);
    expect(await bad({ label: "bell\u0007", note: "", ...INSIDE }), "control character").toBe(400);
    expect(await bad({ label: "ok", note: "", lat: "49.17", lng: 11.29 }), "coordinates must be numbers").toBe(400);
    expect(await bad({ label: "ok", note: "", lat: null, lng: null }), "null coordinates").toBe(400);
    expect(await bad({ label: "ok", note: "", lat: 91, lng: 11.29 }), "latitude out of range").toBe(400);
    expect(await bad({ label: "ok", lat: 49.17, lng: 11.29 }), "missing note").toBe(400);
    expect((await bobCall("GET", "meckenhausen/locations")).json.locations, "nothing invalid was stored").toEqual([]);
  });

  test("valid input is normalised: NFC text and 5-decimal coordinates", async () => {
    const response = await bobCall("POST", "meckenhausen/locations", {
      label: "  Café  ",
      note: "",
      lat: 49.170004999,
      lng: 11.290004999,
    });
    expect(response.status).toBe(201);
    expect(response.json.location.label).toBe("Café");
    expect(response.json.location.lat).toBe(49.17);
    expect(response.json.location.lng).toBe(11.29);
  });

  test("the locations list is private-cached with an ETag that revalidates to a 304 and changes on edit", async () => {
    const first = await aliceCall("GET", "meckenhausen/locations");
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    expect(first.headers.get("cache-control")).toBe("private, max-age=0, must-revalidate");

    expect((await aliceCall("GET", "meckenhausen/locations", undefined, { "If-None-Match": etag! })).status).toBe(304);

    await aliceCall("POST", "meckenhausen/locations", { label: "Familie Karloff", note: "", ...INSIDE });
    const changed = await aliceCall("GET", "meckenhausen/locations", undefined, { "If-None-Match": etag! });
    expect(changed.status, "a stale ETag no longer matches").toBe(200);
    expect(changed.headers.get("etag")).not.toBe(etag);
  });
});

describe("the event-end gate", () => {
  let world: World;
  beforeAll(async () => {
    world = await startWorld({ eventEndAt: PAST });
  });
  afterAll(() => world.close());

  test("after EVENT_END_AT the map serves nothing (410) but a person can still remove themselves", async () => {
    const participant = world.seed("participant", "late@example.com");
    const call = api(world, world.tokenFor(participant));

    expect((await call("GET", "meckenhausen/locations")).status).toBe(410);
    expect((await call("POST", "meckenhausen/locations", { label: "x", note: "", ...INSIDE })).status).toBe(410);
    expect((await call("GET", "meckenhausen/me")).status).toBe(410);
    expect((await api(world)("POST", "meckenhausen/magic-link", { email: "late@example.com" })).status).toBe(410);
    expect((await api(world)("POST", "meckenhausen/invites/abc/accept", { consent: true })).status).toBe(410);
    expect(
      (await api(world)("POST", "meckenhausen/access-requests", { email: "a@example.com", message: "", consent: true })).status,
    ).toBe(410);

    expect((await call("DELETE", "meckenhausen/me")).status, "GDPR withdrawal never expires").toBe(204);
  });
});

describe("invites", () => {
  let world: World;
  let inviterToken: string;
  let inviterCall: ReturnType<typeof api>;

  beforeAll(async () => {
    world = await startWorld({ inviteMaxPerParticipant: 3 });
    inviterToken = world.tokenFor(world.seed("participant", "inviter@example.com"));
    inviterCall = api(world, inviterToken);
  });
  afterAll(() => world.close());

  test("an invite never exposes its token hash, and the list omits it too", async () => {
    const created = await inviterCall("POST", "meckenhausen/invites", { email: "one@example.com", role: "visitor" });
    expect(created.status).toBe(201);
    expect(created.json.message).toBe("If that invite can be sent, it has been.");
    expect(JSON.stringify(created.json)).not.toContain("tokenHash");

    const list = await inviterCall("GET", "meckenhausen/invites");
    expect(list.json.invites).toHaveLength(1);
    expect(JSON.stringify(list.json)).not.toContain("tokenHash");
  });

  test("the invite endpoint validates its input", async () => {
    expect((await inviterCall("POST", "meckenhausen/invites", { email: "not-an-email", role: "visitor" })).status).toBe(400);
    expect((await inviterCall("POST", "meckenhausen/invites", { email: "a@example.com", role: "admin" })).status).toBe(400);
  });

  test("each participant has a lifetime invite cap (429)", async () => {
    expect((await inviterCall("POST", "meckenhausen/invites", { email: "two@example.com", role: "visitor" })).status).toBe(201);
    expect((await inviterCall("POST", "meckenhausen/invites", { email: "three@example.com", role: "visitor" })).status).toBe(201);
    expect((await inviterCall("POST", "meckenhausen/invites", { email: "four@example.com", role: "visitor" })).status).toBe(429);
  });

  test("an invite can only be revoked by whoever sent it", async () => {
    const [first] = (await inviterCall("GET", "meckenhausen/invites")).json.invites as { id: string }[];
    const stranger = api(world, world.tokenFor(world.seed("participant", "stranger@example.com")));
    expect((await stranger("DELETE", `meckenhausen/invites/${first.id}`)).status).toBe(403);
    expect((await inviterCall("DELETE", "meckenhausen/invites/no-such-invite")).status).toBe(404);
    expect((await inviterCall("DELETE", `meckenhausen/invites/${first.id}`)).status).toBe(204);
    const after = (await inviterCall("GET", "meckenhausen/invites")).json.invites as { id: string; revokedAt: string | null }[];
    expect(after.find((i) => i.id === first.id)?.revokedAt).toBeTruthy();
  });

  test("a revoked invite can be deleted by whoever sent it, a pending one can't", async () => {
    const invites = (await inviterCall("GET", "meckenhausen/invites")).json.invites as {
      id: string;
      revokedAt: string | null;
    }[];
    const revoked = invites.find((i) => i.revokedAt)!;
    const pending = invites.find((i) => !i.revokedAt)!;
    const stranger = api(world, world.tokenFor(world.seed("participant", "stranger2@example.com")));

    expect((await stranger("POST", `meckenhausen/invites/${revoked.id}/erase`)).status).toBe(403);
    expect((await inviterCall("POST", `meckenhausen/invites/${pending.id}/erase`)).status).toBe(409);
    expect((await inviterCall("POST", "meckenhausen/invites/no-such-invite/erase")).status).toBe(404);
    expect((await inviterCall("POST", `meckenhausen/invites/${revoked.id}/erase`)).status).toBe(204);

    const after = (await inviterCall("GET", "meckenhausen/invites")).json.invites as { id: string }[];
    expect(after.map((i) => i.id)).not.toContain(revoked.id);
    expect(after).toHaveLength(invites.length - 1);
  });
});

describe("requests to join", () => {
  let world: World;
  let participantCall: ReturnType<typeof api>;
  const anonymous = () => api(world);

  beforeAll(async () => {
    world = await startWorld();
    participantCall = api(world, world.tokenFor(world.seed("participant", "member@example.com")));
    world.seed("participant", "other-member@example.com");
    world.seed("visitor", "looker@example.com");
  });
  afterAll(() => world.close());

  const ask = (email: string, extra: Record<string, unknown> = {}) =>
    anonymous()("POST", "meckenhausen/access-requests", {
      email,
      message: "Anna, new on Kirchweg",
      consent: true,
      language: "es",
      ...extra,
    });

  test("anyone can ask without a session, but must consent and send valid input", async () => {
    expect((await ask("asker@example.com", { consent: false })).status).toBe(400);
    expect((await ask("not-an-email")).status).toBe(400);
    expect((await ask("long@example.com", { message: "x".repeat(281) })).status).toBe(400);
    expect((await ask("ctrl@example.com", { message: "bad\u0000" })).status).toBe(400);
    expect((await ask("lang@example.com", { language: "fr" })).status).toBe(400);
    expect((await anonymous()("POST", "no-such-space/access-requests", { email: "a@example.com", message: "", consent: true })).status).toBe(404);
  });

  test("a new, a repeated and a member's request all get the same reply (no membership oracle); participants hear once", async () => {
    const replies = [await ask("asker@example.com"), await ask("asker@example.com"), await ask("member@example.com")];
    for (const reply of replies) {
      expect(reply.status).toBe(202);
      expect(reply.json).toEqual({ message: "If your request can be passed on, it has been." });
    }
    const list = await participantCall("GET", "meckenhausen/access-requests");
    expect(list.json.requests.map((r: { email: string }) => r.email)).toEqual(["asker@example.com"]);
    expect(list.json.requests[0]).not.toHaveProperty("noticeVersion");

    // Participants are emailed once per batch, not once per request, and
    // visitors not at all. Checked here because vitest clears mock calls
    // between tests.
    expect(vi.mocked(world.mailer.sendAccessRequestNotice).mock.calls.map(([to]) => to).sort()).toEqual([
      "member@example.com",
      "other-member@example.com",
    ]);
    await ask("second@example.com");
    expect(world.mailer.sendAccessRequestNotice).toHaveBeenCalledTimes(2);
  });

  test("allowing sends an invite from the approver and removes the request", async () => {
    const [request] = (await participantCall("GET", "meckenhausen/access-requests")).json.requests as { id: string }[];
    expect((await participantCall("POST", `meckenhausen/access-requests/${request.id}/allow`, { role: "admin" })).status).toBe(400);
    const allowed = await participantCall("POST", `meckenhausen/access-requests/${request.id}/allow`, { role: "visitor" });
    expect(allowed.status).toBe(200);
    expect(allowed.json.devToken).toBeDefined();
    // In the language the requester asked in.
    expect(world.mailer.sendInvite).toHaveBeenCalledWith("asker@example.com", expect.any(String), expect.any(Date), "es");
    expect(allowed.json).not.toHaveProperty("inviteId");
    const after = (await participantCall("GET", "meckenhausen/access-requests")).json;
    expect((after.requests as { id: string }[]).map((r) => r.id)).not.toContain(request.id);
    // The other participants see it was answered, but not who asked.
    expect(after.answered[0]).toMatchObject({ outcome: "allowed", byYou: true, invite: "pending" });
    expect(JSON.stringify(after.answered)).not.toContain("asker@example.com");
    expect((await participantCall("POST", `meckenhausen/access-requests/${request.id}/allow`, { role: "visitor" })).status).toBe(404);
  });

  test("denying deletes the request and sends nothing", async () => {
    const [request] = (await participantCall("GET", "meckenhausen/access-requests")).json.requests as { id: string }[];
    const invitesBefore = vi.mocked(world.mailer.sendInvite).mock.calls.length;
    expect((await participantCall("DELETE", `meckenhausen/access-requests/${request.id}`)).status).toBe(204);
    expect((await participantCall("GET", "meckenhausen/access-requests")).json.requests).toEqual([]);
    expect(world.mailer.sendInvite).toHaveBeenCalledTimes(invitesBefore);
    expect((await participantCall("DELETE", `meckenhausen/access-requests/${request.id}`)).status).toBe(404);
  });

  test("once the list is empty again, the next request emails participants again", async () => {
    const before = vi.mocked(world.mailer.sendAccessRequestNotice).mock.calls.length;
    await ask("third@example.com");
    expect(world.mailer.sendAccessRequestNotice).toHaveBeenCalledTimes(before + 2);
  });

  test("a participant of another space can't see or answer this space's requests", async () => {
    const outsider = api(world, world.tokenFor(world.seed("participant", "outsider@example.com", OTHER_SPACE.id)));
    const [request] = (await participantCall("GET", "meckenhausen/access-requests")).json.requests as { id: string }[];
    expect((await outsider("GET", "meckenhausen/access-requests")).status).toBe(403);
    expect((await outsider("GET", "other-village/access-requests")).json.requests).toEqual([]);
    expect((await outsider("POST", `other-village/access-requests/${request.id}/allow`, { role: "visitor" })).status).toBe(404);
    expect((await outsider("DELETE", `other-village/access-requests/${request.id}`)).status).toBe(404);
  });
});

describe("accepting an invite", () => {
  let world: World;
  let inviterCall: ReturnType<typeof api>;

  async function invite(email: string, role: SpaceRole): Promise<string> {
    const response = await inviterCall("POST", "meckenhausen/invites", { email, role });
    return response.json.devToken as string;
  }

  beforeAll(async () => {
    world = await startWorld();
    inviterCall = api(world, world.tokenFor(world.seed("participant", "host@example.com")));
  });
  afterAll(() => world.close());

  test("consent is mandatory", async () => {
    const token = await invite("nc@example.com", "visitor");
    expect((await api(world)("POST", `meckenhausen/invites/${token}/accept`, { consent: false })).status).toBe(400);
    expect((await api(world)("POST", `meckenhausen/invites/${token}/accept`, {})).status).toBe(400);
  });

  test("an unknown or malformed token gives the same generic error (no oracle)", async () => {
    const response = await api(world)("POST", "meckenhausen/invites/nope/accept", { consent: true });
    expect(response.status).toBe(400);
    expect(response.json.error).toBe("Invalid or expired invite");
  });

  test("accepting creates the participant with the invited role, once", async () => {
    const token = await invite("new@example.com", "visitor");
    const accepted = await api(world)("POST", `meckenhausen/invites/${token}/accept`, { consent: true });
    expect(accepted.status).toBe(200);
    expect(accepted.json.participant).toMatchObject({ email: "new@example.com", role: "visitor" });
    expect(accepted.json.participant.consentAt).toBeTruthy();
    expect(accepted.json.participant.noticeVersion).toBeTruthy();

    const me = await api(world, accepted.json.token)("GET", "meckenhausen/me");
    expect(me.json.participant.role).toBe("visitor");

    const reuse = await api(world)("POST", `meckenhausen/invites/${token}/accept`, { consent: true });
    expect(reuse.status, "an invite is single-use").toBe(400);
  });

  test("a revoked invite cannot be accepted", async () => {
    const token = await invite("revoked@example.com", "visitor");
    const [mine] = ((await inviterCall("GET", "meckenhausen/invites")).json.invites as { id: string; email: string }[]).filter(
      (i) => i.email === "revoked@example.com",
    );
    await inviterCall("DELETE", `meckenhausen/invites/${mine.id}`);
    expect((await api(world)("POST", `meckenhausen/invites/${token}/accept`, { consent: true })).status).toBe(400);
  });

  test("inviting an existing participant silently sends nothing (no membership oracle)", async () => {
    world.seed("visitor", "existing@example.com");
    const response = await inviterCall("POST", "meckenhausen/invites", { email: "existing@example.com", role: "visitor" });
    expect(response.status).toBe(201);
    expect(response.json.message).toBe("If that invite can be sent, it has been.");
    expect(response.json).not.toHaveProperty("devToken");
  });

  test("someone who joined between being invited and accepting gets a 409", async () => {
    const token = await invite("race@example.com", "visitor");
    world.seed("visitor", "race@example.com");
    expect((await api(world)("POST", `meckenhausen/invites/${token}/accept`, { consent: true })).status).toBe(409);
  });
});

describe("sign-in link", () => {
  let world: World;
  beforeAll(async () => {
    world = await startWorld();
    world.seed("participant", "neighbor@example.com");
  });
  afterAll(() => world.close());

  test("a participant and a stranger get the identical response (no enumeration), only the participant gets a usable token in dev", async () => {
    const participant = await api(world)("POST", "meckenhausen/magic-link", { email: "neighbor@example.com" });
    const stranger = await api(world)("POST", "meckenhausen/magic-link", { email: "stranger@example.com" });
    expect(participant.status).toBe(200);
    expect(stranger.status).toBe(200);
    expect(participant.json.message).toBe(stranger.json.message);
    expect(participant.json.devToken).toBeTruthy();
    expect(stranger.json).not.toHaveProperty("devToken");
  });

  test("a sign-in token verifies once into a session for the right space only", async () => {
    const wrong = await api(world)("POST", "meckenhausen/magic-link", { email: "neighbor@example.com" });
    // Fails closed (400). The token is consumed by the attempt - it fails safe, it just can't be reused.
    expect((await api(world)("POST", "other-village/verify", { token: wrong.json.devToken })).status, "wrong space").toBe(400);

    const right = await api(world)("POST", "meckenhausen/magic-link", { email: "neighbor@example.com" });
    const ok = await api(world)("POST", "meckenhausen/verify", { token: right.json.devToken });
    expect(ok.status).toBe(200);
    expect(ok.json.participant.email).toBe("neighbor@example.com");
    expect((await api(world)("POST", "meckenhausen/verify", { token: right.json.devToken })).status, "single use").toBe(400);
  });

  test("the link comes in the requested language; an older client that sends none gets German", async () => {
    vi.mocked(world.mailer.sendMagicLink).mockClear();
    await api(world)("POST", "meckenhausen/magic-link", { email: "neighbor@example.com", language: "es" });
    await api(world)("POST", "meckenhausen/magic-link", { email: "neighbor@example.com" });
    expect(vi.mocked(world.mailer.sendMagicLink).mock.calls.map((call) => call[2])).toEqual(["es", "de"]);
  });

  test("a malformed body is a 400", async () => {
    expect((await api(world)("POST", "meckenhausen/magic-link", { email: "nope" })).status).toBe(400);
    expect((await api(world)("POST", "meckenhausen/magic-link", { email: "a@example.com", language: "xx" })).status).toBe(400);
  });
});

describe("the language the map is shown in", () => {
  let world: World;
  beforeAll(async () => {
    world = await startWorld();
  });
  afterAll(() => world.close());

  test("is stored for the signed-in person, whatever their role, for their emails", async () => {
    for (const role of ["participant", "visitor"] as const) {
      const person = world.seed(role, `${role}-lang@example.com`);
      const response = await api(world, world.tokenFor(person))("PUT", "meckenhausen/me/language", { language: "es" });
      expect(response.status, role).toBe(204);
      expect((await world.participants.findById(person.id))?.language, role).toBe("es");
    }
  });

  test("must be one of the app's languages", async () => {
    const person = world.seed("visitor", "lang-bad@example.com");
    const call = api(world, world.tokenFor(person));
    expect((await call("PUT", "meckenhausen/me/language", { language: "fr" })).status).toBe(400);
    expect((await call("PUT", "meckenhausen/me/language", {})).status).toBe(400);
  });
});

describe("request bodies", () => {
  let world: World;
  beforeAll(async () => {
    world = await startWorld();
  });
  afterAll(() => world.close());

  async function rawPost(body: string) {
    const response = await fetch(`${world.base}/spaces/meckenhausen/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return { status: response.status, json: (await response.json()) as { error: string } };
  }

  test("a body over the limit is a 413, and invalid JSON a 400, neither logged", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const tooLarge = await rawPost(JSON.stringify({ email: "a@example.com", padding: "x".repeat(10_000) }));
      expect(tooLarge.status).toBe(413);
      expect(tooLarge.json.error).toBe("Request body too large");

      const malformed = await rawPost('{"email": "secret-body@example.com"');
      expect(malformed.status).toBe(400);
      expect(malformed.json.error).toBe("Malformed request body");

      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  test("the largest legitimate pin (all 4-byte emoji) fits under the limit", () => {
    const pin = { lat: 49.17123, lng: 11.29123, label: "🎃".repeat(60), note: "👻".repeat(500), consent: true };
    expect(Buffer.byteLength(JSON.stringify(pin))).toBeLessThan(8 * 1024);
  });
});
