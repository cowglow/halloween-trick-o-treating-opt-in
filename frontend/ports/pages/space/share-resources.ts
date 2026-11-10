import type { Language } from "ports/i18n/language.ts";

// The WhatsApp status images on the "Let your neighbors know" page, in the
// order shown. Each exists in every language as public/whatsapp/<id>-<lang>.png
// (share-resources.test.ts checks that); the texts are in
// translations' spaceShare.resources.
export const SHARE_RESOURCES = ["candy", "homes", "quiet", "askToJoin", "roles"] as const;
export type ShareResourceId = (typeof SHARE_RESOURCES)[number];

const FILE_STEMS: Record<ShareResourceId, string> = {
  candy: "candy",
  askToJoin: "ask-to-join",
  homes: "homes",
  quiet: "quiet",
  roles: "roles",
};

export function shareResourcePath(id: ShareResourceId, language: Language): string {
  return `whatsapp/${FILE_STEMS[id]}-${language}.png`;
}
