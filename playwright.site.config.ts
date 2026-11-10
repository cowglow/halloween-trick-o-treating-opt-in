import { defineConfig, devices } from "@playwright/test";

// The project site (VITE_SITE=true): the documentation, the in-browser demo
// and the share page. No backend needed.
export const SITE_PORT = 3002;

export default defineConfig({
  testDir: "./e2e/site",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `https://localhost:${SITE_PORT}/`,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npx vite --host --port ${SITE_PORT} --strictPort`,
    url: `https://localhost:${SITE_PORT}/`,
    reuseExistingServer: false,
    ignoreHTTPSErrors: true,
    env: { VITE_SITE: "true" },
  },
});
