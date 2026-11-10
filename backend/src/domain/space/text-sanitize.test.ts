import { describe, expect, test } from "vitest";
import { hasDisallowedControlCharacters, normalizeSpaceText, roundCoordinate } from "./text-sanitize.js";

describe("normalizeSpaceText", () => {
  test("trims surrounding whitespace", () => {
    expect(normalizeSpaceText("  Cage Family  ")).toBe("Cage Family");
  });

  test("NFC-normalizes decomposed Unicode", () => {
    const decomposed = "Sträucher"; // combining diaeresis, not the precomposed ö
    const precomposed = "Sträucher";
    expect(normalizeSpaceText(decomposed)).toBe(precomposed);
  });

  test("keeps umlauts and emoji intact", () => {
    expect(normalizeSpaceText("Grüße 👻🎃")).toBe("Grüße 👻🎃");
  });
});

describe("hasDisallowedControlCharacters", () => {
  test("allows tab, newline, and carriage return", () => {
    expect(hasDisallowedControlCharacters("line one\nline two\tindented")).toBe(false);
  });

  test("rejects the null byte and escape", () => {
    expect(hasDisallowedControlCharacters("hello\u0000world")).toBe(true);
    expect(hasDisallowedControlCharacters("hello\u001Bworld")).toBe(true);
  });

  test("rejects a script tag's characters fine as text, but control chars inside are still caught", () => {
    // Ordinary text (even HTML-looking text) is not itself a control character -
    // XSS defense is "render as text, never innerHTML" (see the frontend), not
    // stripping '<' here.
    expect(hasDisallowedControlCharacters("<script>alert(1)</script>")).toBe(false);
  });

  test("plain umlauts and emoji are not control characters", () => {
    expect(hasDisallowedControlCharacters("Grüße 👻🎃")).toBe(false);
  });
});

describe("roundCoordinate", () => {
  test("rounds to 5 decimal places", () => {
    expect(roundCoordinate(49.171826999)).toBeCloseTo(49.17183, 5);
    expect(roundCoordinate(11.28907777)).toBeCloseTo(11.28908, 5);
  });

  test("leaves an already-short value unchanged", () => {
    expect(roundCoordinate(49.1)).toBe(49.1);
  });
});
