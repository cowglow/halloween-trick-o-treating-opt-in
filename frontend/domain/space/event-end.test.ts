import { describe, expect, it } from "vitest";
import { DEFAULT_EVENT_END_AT, eventEndAt, hasEventEnded } from "domain/space/event-end.ts";

describe("event end", () => {
  it("uses the configured end", () => {
    expect(eventEndAt("2027-11-01T00:00:00+01:00").toISOString()).toBe("2027-10-31T23:00:00.000Z");
  });

  it("falls back to the default when unset, empty (an unset repository variable) or not a date", () => {
    const fallback = new Date(DEFAULT_EVENT_END_AT).getTime();
    for (const configured of [undefined, "", "soon"]) {
      expect(eventEndAt(configured).getTime()).toBe(fallback);
    }
  });

  it("has ended from the very moment of the end", () => {
    const end = new Date("2026-10-31T23:00:00Z");
    expect(hasEventEnded(end, new Date("2026-10-31T22:59:59Z"))).toBe(false);
    expect(hasEventEnded(end, end)).toBe(true);
  });
});
