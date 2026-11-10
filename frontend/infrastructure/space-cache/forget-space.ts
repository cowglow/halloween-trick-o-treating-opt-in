import { clearSpaceSession } from "infrastructure/api/space-api-client.ts";
import { clearSpaceCache } from "infrastructure/space-cache/location-cache.ts";
import { clearAppCaches } from "infrastructure/service-worker/app-caches.ts";

// docs/SPEC.md section 6 personal data hygiene: everything this browser holds
// for a space, dropped together on sign-out, 401, "Remove me" and 410 (event
// ended), so no path forgets one part: the session token, the cached pins and
// the service worker's caches.
export async function forgetSpaceLocally(spaceSlug: string): Promise<void> {
  clearSpaceSession(spaceSlug);
  await Promise.all([clearSpaceCache(spaceSlug), clearAppCaches()]);
}
