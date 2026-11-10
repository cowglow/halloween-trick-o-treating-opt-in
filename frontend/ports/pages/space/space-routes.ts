import { COMMUNITY } from "domain/community/community-config.ts";

// The app mounts at the root of its own HashRouter (frontend/spaces-main.tsx).
// Routing every navigate()/<Link to> through these functions keeps the URL
// shape defined in exactly one place.
//
// There's no more "create a space" route (docs/SPEC.md section 2: "NO public
// access" - a space's first participant comes from `pnpm seed:space`, see
// docs/WORKLOG.md), so `/` redirects to the one deployed space rather than
// showing a form - see SpaceApp.tsx.
export const spacePaths = {
  home: (spaceSlug: string) => `/${spaceSlug}`,
  invite: (spaceSlug: string) => `/${spaceSlug}/invite`,
  requestAccess: (spaceSlug: string) => `/${spaceSlug}/request-access`,
  privacy: (spaceSlug: string) => `/${spaceSlug}/privacy`,
  share: (spaceSlug: string) => `/${spaceSlug}/share`,
};

// The one space this deployment serves - single-purpose app (docs/SPEC.md section
// 1's pivot), not the old multi-space self-serve product. Configurable so the
// same build can be repointed at a different space slug another year without
// a code change.
export const DEFAULT_SPACE_SLUG = import.meta.env.VITE_SPACE_SLUG ?? COMMUNITY.slug;
