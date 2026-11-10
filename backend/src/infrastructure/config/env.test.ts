import { describe, expect, test } from "vitest";
import { readDate, readNumber } from "./env.js";

describe("readNumber", () => {
  test('falls back when unset or empty (compose passes unset vars as "")', () => {
    expect(readNumber({}, "X", 10)).toBe(10);
    expect(readNumber({ X: "" }, "X", 10)).toBe(10);
  });

  test("reads a number", () => {
    expect(readNumber({ X: "25" }, "X", 10)).toBe(25);
  });

  test("refuses garbage, zero and negatives", () => {
    expect(() => readNumber({ X: "ten" }, "X", 10)).toThrow(
      /X must be a positive number/,
    );
    expect(() => readNumber({ X: "0" }, "X", 10)).toThrow();
    expect(() => readNumber({ X: "-5" }, "X", 10)).toThrow();
  });
});

describe("readDate", () => {
  const fallback = "2026-11-01T00:00:00+01:00";

  test("falls back when unset or empty", () => {
    expect(readDate({}, "D", fallback).toISOString()).toBe(
      "2026-10-31T23:00:00.000Z",
    );
    expect(readDate({ D: " " }, "D", fallback).toISOString()).toBe(
      "2026-10-31T23:00:00.000Z",
    );
  });

  test("reads a date-time", () => {
    expect(
      readDate({ D: "2026-11-01T06:00:00+01:00" }, "D", fallback).toISOString(),
    ).toBe("2026-11-01T05:00:00.000Z");
  });

  test("refuses an unparseable date instead of never ending the event", () => {
    expect(() => readDate({ D: "Halloween" }, "D", fallback)).toThrow(
      /D must be an ISO 8601 date-time/,
    );
  });
});
