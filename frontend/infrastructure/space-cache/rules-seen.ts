// Whether this browser has already shown the trick-or-treat rules for a space,
// so they pop up on the first visit to the map and not every time. Not
// personal data, just a flag; if storage is blocked the rules show again,
// which is the safe way to fail.
const key = (slug: string) => `space-rules-seen:${slug}`;

export function hasSeenRules(slug: string, storage: Pick<Storage, "getItem"> = localStorage): boolean {
  try {
    return storage.getItem(key(slug)) === "1";
  } catch {
    return false;
  }
}

export function markRulesSeen(slug: string, storage: Pick<Storage, "setItem"> = localStorage): void {
  try {
    storage.setItem(key(slug), "1");
  } catch {
    // storage blocked/full: they'll see the rules again next time
  }
}
