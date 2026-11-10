import { spaceAssetPath } from "infrastructure/space-assets/space-asset-url.ts";

// Registers public/sw.js, scoped to the app's base path - see
// that file for the full caching strategy and why it's hand-rolled instead of
// vite-plugin-pwa. A no-op outside a secure context (plain http://, anything
// but localhost) since navigator.serviceWorker doesn't exist there - see
// docs/DEV-HTTPS.md for why `pnpm dev` is HTTPS by default.
export function registerSpaceServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  const scope = `${spaceAssetPath("")}`;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(spaceAssetPath("sw.js"), { scope }).catch((err) => {
      console.error("[sw] registration failed:", err);
    });
  });
}
