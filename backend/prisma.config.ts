// Prisma 7 reads its connection URL from here, not from schema.prisma, and
// no longer loads .env by itself. Used by the CLI only (generate, migrate);
// the app connects through the pg adapter in
// src/infrastructure/prisma/prisma-client.ts.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // `prisma generate` runs in the Docker build with no database, so a
  // missing URL must not fail config loading; migrate fails clearly without it.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
