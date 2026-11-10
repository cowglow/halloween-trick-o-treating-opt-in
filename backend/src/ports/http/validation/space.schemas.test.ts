import { describe, expect, test } from "vitest";
import { inviteCreateSchema, locationWriteSchema } from "./space.schemas.js";
import { COMMUNITY } from "../../../infrastructure/config/community.js";

const CENTER = COMMUNITY.map.center;

describe("locationWriteSchema", () => {
  const valid = { label: "Cage Family", note: "Ring twice", lat: CENTER.lat, lng: CENTER.lng };

  test("accepts a valid pin", () => {
    expect(locationWriteSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects a pin outside the boundary even if lat/lng are otherwise valid numbers", () => {
    const result = locationWriteSchema.safeParse({ ...valid, lat: 48.0, lng: 10.0 });
    expect(result.success).toBe(false);
  });

  test("rejects a label over 60 characters", () => {
    const result = locationWriteSchema.safeParse({ ...valid, label: "x".repeat(61) });
    expect(result.success).toBe(false);
  });

  test("rejects an empty label", () => {
    const result = locationWriteSchema.safeParse({ ...valid, label: "   " });
    expect(result.success).toBe(false);
  });

  test("allows an empty note", () => {
    expect(locationWriteSchema.safeParse({ ...valid, note: "" }).success).toBe(true);
  });

  test("rejects a note over 500 characters", () => {
    const result = locationWriteSchema.safeParse({ ...valid, note: "x".repeat(501) });
    expect(result.success).toBe(false);
  });

  test("rejects control characters in the label", () => {
    const result = locationWriteSchema.safeParse({ ...valid, label: "Cage\u0000Family" });
    expect(result.success).toBe(false);
  });

  test("a script-tag payload is accepted as plain text (rendering safety is a frontend concern)", () => {
    const result = locationWriteSchema.safeParse({ ...valid, note: "<script>alert(1)</script>" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe("<script>alert(1)</script>");
    }
  });

  test("rounds coordinates to 5 decimal places", () => {
    const result = locationWriteSchema.safeParse({ ...valid, lat: 49.171826999, lng: 11.289077777 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lat).toBeCloseTo(49.17183, 5);
      expect(result.data.lng).toBeCloseTo(11.28908, 5);
    }
  });

  test("rejects non-finite coordinates", () => {
    expect(locationWriteSchema.safeParse({ ...valid, lat: Number.NaN }).success).toBe(false);
    expect(locationWriteSchema.safeParse({ ...valid, lng: Number.POSITIVE_INFINITY }).success).toBe(false);
  });
});

describe("inviteCreateSchema", () => {
  test("accepts a valid invite", () => {
    expect(inviteCreateSchema.safeParse({ email: "neighbor@example.com", role: "visitor" }).success).toBe(true);
  });

  test("rejects an invalid role (no arbitrary role escalation via a bad enum value)", () => {
    expect(inviteCreateSchema.safeParse({ email: "neighbor@example.com", role: "admin" }).success).toBe(false);
  });

  test("rejects an invalid email", () => {
    expect(inviteCreateSchema.safeParse({ email: "not-an-email", role: "visitor" }).success).toBe(false);
  });
});
