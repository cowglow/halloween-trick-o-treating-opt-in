// The languages the app and its emails are written in - mirrors
// frontend/ports/i18n/language.ts.
export const LANGUAGES = ["en", "de", "es"] as const;

export type Language = (typeof LANGUAGES)[number];

// `fallback` is the community's default language (community/community.json),
// for stored values that aren't one of ours.
export function toLanguage(value: string, fallback: Language): Language {
  return (LANGUAGES as readonly string[]).includes(value) ? (value as Language) : fallback;
}
