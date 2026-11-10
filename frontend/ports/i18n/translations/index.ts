import type { Language } from "ports/i18n/language.ts";
import en from "ports/i18n/translations/en.ts";
import de from "ports/i18n/translations/de.ts";
import es from "ports/i18n/translations/es.ts";
import { COMMUNITY } from "domain/community/community-config.ts";
import { fillCommunity } from "ports/i18n/translations/fill-community.ts";

export type { Translations } from "ports/i18n/translations/en.ts";

// The texts say "{community}" where the community's name goes, and
// "{hosting}" for its hosting provider (community/community.json); filled
// in once, here.
const VALUES = { community: COMMUNITY.name, hosting: COMMUNITY.hostingProvider };

export const translations: Record<Language, typeof en> = {
  en: fillCommunity(en, VALUES),
  de: fillCommunity(de, VALUES),
  es: fillCommunity(es, VALUES),
};
