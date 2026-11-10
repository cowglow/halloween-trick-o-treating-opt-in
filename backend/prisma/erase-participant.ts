import "../src/load-env.js";
import { createPrismaClient } from "../src/infrastructure/prisma/prisma-client.js";

const prisma = createPrismaClient();

// Operator-only GDPR erasure tool (docs/SPEC.md section 3) - deliberately CLI-only,
// never exposed over HTTP, since an erasure-by-email endpoint would itself be a
// way to enumerate/attack accounts. Same effect as a participant hitting
// "Remove me" themselves (application/space/space.use-cases.ts's removeMe),
// just triggered by an operator on the data subject's behalf, and scoped to
// every space that email appears in (a GDPR erasure request is about the
// person, not about one space they happened to join) unless --slug narrows it.
//
//   pnpm erase:participant -- --email person@example.com [--slug meckenhausen]
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
  const email = argValue("--email");
  const slug = argValue("--slug");
  if (!email) {
    throw new Error("Pass --email <address>");
  }

  const space = slug ? await prisma.space.findUnique({ where: { slug } }) : null;
  if (slug && !space) {
    throw new Error(`No space with slug "${slug}"`);
  }

  const participants = await prisma.spaceParticipant.findMany({
    where: { email, ...(space ? { spaceId: space.id } : {}) },
  });

  console.log(`erase-participant → ${dbHost()}`);
  // Someone who only asked to join has no participant row, just the request.
  const { count: requestCount } = await prisma.spaceAccessRequest.deleteMany({
    where: { email, ...(space ? { spaceId: space.id } : {}) },
  });
  if (requestCount > 0) {
    console.log(`Erased ${requestCount} request(s) to join.`);
  }
  if (participants.length === 0) {
    console.log(`No participant record found for ${email}${slug ? ` in space "${slug}"` : ""}. Nothing to erase.`);
    return;
  }

  for (const participant of participants) {
    // Same cascade as a self-service "Remove me": pin, sign-in sessions, and
    // this participant's own unaccepted invites, then the participant row
    // (which carries the consent record) itself - one transaction per
    // participant so a crash can't leave a partial deletion.
    await prisma.$transaction([
      prisma.spaceLocation.deleteMany({ where: { participantId: participant.id } }),
      prisma.spaceMagicLinkToken.deleteMany({ where: { participantId: participant.id } }),
      prisma.spaceInvite.deleteMany({ where: { inviterParticipantId: participant.id, usedAt: null } }),
      prisma.spaceParticipant.delete({ where: { id: participant.id } }),
    ]);
    console.log(`Erased participant ${participant.id} (space ${participant.spaceId}).`);
  }

  console.log(`Done - erased ${participants.length} participant record(s) for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
