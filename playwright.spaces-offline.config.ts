import { defineConfig, devices } from "@playwright/test";
import { E2E_EVENT_END_AT } from "./e2e/spaces/helpers.ts";

// The offline behaviour has to be tested against a *production build*: the dev
// server's module URLs aren't something a service worker should cache, and the
// bug this guards against (the worker not covering the build's /assets/ files)
// only exists in built output. Builds, then serves it with `vite preview`.
export const OFFLINE_PORT = 4174;

export default defineConfig({
  testDir: "./e2e/spaces",
  testMatch: "offline.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: `https://localhost:${OFFLINE_PORT}/`,
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
    command: `pnpm build && npx vite preview --host --port ${OFFLINE_PORT} --strictPort`,
    url: `https://localhost:${OFFLINE_PORT}/`,
    reuseExistingServer: false,
    ignoreHTTPSErrors: true,
    timeout: 180_000,
    env: { VITE_EVENT_END_AT: E2E_EVENT_END_AT },
  },
});
