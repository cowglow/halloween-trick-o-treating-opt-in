import { SpaceApiError } from "infrastructure/api/space-api-client.ts";
import type { Translations } from "ports/i18n/translations/index.ts";

// The API's own `error` texts are English and written for developers, so the
// UI never shows them: it picks a translated message by status, and otherwise
// the caller's message for what was being attempted.
export function apiErrorMessage(
  err: unknown,
  t: Translations,
  fallback: string,
): string {
  if (err instanceof SpaceApiError) {
    if (err.status === 0) return t.spaceApp.networkError;
    if (err.status === 429) return t.spaceApp.tooManyRequests;
  }
  return fallback;
}
