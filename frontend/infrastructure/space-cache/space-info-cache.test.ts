import { describe, expect, it } from "vitest";
import { readCachedSpace, writeCachedSpace } from "infrastructure/space-cache/space-info-cache.ts";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    data,
  };
}

const SPACE = { id: "s1", slug: "meckenhausen", name: "Meckenhausen Halloween", createdAt: "2026-09-01T00:00:00.000Z" };

describe("space info cache", () => {
  it("round-trips a space by slug", () => {
    const storage = fakeStorage();
    writeCachedSpace(SPACE, storage);
    expect(readCachedSpace("meckenhausen", storage)).toEqual(SPACE);
  });

  it("returns null for an unknown slug, corrupt JSON, or a record for a different slug", () => {
    expect(readCachedSpace("nope", fakeStorage())).toBeNull();
    expect(readCachedSpace("meckenhausen", fakeStorage({ "space-info:meckenhausen": "{not json" }))).toBeNull();
    expect(
      readCachedSpace("meckenhausen", fakeStorage({ "space-info:meckenhausen": JSON.stringify({ ...SPACE, slug: "other" }) })),
    ).toBeNull();
  });

  it("never throws when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => writeCachedSpace(SPACE, blocked)).not.toThrow();
    expect(readCachedSpace("meckenhausen", blocked)).toBeNull();
  });
});
