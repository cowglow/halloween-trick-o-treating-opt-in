import { z } from "zod";
import { hasDisallowedControlCharacters, normalizeSpaceText, roundCoordinate } from "../../../domain/space/text-sanitize.js";
import { isInsideBoundary } from "../../../domain/space/point-in-polygon.js";
import { COMMUNITY } from "../../../infrastructure/config/community.js";
import { languageSchema } from "./language.schema.js";
import { LANGUAGES } from "../../../domain/i18n/language.js";

// Only used by the seed script now - there's no public POST / route any more
// (docs/SPEC.md section 2: "NO public access").
export const spaceCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "use lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(1).max(200),
});

export const spaceRoleSchema = z.enum(["participant", "visitor"]);

export const inviteCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: spaceRoleSchema,
  language: languageSchema,
});

// Required here: this request exists only to say it.
export const languageUpdateSchema = z.object({
  language: z.enum(LANGUAGES),
});

export const acceptInviteSchema = z.object({
  consent: z.boolean(),
  language: languageSchema,
});

export const allowAccessRequestSchema = z.object({
  role: spaceRoleSchema,
});

// Trim + Unicode NFC normalize first, then reject control characters, then
// enforce length - in that order, since "1-60 chars" (section 8) is measured
// on the normalized value, not the raw one.
function spaceText(min: number, max: number) {
  return z
    .string()
    .transform((value) => normalizeSpaceText(value))
    .refine((value) => !hasDisallowedControlCharacters(value), { message: "Contains a disallowed control character" })
    .refine((value) => value.length >= min, { message: min === 0 ? "" : "Required" })
    .refine((value) => value.length <= max, { message: `Must be ${max} characters or fewer` });
}

// Finite, in-range, rounded to 5 decimals, then validated against the
// Meckenhausen boundary polygon - all server-side (docs/SPEC.md section 8), never
// trusting whatever the client's point-in-polygon check already did.
const latSchema = z
  .number()
  .finite()
  .min(-90)
  .max(90)
  .transform((value) => roundCoordinate(value));
const lngSchema = z
  .number()
  .finite()
  .min(-180)
  .max(180)
  .transform((value) => roundCoordinate(value));

export const locationWriteSchema = z
  .object({
    label: spaceText(1, 60),
    note: spaceText(0, 500),
    lat: latSchema,
    lng: lngSchema,
  })
  .refine((value) => isInsideBoundary(COMMUNITY.map.boundary, value.lat, value.lng), {
    message: "That location is outside the Meckenhausen map area",
    path: ["lat"],
  });

// The note is shown to every participant, so the same text rules as a pin's.
export const accessRequestCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  message: spaceText(0, 280),
  consent: z.boolean(),
  language: languageSchema,
});
