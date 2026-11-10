import type { Language } from "ports/i18n/language.ts";
import type { Translations } from "ports/i18n/translations/index.ts";

export type I18nContextApi = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
};
