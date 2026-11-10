-- German by default (the village's language) instead of English.
ALTER TABLE "SpaceParticipant" ALTER COLUMN "language" SET DEFAULT 'de';
ALTER TABLE "SpaceAccessRequest" ALTER COLUMN "language" SET DEFAULT 'de';

-- Everyone who joined before languages were recorded was stored as English,
-- whatever language they use. Make them German, so the thank-you email
-- reaches the village in its language; the map now sends each person's
-- actual language whenever they open it. People who joined after the
-- language column arrived chose theirs when joining and keep it.
UPDATE "SpaceParticipant"
SET "language" = 'de'
WHERE "language" = 'en'
  AND "createdAt" < COALESCE(
    (SELECT "finished_at" FROM "_prisma_migrations" WHERE "migration_name" = '20261026180000_email_language'),
    '2026-10-27T00:00:00Z'
  );
