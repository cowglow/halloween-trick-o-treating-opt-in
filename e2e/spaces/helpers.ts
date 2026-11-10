import { execFileSync } from "node:child_process";
import type { APIRequestContext, BrowserContext } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000";
export const SPACE_SLUG = process.env.E2E_SPACE_SLUG ?? "meckenhausen";
export const SEED_PARTICIPANT_EMAIL = process.env.E2E_SPACE_SEED_EMAIL ?? "participant@example.test";
export const TEST_EMAIL_DOMAIN = "example.test";
// The event end the e2e stack runs with (the frontend's VITE_EVENT_END_AT via
// playwright.spaces.config.ts, the API's EVENT_END_AT via docker-compose.yml):
// far away, so the suite keeps working after the real event.
export const E2E_EVENT_END_AT = process.env.E2E_EVENT_END_AT ?? "2099-11-01T00:00:00+01:00";

const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

export function uniqueEmail(prefix: string): string {
  return `e2e-${prefix}-${runId}@${TEST_EMAIL_DOMAIN}`;
}

// The trick-or-treat rules pop up over the map the first time it opens in a
// browser. Tests that aren't about them mark them as already seen.
export async function skipRules(context: BrowserContext): Promise<void> {
  await context.addInitScript((slug) => localStorage.setItem(`space-rules-seen:${slug}`, "1"), SPACE_SLUG);
}

export function spaceUrl(path = ""): string {
  return `./#/${SPACE_SLUG}${path}`;
}

// Relies on the API running in dev mode, where the magic-link/invite
// responses carry a `devToken` (see docs/WORKLOG.md, 2026-09-23) - the same
// convenience the app's own sign-in form uses.
export async function signInViaApi(request: APIRequestContext, email: string): Promise<string> {
  const link = await request.post(`${API_URL}/spaces/${SPACE_SLUG}/magic-link`, { data: { email } });
  const { devToken } = (await link.json()) as { devToken?: string };
  if (!devToken) {
    throw new Error(
      `No devToken for ${email}: is the API in dev mode, and is that email a participant of "${SPACE_SLUG}"? ` +
        "(pnpm seed:space with SEED_SPACE_PARTICIPANT_EMAIL set)",
    );
  }
  const verify = await request.post(`${API_URL}/spaces/${SPACE_SLUG}/verify`, { data: { token: devToken } });
  return ((await verify.json()) as { token: string }).token;
}

export async function inviteViaApi(
  request: APIRequestContext,
  sessionToken: string,
  email: string,
  role: "participant" | "visitor",
): Promise<string> {
  const response = await request.post(`${API_URL}/spaces/${SPACE_SLUG}/invites`, {
    data: { email, role },
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  const { devToken } = (await response.json()) as { devToken?: string };
  if (!response.ok() || !devToken) {
    throw new Error(`Invite for ${email} failed: ${response.status()} ${await response.text()}`);
  }
  return devToken;
}

// A participant's accepted invites stay on their record by design, and each
// participant has a lifetime invite cap, so without this the seeded
// participant would eventually run out. Best-effort and tightly scoped: only
// rows whose email is one of this suite's own throwaway addresses, via the
// local dev container - skipped silently if docker/the container isn't there.
export function cleanUpTestRows(): void {
  const mine = `SELECT id FROM "SpaceParticipant" WHERE email LIKE 'e2e-%@${TEST_EMAIL_DOMAIN}'`;
  const sql =
    `DELETE FROM "SpaceLocation" WHERE "participantId" IN (${mine});` +
    `DELETE FROM "SpaceMagicLinkToken" WHERE "participantId" IN (${mine});` +
    `DELETE FROM "SpaceInvite" WHERE email LIKE 'e2e-%@${TEST_EMAIL_DOMAIN}' OR "inviterParticipantId" IN (${mine});` +
    `DELETE FROM "SpaceAccessRequest" WHERE email LIKE 'e2e-%@${TEST_EMAIL_DOMAIN}';` +
    `DELETE FROM "SpaceParticipant" WHERE email LIKE 'e2e-%@${TEST_EMAIL_DOMAIN}';`;
  try {
    execFileSync("docker", ["exec", "halloween-map-db", "psql", "-U", "app", "-d", "contact_book", "-c", sql], {
      stdio: "ignore",
    });
  } catch {
    // no docker, or a differently-named container: leave the rows
  }
}
