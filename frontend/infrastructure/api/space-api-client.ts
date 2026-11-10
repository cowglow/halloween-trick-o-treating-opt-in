import type { SpaceLocation, SpaceRole } from "domain/space/space.types.ts";

// Sessions are stored per space, so a browser can hold sessions for several
// spaces at once without ever sending one space's token to another.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class SpaceApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// docs/SPEC.md section 3: "After [EVENT_END_AT], the API returns 410 and serves no
// location data" - a dedicated status check (rather than folding it into
// SpaceApiError) so callers can route it to one clear "this map has ended"
// screen instead of a generic error message.
export class SpaceEventEndedError extends Error {
  constructor() {
    super("This map has ended and its data has been removed.");
  }
}

function tokenKey(spaceSlug: string): string {
  return `space-session:${spaceSlug}`;
}

export type SpaceSession = { token: string; participantId: string; email: string; role: SpaceRole };

// What /verify and /invites/:token/accept return: the participant row, whose
// key is `id` (the stored session calls it `participantId`). Reading
// `participant.participantId` off this was undefined, so the app never
// recognised which pin was the signed-in participant's own.
export type SpaceAuthResponse = { token: string; participant: { id: string; email: string; role: SpaceRole } };

export function toSpaceSession(response: SpaceAuthResponse): SpaceSession {
  return {
    token: response.token,
    participantId: response.participant.id,
    email: response.participant.email,
    role: response.participant.role,
  };
}

export function getSpaceSession(spaceSlug: string): SpaceSession | null {
  try {
    const raw = localStorage.getItem(tokenKey(spaceSlug));
    return raw ? (JSON.parse(raw) as SpaceSession) : null;
  } catch {
    return null;
  }
}

export function setSpaceSession(spaceSlug: string, session: SpaceSession): void {
  localStorage.setItem(tokenKey(spaceSlug), JSON.stringify(session));
}

export function clearSpaceSession(spaceSlug: string): void {
  localStorage.removeItem(tokenKey(spaceSlug));
}

export async function spaceApiFetch<T>(spaceSlug: string | null, path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  const session = spaceSlug ? getSpaceSession(spaceSlug) : null;
  if (session) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new SpaceApiError("Unable to reach the server. Check your connection and try again.", 0);
  }

  if (response.status === 410) {
    throw new SpaceEventEndedError();
  }

  if (!response.ok) {
    if (response.status === 401 && spaceSlug) {
      // A session that's no longer valid shouldn't keep being sent on every
      // subsequent call.
      clearSpaceSession(spaceSlug);
    }
    const body = await response.json().catch(() => ({}) as { error?: string });
    throw new SpaceApiError(body.error ?? `Request failed with status ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// docs/SPEC.md section 6: "revalidate with a conditional request (ETag/
// If-None-Match, cheap 304)". Separate from spaceApiFetch above because a 304
// has no body and isn't `response.ok` (it's outside the 200-299 range), so
// the generic error-parsing path there doesn't apply here - a 304 is success,
// just "nothing changed."
export async function fetchLocationsRevalidated(
  spaceSlug: string,
  etag: string | null,
): Promise<{ status: "not-modified" } | { status: "ok"; locations: SpaceLocation[]; etag: string | null }> {
  const session = getSpaceSession(spaceSlug);
  const headers: Record<string, string> = {};
  if (session) headers.Authorization = `Bearer ${session.token}`;
  if (etag) headers["If-None-Match"] = etag;

  const response = await fetch(`${API_URL}/spaces/${spaceSlug}/locations`, { headers });

  if (response.status === 304) {
    return { status: "not-modified" };
  }
  if (response.status === 410) {
    throw new SpaceEventEndedError();
  }
  if (!response.ok) {
    if (response.status === 401) clearSpaceSession(spaceSlug);
    const body = await response.json().catch(() => ({}) as { error?: string });
    throw new SpaceApiError(body.error ?? `Request failed with status ${response.status}`, response.status);
  }
  const body = (await response.json()) as { locations: SpaceLocation[] };
  return { status: "ok", locations: body.locations, etag: response.headers.get("ETag") };
}
