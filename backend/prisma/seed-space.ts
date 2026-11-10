import "../src/load-env.js";
import { createPrismaClient } from "../src/infrastructure/prisma/prisma-client.js";
import { CURRENT_NOTICE_VERSION } from "../src/application/space/space.use-cases.js";
import { COMMUNITY } from "../src/infrastructure/config/community.js";

const prisma = createPrismaClient();

// Bootstraps the one space this app serves and its first participant(s), who
// can then invite everyone else (docs/SPEC.md section 2: "NO public access" - there is
// no self-serve sign-up route any more, so *something* has to create the first
// participant out of band).
async function main() {
  const slug = process.env.SEED_SPACE_SLUG ?? COMMUNITY.slug;
  const name = process.env.SEED_SPACE_NAME ?? `${COMMUNITY.name} Halloween`;
  // One address, or several separated by commas (e.g. two dev accounts).
  const emails = (process.env.SEED_SPACE_PARTICIPANT_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) {
    throw new Error("SEED_SPACE_PARTICIPANT_EMAIL must be set to seed the first participant");
  }

  const space = await prisma.space.upsert({
    where: { slug },
    update: {},
    create: { slug, name },
  });

  console.log(`Seeded space: ${space.name} (${space.slug}, ${space.id})`);
  for (const email of emails) {
    const participant = await prisma.spaceParticipant.upsert({
      where: { spaceId_email: { spaceId: space.id, email } },
      update: {},
      create: {
        spaceId: space.id,
        email,
        role: "participant",
        consentAt: new Date(),
        noticeVersion: CURRENT_NOTICE_VERSION,
      },
    });
    console.log(`Seeded participant: ${participant.email} (${participant.id})`);
  }
  console.log(`They can sign in with POST /spaces/${space.slug}/magic-link and invite others from there.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
