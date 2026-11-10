import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

// Parses and replaces req.body with the schema's validated output so every handler
// downstream can trust the shape instead of re-checking presence/type itself.
// Reports a flat list of issues rather than zod's nested tree since the only
// consumer is a JSON error response, not another program.
export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid request body",
        issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
