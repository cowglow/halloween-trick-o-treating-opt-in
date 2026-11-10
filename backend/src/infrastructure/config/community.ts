import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { LANGUAGES } from "../../domain/i18n/language.js";

// Where and when this map runs: community/community.json at the repo root
// (see community/README.md), read once at startup. The frontend bundles the
// same file (frontend/domain/community/community-config.ts). In Docker the
// file is mounted and COMMUNITY_CONFIG points at it (docker-compose*.yml).
const communitySchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "use lowercase letters, numbers, and hyphens only"),
  organizer: z.string().min(1),
  // Named in the privacy notice (frontend only).
  hostingProvider: z.string().min(1),
  timeZone: z.string().refine((zone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  }, "must be an IANA time zone, like Europe/Berlin"),
  eventEndAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "must be an ISO 8601 date-time"),
  defaultLanguage: z.enum(LANGUAGES),
  map: z.object({
    center: z.object({ lat: z.number(), lng: z.number() }),
    // [lng, lat] pairs, closed (first point repeated at the end).
    boundary: z.array(z.tuple([z.number(), z.number()])).min(4),
    tiles: z.string().min(1),
  }),
});

export type CommunityConfig = z.infer<typeof communitySchema>;

export function parseCommunityConfig(raw: unknown): CommunityConfig {
  const result = communitySchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`community/community.json is invalid: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return result.data;
}

// src/infrastructure/config (or dist/...) is four levels below the repo root.
const DEFAULT_PATH = fileURLToPath(new URL("../../../../community/community.json", import.meta.url));

export const COMMUNITY: CommunityConfig = parseCommunityConfig(
  JSON.parse(readFileSync(process.env.COMMUNITY_CONFIG || DEFAULT_PATH, "utf-8")),
);
