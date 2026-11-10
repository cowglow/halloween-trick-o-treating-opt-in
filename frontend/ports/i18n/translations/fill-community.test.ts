import { describe, expect, it } from "vitest";
import { fillCommunity } from "ports/i18n/translations/fill-community.ts";
import { translations } from "ports/i18n/translations/index.ts";

describe("fillCommunity", () => {
  it("fills strings, arrays, nested objects and what functions return", () => {
    const filled = fillCommunity(
      {
        title: "Inside {community}, hosted by {hosting}",
        steps: ["{community} first", "then {community}"],
        nested: { text: "Halloween in {community}" },
        caption: (url: string) => `Join the {community} map: ${url}`,
        count: 3,
      },
      { community: "Springfield", hosting: "Acme" },
    );
    expect(filled.title).toBe("Inside Springfield, hosted by Acme");
    expect(filled.steps).toEqual(["Springfield first", "then Springfield"]);
    expect(filled.nested.text).toBe("Halloween in Springfield");
    expect(filled.caption("https://x.test")).toBe("Join the Springfield map: https://x.test");
    expect(filled.count).toBe(3);
  });

  it("leaves no placeholder in any language", () => {
    expect(JSON.stringify(translations)).not.toMatch(/\{(community|hosting)\}/);
    expect(translations.en.spaceApp.statusInside).toBe("Inside Meckenhausen");
    expect(translations.de.spaceApp.acceptInviteTitle).toBe("Du bist zur Halloween-Karte für Meckenhausen eingeladen");
  });
});
