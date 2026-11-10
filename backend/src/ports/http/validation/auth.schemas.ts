import { z } from "zod";
import { languageSchema } from "./language.schema.js";

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  language: languageSchema,
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1).max(512),
});
