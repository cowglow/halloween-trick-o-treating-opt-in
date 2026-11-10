import "../src/load-env.js";
import { prisma } from "../src/infrastructure/prisma/prisma-client.js";
import { prismaSpaceParticipantRepository } from "../src/infrastructure/prisma/space.repository.js";
import { getMailer } from "../src/infrastructure/mail/get-mailer.js";
import { readDate } from "../src/infrastructure/config/env.js";
import { COMMUNITY } from "../src/infrastructure/config/community.js";
import { createThankEveryoneUseCase } from "../src/application/space/space.use-cases.js";

// Operator tool (TASK.md item 3): the thank-you email to everyone on the map,
// in their own language, on Halloween before everything is deleted at
// EVENT_END_AT. Replies go to --reply-to (or THANK_YOU_REPLY_TO).
//
//   pnpm thank:space -- --slug meckenhausen                                  # dry run: prints counts
//   pnpm thank:space -- --slug meckenhausen --reply-to you@example.com --yes
//   pnpm thank:space -- --slug meckenhausen --yes --within-minutes 15       # what the server's cron runs
//
// --within-minutes N does nothing (quietly, exit 0) unless EVENT_END_AT is
// less than N minutes away and not yet past. The deploy installs a crontab
// line that runs it that way every 5 minutes on 31 October
// (docs/TEARDOWN.md), so the email goes out at 23:45 and the 23:50 and 23:55
// runs catch late joiners and retry failures.
// Safe to run again: whoever already got it is skipped, so a rerun only
// retries failed sends. Prints counts only, never addresses.
// Without RESEND_API_KEY/EMAIL_FROM the console mailer logs instead of sending.
// Uses the app's shared Prisma client (the repository does), unlike the
// other scripts, so there's only one connection pool to close.

// Resend allows a few requests per second per team; this stays well under it.
const PAUSE_MS = 600;

// Same defaults as composition-root.ts: community.json's event end, and the
// site at the root of CLIENT_ORIGIN.
const EVENT_END_AT = readDate(process.env, "EVENT_END_AT", COMMUNITY.eventEndAt);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
const CLIENT_APP_PATH = "";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

async function main() {
  const slug = argValue("--slug") ?? process.env.SPACE_SLUG;
  const replyTo = argValue("--reply-to") ?? process.env.THANK_YOU_REPLY_TO;
  const confirmed = process.argv.includes("--yes");
  const withinMinutes = argValue("--within-minutes");

  if (!slug) {
    throw new Error("Pass --slug <space-slug> (or set SPACE_SLUG)");
  }
  if (confirmed && !replyTo) {
    throw new Error("Pass --reply-to <your address> (or set THANK_YOU_REPLY_TO): the email asks people to reply");
  }

  if (withinMinutes !== undefined) {
    const minutes = Number(withinMinutes);
    if (!(minutes > 0)) {
      throw new Error("--within-minutes needs a number of minutes greater than 0");
    }
    const msLeft = EVENT_END_AT.getTime() - Date.now();
    if (msLeft <= 0 || msLeft > minutes * 60 * 1000) return;
    console.log(new Date().toISOString());
  }

  const space = await prisma.space.findUnique({ where: { slug } });
  if (!space) {
    throw new Error(`No space with slug "${slug}"`);
  }

  const privacyUrl = `${CLIENT_ORIGIN}${CLIENT_APP_PATH}/#/${space.slug}/privacy`;
  const thankEveryone = createThankEveryoneUseCase({
    spaceParticipantRepository: prismaSpaceParticipantRepository,
    mailer: getMailer(),
    eventEndAt: EVENT_END_AT,
    privacyUrl,
    pause: () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS)),
  });

  const usingResend = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  console.log(`thank-space → ${space.name} (${space.slug})`);
  console.log(`  mailer: ${usingResend ? "Resend" : "console (RESEND_API_KEY/EMAIL_FROM not set, nothing is really sent)"}`);
  console.log(`  data deleted at: ${EVENT_END_AT.toISOString()}`);
  console.log(`  privacy notice link: ${privacyUrl}`);

  const result = await thankEveryone(space.id, { send: confirmed, replyTo: replyTo ?? "" });
  const { en, de, es } = result.pending;
  console.log(`  already thanked: ${result.alreadyThanked}`);
  console.log(`  to send: ${en + de + es} (en ${en}, de ${de}, es ${es})`);

  if (!confirmed) {
    console.log("Dry run only - pass --reply-to <your address> --yes to send.");
    return;
  }

  console.log(`Sent ${result.sent}, failed ${result.failed}.`);
  if (result.failed > 0) {
    console.log("Run it again to retry the failed ones; nobody gets it twice.");
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
