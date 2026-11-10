import { describe, expect, test } from "vitest";
import { SpaceApiError } from "infrastructure/api/space-api-client.ts";
import { apiErrorMessage } from "ports/pages/space/api-error-message.ts";
import de from "ports/i18n/translations/de.ts";

describe("apiErrorMessage", () => {
  test("never shows the API's English text", () => {
    expect(
      apiErrorMessage(
        new SpaceApiError("Invalid request body", 400),
        de,
        "Fallback",
      ),
    ).toBe("Fallback");
  });

  test("translates being offline and being rate-limited", () => {
    expect(
      apiErrorMessage(
        new SpaceApiError("Unable to reach the server.", 0),
        de,
        "Fallback",
      ),
    ).toBe(de.spaceApp.networkError);
    expect(
      apiErrorMessage(new SpaceApiError("Too many", 429), de, "Fallback"),
    ).toBe(de.spaceApp.tooManyRequests);
  });

  test("uses the fallback for anything that isn't an API error", () => {
    expect(apiErrorMessage(new Error("boom"), de, "Fallback")).toBe("Fallback");
  });
});
