import type { Language } from "../../domain/i18n/language.js";
import { TOKEN_TTL_MS } from "../../domain/auth/magic-link.js";
import { COMMUNITY } from "../config/community.js";

const EXPIRY_MINUTES = Math.round(TOKEN_TTL_MS / 60_000);

export type Email = { subject: string; text: string; html: string };

// Every email is the same shape: a line, the link, a closing line.
function compose(subject: string, intro: string, url: string, outro: string): Email {
  const text = [intro, "", url, "", outro].join("\n");
  const html = `
    <p>${intro}</p>
    <p><a href="${url}">${url}</a></p>
    <p>${outro}</p>
  `.trim();
  return { subject, text, html };
}

const DATE_LOCALES: Record<Language, string> = { en: "en-GB", de: "de-DE", es: "es-ES" };

// Dates are given in the community's time zone (community.json).
function formatDate(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(DATE_LOCALES[language], {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: COMMUNITY.timeZone,
  }).format(date);
}

// "{community}" and "{organizer}" are filled in from community.json (see fill()).
const rawCopy = {
  en: {
    magicLinkSubject: "Your sign-in link",
    magicLinkIntro: "Here's your sign-in link for the {community} Halloween map:",
    magicLinkOutro: (minutes: number) =>
      `This link expires in ${minutes} minutes. If you didn't request this, you can ignore this email.`,
    inviteSubject: "You're invited to the {community} Halloween map",
    inviteIntro: "A neighbor has invited you to the {community} Halloween trick-or-treat map:",
    inviteOutro: (until: string) =>
      `The link works once, until ${until}. If you weren't expecting this, you can ignore this email.`,
    noticeSubject: "Someone asked to join the {community} Halloween map",
    noticeIntro:
      "Someone without an invite has asked to join the {community} Halloween map. Any participant can let them in or say no, so someone may have answered before you get there. Open the map to see who it is, or who answered:",
    noticeOutro: "You'll get this email again only after the waiting requests have been answered.",
    thankYouSubject: "Thank you for Halloween in {community}",
    thankYouLines: (deletedAt: string) => [
      "Thank you for being part of the {community} Halloween map this year. Whether you put your front door on the map or went round the village to find them, you helped make the evening.",
      `As promised, everything on the map, including your email address, is deleted on ${deletedAt}. This is the last email you'll get from it.`,
      "If you have ideas for next year, just reply to this email.",
    ],
    thankYouNotice: "How your data was handled, and when it's deleted, is in the privacy notice:",
    thankYouSignOff: "Happy Halloween,\n{organizer}",
  },
  de: {
    magicLinkSubject: "Dein Anmeldelink",
    magicLinkIntro: "Hier ist dein Anmeldelink für die Halloween-Karte für {community}:",
    magicLinkOutro: (minutes: number) =>
      `Der Link ist ${minutes} Minuten gültig. Falls du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
    inviteSubject: "Du bist zur Halloween-Karte für {community} eingeladen",
    inviteIntro: "Jemand aus der Nachbarschaft hat dich zur Halloween-Karte für {community} für den Süßigkeiten-Rundgang eingeladen:",
    inviteOutro: (until: string) =>
      `Der Link funktioniert einmal, bis ${until}. Falls du damit nicht gerechnet hast, kannst du diese E-Mail ignorieren.`,
    noticeSubject: "Jemand möchte bei der Halloween-Karte für {community} mitmachen",
    noticeIntro:
      "Jemand ohne Einladung möchte bei der Halloween-Karte für {community} mitmachen. Alle Teilnehmer:innen können die Anfrage zulassen oder ablehnen, vielleicht hat also schon jemand geantwortet. Öffne die Karte, um zu sehen, wer es ist oder wer geantwortet hat:",
    noticeOutro: "Diese E-Mail bekommst du erst wieder, wenn die wartenden Anfragen beantwortet sind.",
    thankYouSubject: "Danke für Halloween in {community}",
    thankYouLines: (deletedAt: string) => [
      "Danke, dass du dieses Jahr bei der Halloween-Karte für {community} dabei warst. Ob du deine Haustür auf die Karte gesetzt hast oder durchs Dorf gezogen bist, um die Türen zu finden: Du hast den Abend mitgestaltet.",
      `Wie versprochen wird alles auf der Karte, auch deine E-Mail-Adresse, am ${deletedAt} gelöscht. Das ist die letzte E-Mail, die du von ihr bekommst.`,
      "Wenn du Ideen für nächstes Jahr hast, antworte einfach auf diese E-Mail.",
    ],
    thankYouNotice: "Wie mit deinen Daten umgegangen wurde und wann sie gelöscht werden, steht im Datenschutzhinweis:",
    thankYouSignOff: "Fröhliches Halloween,\n{organizer}",
  },
  es: {
    magicLinkSubject: "Tu enlace de acceso",
    magicLinkIntro: "Aquí tienes tu enlace de acceso al mapa de Halloween de {community}:",
    magicLinkOutro: (minutes: number) =>
      `El enlace caduca en ${minutes} minutos. Si no lo has pedido, puedes ignorar este correo.`,
    inviteSubject: "Estás invitado al mapa de Halloween de {community}",
    inviteIntro: "Un vecino te ha invitado al mapa de truco o trato de Halloween de {community}:",
    inviteOutro: (until: string) =>
      `El enlace funciona una vez, hasta el ${until}. Si no lo esperabas, puedes ignorar este correo.`,
    noticeSubject: "Alguien pidió unirse al mapa de Halloween de {community}",
    noticeIntro:
      "Alguien sin invitación ha pedido unirse al mapa de Halloween de {community}. Cualquier participante puede dejarle entrar o rechazarlo, así que quizá alguien ya haya respondido. Abre el mapa para ver quién es o quién respondió:",
    noticeOutro: "No volverás a recibir este correo hasta que se hayan respondido las solicitudes pendientes.",
    thankYouSubject: "Gracias por Halloween en {community}",
    thankYouLines: (deletedAt: string) => [
      "Gracias por formar parte del mapa de Halloween de {community} este año. Tanto si pusiste tu puerta en el mapa como si recorriste el pueblo buscándolas, ayudaste a hacer la noche.",
      `Como prometimos, todo lo que hay en el mapa, incluida tu dirección de correo, se borra el ${deletedAt}. Este es el último correo que recibirás de él.`,
      "Si tienes ideas para el año que viene, responde a este correo.",
    ],
    thankYouNotice: "Cómo se trataron tus datos, y cuándo se borran, está en el aviso de privacidad:",
    thankYouSignOff: "Feliz Halloween,\n{organizer}",
  },
} satisfies Record<Language, unknown>;

// Fills in every string, and what every text function returns.
function fill<T>(value: T): T {
  if (typeof value === "string") {
    return value.split("{community}").join(COMMUNITY.name).split("{organizer}").join(COMMUNITY.organizer) as T;
  }
  if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => fill(fn(...args))) as T;
  }
  if (Array.isArray(value)) return value.map(fill) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fill(item)])) as T;
  }
  return value;
}

const copy = fill(rawCopy);

export function buildMagicLinkEmail(url: string, language: Language): Email {
  const c = copy[language];
  return compose(c.magicLinkSubject, c.magicLinkIntro, url, c.magicLinkOutro(EXPIRY_MINUTES));
}

export function buildInviteEmail(url: string, expiresAt: Date, language: Language): Email {
  const c = copy[language];
  return compose(c.inviteSubject, c.inviteIntro, url, c.inviteOutro(formatDate(expiresAt, language)));
}

export function buildAccessRequestNoticeEmail(url: string, language: Language): Email {
  const c = copy[language];
  return compose(c.noticeSubject, c.noticeIntro, url, c.noticeOutro);
}

// A thank-you on Halloween, before the data is deleted at `deletedAt`
// (EVENT_END_AT). It links to the privacy notice and is signed by the
// community's organizer; replies go to THANK_YOU_REPLY_TO (Reply-To, set by
// the sender).
export function buildThankYouEmail(privacyUrl: string, deletedAt: Date, language: Language): Email {
  const c = copy[language];
  const lines = c.thankYouLines(formatDate(deletedAt, language));
  const text = [...lines, `${c.thankYouNotice}\n${privacyUrl}`, c.thankYouSignOff].join("\n\n");
  const html = [
    ...lines.map((line) => `<p>${line}</p>`),
    `<p>${c.thankYouNotice}<br><a href="${privacyUrl}">${privacyUrl}</a></p>`,
    `<p>${c.thankYouSignOff.replace("\n", "<br>")}</p>`,
  ].join("\n");
  return { subject: c.thankYouSubject, text, html };
}
