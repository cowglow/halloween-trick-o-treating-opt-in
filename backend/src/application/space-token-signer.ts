import type { SpaceSessionPayload } from "../domain/space/space.types.js";

// Signs and verifies participant sessions (implementation:
// infrastructure/auth/space-jwt-token-signer.ts).
export interface SpaceTokenSigner {
  sign(payload: SpaceSessionPayload): string;
  verify(token: string): SpaceSessionPayload;
}
