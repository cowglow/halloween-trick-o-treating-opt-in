import { describe, expect, test } from "vitest";
import { LANGUAGES } from "../../domain/i18n/language.js";
import {
  buildAccessRequestNoticeEmail,
  buildInviteEmail,
  buildMagicLinkEmail,
  buildThankYouEmail,
} from "./email-copy.js";

const URL = "https://example.test/#/meckenhausen/invite?token=abc";
// 13:00 UTC is 14:00 in Meckenhausen (CET).
const EXPIRES = new Date("2026-11-02T13:00:00Z");

describe("email copy", () => {
  test.each(LANGUAGES)("every email has a subject and the link in text and html (%s)", (language) => {
    for (const email of [
      buildMagicLinkEmail(URL, language),
      buildInviteEmail(URL, EXPIRES, language),
      buildAccessRequestNoticeEmail(URL, language),
    ]) {
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.text).toContain(URL);
      expect(email.html).toContain(`<a href="${URL}">`);
    }
  });

  test("the three languages really differ", () => {
    const subjects = LANGUAGES.map((language) => buildInviteEmail(URL, EXPIRES, language).subject);
    expect(new Set(subjects).size).toBe(3);
  });

  // The punctuation in dates varies by ICU version, so only the parts are checked.
  test("the invite states its own expiry in Meckenhausen time, in the email's language", () => {
    expect(buildInviteEmail(URL, EXPIRES, "en").text).toContain("2 November 2026");
    expect(buildInviteEmail(URL, EXPIRES, "de").text).toContain("2. November 2026");
    expect(buildInviteEmail(URL, EXPIRES, "es").text).toContain("2 de noviembre de 2026");
    for (const language of LANGUAGES) {
      const text = buildInviteEmail(URL, EXPIRES, language).text;
      expect(text).toContain("14:00");
      expect(text).not.toMatch(/minutes|Minuten|minutos/);
    }
  });

  test("the sign-in link states its 15-minute expiry", () => {
    expect(buildMagicLinkEmail(URL, "en").text).toContain("15 minutes");
    expect(buildMagicLinkEmail(URL, "de").text).toContain("15 Minuten");
    expect(buildMagicLinkEmail(URL, "es").text).toContain("15 minutos");
  });

  // 23:00 UTC on 31 October is midnight in Meckenhausen (CET).
  const DELETED_AT = new Date("2026-10-31T23:00:00Z");
  const DELETION_DAY = { en: "1 November 2026", de: "1. November 2026", es: "1 de noviembre de 2026" };

  const PRIVACY_URL = "https://example.test/#/meckenhausen/privacy";

  test.each(LANGUAGES)("the thank-you states the deletion in Meckenhausen time, links the privacy notice and is signed by Philip (%s)", (language) => {
    const email = buildThankYouEmail(PRIVACY_URL, DELETED_AT, language);
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.text).toContain(DELETION_DAY[language]);
    // Midnight: "00:00", or "0:00" in Spanish.
    expect(email.text).toMatch(/\b0?0:00\b/);
    expect(email.text).toMatch(/\nPhilip$/);
    expect(email.html).toContain("<br>Philip</p>");
    expect(email.text).toContain(PRIVACY_URL);
    expect(email.html).toContain(`<a href="${PRIVACY_URL}">`);
  });
});
