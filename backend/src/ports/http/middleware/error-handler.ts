import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

// Must be registered last, after all routes. 4 arguments is how Express recognizes
// error-handling middleware, even though `next` is unused here.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // express.json()'s own errors (body too large, malformed JSON, bad charset):
  // the client's fault, so a 4xx rather than a 500, and never logged - a parse
  // error carries the raw request body on `err.body`, and request bodies must
  // never be logged.
  if (isBodyParserError(err)) {
    res
      .status(err.status)
      .json({ error: err.status === 413 ? "Request body too large" : "Malformed request body" });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A record with that identifier already exists" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Record not found" });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

function isBodyParserError(err: unknown): err is { status: number; type: string } {
  if (typeof err !== "object" || err === null) return false;
  const { status, type, expose } = err as { status?: unknown; type?: unknown; expose?: unknown };
  return typeof status === "number" && status >= 400 && status < 500 && typeof type === "string" && expose === true;
}
