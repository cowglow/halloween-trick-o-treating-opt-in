import { randomBytes } from "node:crypto";
import type { TokenGenerator } from "../../application/token-generator.js";

export const randomTokenGenerator: TokenGenerator = {
  generate() {
    return randomBytes(32).toString("hex");
  },
};
