import type { RequestHandler } from "express";
import type { SpaceSessionPayload } from "../../../domain/space/space.types.js";
import type { SpaceTokenSigner } from "../../../application/space-token-signer.js";
import type { SpaceParticipantRepository } from "../../../application/space/space.repository.js";
import { asyncHandler } from "../lib/async-handler.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      spaceSession?: SpaceSessionPayload;
    }
  }
}

// Mirrors require-auth.ts: verify the token, then re-check the participant
// still exists on every request rather than trusting whatever the token
// cached at sign-in - same reasoning (a clean 401 instead of a confusing
// downstream failure if the row is ever removed).
export function createRequireSpaceAuth(
  spaceTokenSigner: SpaceTokenSigner,
  spaceParticipantRepository: SpaceParticipantRepository,
): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

    if (!token) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    let payload: SpaceSessionPayload;
    try {
      payload = spaceTokenSigner.verify(token);
    } catch {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const participant = await spaceParticipantRepository.findById(payload.participantId);
    if (!participant) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    req.spaceSession = {
      scope: "space",
      participantId: participant.id,
      spaceId: participant.spaceId,
      email: participant.email,
      role: participant.role,
    };
    next();
  });
}
