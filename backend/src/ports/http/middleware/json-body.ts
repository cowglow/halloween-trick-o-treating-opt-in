import express from "express";

// docs/SPEC.md section 8: "request body size limits". The largest legitimate
// body is a pin: a 60-char label and a 500-char note, which is at most ~2.3 kB
// as UTF-8 JSON when every character is a 4-byte emoji. 8 kB leaves headroom
// without letting anyone make the server parse 100 kB (express's default) per
// request. Oversized bodies get a 413, malformed JSON a 400 (see error-handler.ts).
export const JSON_BODY_LIMIT = "8kb";

export const jsonBody = express.json({ limit: JSON_BODY_LIMIT });
