// The Cache Storage names public/sw.js uses (its CACHE_VERSION), duplicated
// here because sw.js is a plain static file that can't import this module.
// Prefixed, because Cache Storage is per origin and an origin can be shared
// (the site first lived on cowglow.github.io, shared with every other GitHub
// Pages site of that account): this app only ever touches its own caches. "map-vN" is the
// unprefixed name this app used before.
export const APP_CACHE_PREFIX = "halloween-map-";
const LEGACY_APP_CACHE = /^map-v\d+$/;

export function isAppCacheName(name: string): boolean {
  return name.startsWith(APP_CACHE_PREFIX) || LEGACY_APP_CACHE.test(name);
}

// docs/SPEC.md section 6: "clear IndexedDB and caches on sign-out, on 401, on
// 'Remove me', and on 410". The caches hold only static files (no API
// responses), so this is hygiene rather than a privacy necessity; the cost is
// re-downloading the ~2 MB tile archive. The service worker refills them as
// the app is used again.
export async function clearAppCaches(): Promise<void> {
  if (!("caches" in globalThis)) return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names.filter(isAppCacheName).map((name) => caches.delete(name)),
    );
  } catch {
    // storage blocked: nothing was cached either
  }
}
