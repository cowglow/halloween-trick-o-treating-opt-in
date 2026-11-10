import { defineConfig, devices } from "@playwright/test";
import { E2E_EVENT_END_AT } from "./e2e/spaces/helpers.ts";

// Runs against the normal dev stack (frontend on :3000, the docker-compose
// api/db, and a `pnpm seed:space`-seeded participant). See e2e/spaces/README.md.
export const SPACES_PORT = 3000;

export default defineConfig({
  testDir: "./e2e/spaces",
  testMatch: ["spaces.spec.ts", "touch.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    // Trailing slash matters: Playwright resolves goto("./#/...") against it.
    baseURL: `https://localhost:${SPACES_PORT}/`,
    ignoreHTTPSErrors: true,
    // Without a trusted mkcert certificate (CI) the dev server's certificate is
    // self-signed, and Chromium refuses to register a service worker on an
    // origin with a certificate error, ignoreHTTPSErrors notwithstanding.
    launchOptions: { args: ["--ignore-certificate-errors"] },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx vite --host --port ${SPACES_PORT} --strictPort`,
    url: `https://localhost:${SPACES_PORT}/`,
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    // A reused dev server needs the same (`VITE_EVENT_END_AT=... pnpm dev`).
    env: { VITE_EVENT_END_AT: E2E_EVENT_END_AT },
  },
});
