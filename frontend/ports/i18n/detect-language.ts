import { languages, type Language } from "ports/i18n/language.ts";

// The first of the browser's preferred languages (navigator.languages, most
// preferred first) that the app has a translation for, matched on the
// primary subtag so "de-AT" and "de-CH" get German. English otherwise.
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
    const match = languages.find((language) => language === primary);
    if (match) return match;
  }
  return "en";
}
