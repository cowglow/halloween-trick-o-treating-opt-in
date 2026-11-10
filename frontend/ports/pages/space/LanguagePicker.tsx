import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { languageLabels, languages, type Language } from "ports/i18n/language.ts";

// In every page's footer and in the map's menu. The app starts in the
// browser's language; a choice made here is remembered (i18n.provider.tsx).
// Each option is named in its own language, so it can be found from any
// current language.
export default function LanguagePicker({ id = "language-picker" }: { id?: string }) {
  const { language, setLanguage, t } = useTranslation();
  return (
    <label htmlFor={id}>
      {t.spaceApp.languageLabel}
      <select id={id} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
        {languages.map((option) => (
          <option key={option} value={option} lang={option}>
            {languageLabels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
