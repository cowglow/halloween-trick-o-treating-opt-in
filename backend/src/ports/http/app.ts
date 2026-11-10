import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createSpaceRouter, type SpaceRouterDeps } from "./routes/space.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { jsonBody } from "./middleware/json-body.js";

export type AppDeps = SpaceRouterDeps;

export function createApp(deps: AppDeps) {
  const app = express();
  // In production this sits behind exactly one reverse proxy (Caddy, same Docker
  // network - see docker-compose.prod.yml). Trusting exactly one hop lets Express
  // read the real client IP from X-Forwarded-For for rate limiting, without
  // trusting the header unconditionally (which would let a client spoof its own
  // IP by setting X-Forwarded-For directly).
  app.set("trust proxy", 1);
  // A pure JSON API with no server-rendered pages, so helmet's defaults (HSTS,
  // X-Content-Type-Options, a locked-down CSP, etc.) apply cleanly. The one default
  // that must be relaxed is Cross-Origin-Resource-Policy: "same-origin" - it would
  // block every response from being read by this app's own frontend, which is
  // deliberately served from a different origin (GitHub Pages vs. the API_DOMAIN host).
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000" }));
  app.use(jsonBody);

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/spaces", createSpaceRouter(deps));

  app.use(errorHandler);

  return app;
}
