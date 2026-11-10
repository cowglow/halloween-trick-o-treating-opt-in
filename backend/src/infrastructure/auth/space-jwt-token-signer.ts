import jwt from "jsonwebtoken";
import type { SpaceSessionPayload } from "../../domain/space/space.types.js";
import type { SpaceTokenSigner } from "../../application/space-token-signer.js";

function getSpaceJwtSecret(): string {
  const secret = process.env.SPACE_JWT_SECRET;
  if (!secret) {
    throw new Error("SPACE_JWT_SECRET must be set");
  }
  return secret;
}

const SPACE_JWT_SECRET = getSpaceJwtSecret();

export const spaceJwtTokenSigner: SpaceTokenSigner = {
  sign(payload: SpaceSessionPayload): string {
    // A week: a neighbor shouldn't have to request a new link mid-event, and
    // a session only grants access to one space's map.
    return jwt.sign(payload, SPACE_JWT_SECRET, { expiresIn: "7d" });
  },
  verify(token: string): SpaceSessionPayload {
    const payload = jwt.verify(token, SPACE_JWT_SECRET) as Partial<SpaceSessionPayload>;
    // Defense in depth beyond the signature: a token must actually carry this
    // scope and shape before anything trusts it as a space session.
    if (payload.scope !== "space" || typeof payload.participantId !== "string" || typeof payload.spaceId !== "string") {
      throw new Error("Not a valid space session token");
    }
    return payload as SpaceSessionPayload;
  },
};
