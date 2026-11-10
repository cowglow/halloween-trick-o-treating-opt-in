import { useContext } from "react";
import { I18nContext } from "ports/context/i18n/i18n.context.ts";

export const useTranslation = () => useContext(I18nContext);
