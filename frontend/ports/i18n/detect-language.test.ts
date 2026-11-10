import { describe, expect, test } from "vitest";
import { detectLanguage } from "ports/i18n/detect-language.ts";

describe("detectLanguage", () => {
  test("picks the first supported language, regional variants included", () => {
    expect(detectLanguage(["de-DE", "en-US"])).toBe("de");
    expect(detectLanguage(["de-AT"])).toBe("de");
    expect(detectLanguage(["es-MX", "de"])).toBe("es");
  });

  test("skips languages without a translation", () => {
    expect(detectLanguage(["fr-FR", "de-DE"])).toBe("de");
  });

  test("falls back to English", () => {
    expect(detectLanguage(["fr-FR", "it"])).toBe("en");
    expect(detectLanguage([])).toBe("en");
  });
});
