import { PropsWithChildren, useCallback, useEffect, useState } from "react";
import { I18nContext } from "ports/context/i18n/i18n.context.ts";
import { translations } from "ports/i18n/translations/index.ts";
import { languages, type Language } from "ports/i18n/language.ts";
import { detectLanguage } from "ports/i18n/detect-language.ts";

// Only an explicit choice from the language picker is stored; until then the
// browser's preferred languages decide, on every visit. "LANGUAGE" is the old
// key, which stored "en" on everyone's first visit whether they chose it or
// not, so it is ignored and removed.
const STORAGE_KEY = "language";
const LEGACY_STORAGE_KEY = "LANGUAGE";

function readChosenLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return languages.find((language) => language === stored) ?? null;
  } catch {
    return null;
  }
}

function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

export function I18nContextProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(
    () => readChosenLanguage() ?? detectLanguage(browserLanguages()),
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // storage blocked: the choice lasts for this page view only
    }
  }, []);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </I18nContext.Provider>
  );
}
