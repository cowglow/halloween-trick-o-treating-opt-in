import { createContext } from "react";
import { I18nContextApi } from "ports/context/i18n/i18n.types.ts";
import en from "ports/i18n/translations/en.ts";

const defaultValues: I18nContextApi = {
  language: "en",
  setLanguage: () => {
    throw Error("ERROR:: Set Language | Uninitialized ");
  },
  t: en,
};

export const I18nContext = createContext<I18nContextApi>(defaultValues);
