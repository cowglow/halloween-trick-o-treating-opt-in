import type { Space } from "domain/space/space.types.ts";

// The village name is fetched (public, unauthenticated) on every page load just to
// show a heading. When the network is unreachable that one failed request used to
// turn the whole app into "Couldn't load this space", even though the pins were
// cached. Remember the last good answer so the page can still render offline.
const key = (slug: string) => `space-info:${slug}`;

export function writeCachedSpace(space: Space, storage: Pick<Storage, "setItem"> = localStorage): void {
  try {
    storage.setItem(key(space.slug), JSON.stringify(space));
  } catch {
    // storage blocked/full: the cache is a convenience, never the source of truth
  }
}

export function readCachedSpace(slug: string, storage: Pick<Storage, "getItem"> = localStorage): Space | null {
  try {
    const raw = storage.getItem(key(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Space>;
    return parsed.slug === slug && typeof parsed.name === "string" ? (parsed as Space) : null;
  } catch {
    return null;
  }
}
