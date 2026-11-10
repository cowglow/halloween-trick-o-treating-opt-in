import { existsSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { SHARE_RESOURCES, shareResourcePath } from "ports/pages/space/share-resources.ts";
import { translations } from "ports/i18n/translations/index.ts";

// Every language sees only its own images, so each one has to exist.
describe("share resources", () => {
  test.each(Object.keys(translations) as (keyof typeof translations)[])("every image exists in %s", (language) => {
    for (const id of SHARE_RESOURCES) {
      expect(existsSync(`public/${shareResourcePath(id, language)}`), shareResourcePath(id, language)).toBe(true);
      expect(translations[language].spaceShare.resources[id].caption("https://example.test")).not.toBe("");
    }
  });
});
