import { describe, expect, it } from "vitest";
import { toSpaceSession } from "infrastructure/api/space-api-client.ts";

describe("toSpaceSession", () => {
  it("maps the API's participant `id` to the session's `participantId`", () => {
    expect(
      toSpaceSession({ token: "t", participant: { id: "p-1", email: "a@example.com", role: "participant" } }),
    ).toEqual({ token: "t", participantId: "p-1", email: "a@example.com", role: "participant" });
  });

  it("never yields an undefined participantId for a real /verify response shape", () => {
    const apiResponse = {
      token: "t",
      participant: { id: "p-2", spaceId: "s", email: "b@example.com", role: "visitor" as const, consentAt: "x", noticeVersion: "v", createdAt: "y" },
    };
    expect(toSpaceSession(apiResponse).participantId).toBe("p-2");
  });
});
