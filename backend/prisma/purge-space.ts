import "../src/load-env.js";
import { createPrismaClient } from "../src/infrastructure/prisma/prisma-client.js";

const prisma = createPrismaClient();

// Operator tool (docs/SPEC.md section 3): "deletes all locations, participants,
// invites, sessions, tokens, and consent records for a space, prints counts."
// Consent (consentAt/noticeVersion) lives directly on SpaceParticipant, so
// deleting the participant deletes the consent record with it - there's no
// separate consent table to also target.
//
//   pnpm purge:space -- --slug meckenhausen --yes
//
// Requires --yes (not just being run at all) since this is irreversible and
// there's no confirmation prompt in a non-interactive CI/cron context.
//
// The thank-you email (thank-space.ts) needs the addresses this deletes, so
// --yes refuses while anyone hasn't been thanked yet. If some address keeps
// failing, add --without-thanks to purge anyway.
function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host || "(no DATABASE_URL)";
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

async function main() {
  const slug = argValue("--slug") ?? process.env.SPACE_SLUG;
  const confirmed = process.argv.includes("--yes");
  const withoutThanks = process.argv.includes("--without-thanks");

  if (!slug) {
    throw new Error("Pass --slug <space-slug> (or set SPACE_SLUG)");
  }

  const space = await prisma.space.findUnique({ where: { slug } });
  if (!space) {
    throw new Error(`No space with slug "${slug}"`);
  }

  const [locationCount, participantCount, inviteCount, tokenCount, requestCount] = await Promise.all([
    prisma.spaceLocation.count({ where: { spaceId: space.id } }),
    prisma.spaceParticipant.count({ where: { spaceId: space.id } }),
    prisma.spaceInvite.count({ where: { spaceId: space.id } }),
    prisma.spaceMagicLinkToken.count({ where: { participant: { spaceId: space.id } } }),
    prisma.spaceAccessRequest.count({ where: { spaceId: space.id } }),
  ]);
  const unthankedCount = await prisma.spaceParticipant.count({ where: { spaceId: space.id, thankedAt: null } });

  console.log(`purge-space → ${dbHost()}`);
  console.log(`  space: ${space.name} (${space.slug}, ${space.id})`);
  console.log(`  will delete: ${locationCount} locations, ${participantCount} participants (incl. their consent`);
  console.log(`  records), ${inviteCount} invites, ${tokenCount} sign-in tokens/sessions, ${requestCount} requests to join`);

  console.log(`  not thanked yet: ${unthankedCount} (pnpm thank:space)`);

  if (!confirmed) {
    console.log("Dry run only - pass --yes to actually delete.");
    return;
  }

  if (unthankedCount > 0 && !withoutThanks) {
    console.log(
      `Not deleting: ${unthankedCount} people haven't had the thank-you email yet, and it can't be sent once their ` +
        "addresses are gone. Run pnpm thank:space first, or add --without-thanks to purge anyway.",
    );
    process.exitCode = 1;
    return;
  }

  await prisma.$transaction([
    prisma.spaceLocation.deleteMany({ where: { spaceId: space.id } }),
    prisma.spaceMagicLinkToken.deleteMany({ where: { participant: { spaceId: space.id } } }),
    prisma.spaceInvite.deleteMany({ where: { spaceId: space.id } }),
    prisma.spaceAccessRequest.deleteMany({ where: { spaceId: space.id } }),
    prisma.spaceAccessAnswer.deleteMany({ where: { spaceId: space.id } }),
    prisma.spaceParticipant.deleteMany({ where: { spaceId: space.id } }),
  ]);

  console.log(
    `Deleted ${locationCount} locations, ${participantCount} participants, ${inviteCount} invites, ${tokenCount} tokens, ${requestCount} requests to join.`,
  );
  console.log(`The Space row itself ("${space.slug}") was left in place so the map can be reused next year.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
