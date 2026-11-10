import type { NextFunction, Request, Response } from "express";
import type { SpaceRole } from "../../../domain/space/space.types.js";

// Mirrors require-role.ts. Must run after requireSpaceAuth, which populates
// req.spaceSession. A visitor hitting a participant-only route (e.g. placing a
// pin, sending an invite) gets a 403 here regardless of what the frontend shows
// - the frontend hiding the button is UX, not the security boundary (this
// repo's own convention, see CLAUDE.md).
export function requireSpaceRole(role: SpaceRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.spaceSession?.role !== role) {
      res.status(403).json({ error: `Requires ${role} role` });
      return;
    }
    next();
  };
}
