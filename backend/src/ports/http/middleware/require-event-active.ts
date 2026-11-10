import type { NextFunction, Request, Response } from "express";

// docs/SPEC.md section 3: "End of event: EVENT_END_AT env var... After it, the API
// returns 410 and serves no location data." Applied to every /spaces/:slug route
// except DELETE /:slug/me - deletion/erasure must keep working even after the
// event ends (GDPR withdrawal rights don't expire with the event).
export function requireEventActive(eventEndAt: Date) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (Date.now() >= eventEndAt.getTime()) {
      res.status(410).json({ error: "This map has ended and its data has been removed." });
      return;
    }
    next();
  };
}
