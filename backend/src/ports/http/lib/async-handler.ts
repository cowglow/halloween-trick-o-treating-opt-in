import type { NextFunction, Request, RequestHandler, Response } from "express";

// Forwards a rejected promise from an async route handler to Express's
// error-handling middleware. Express 5 does this itself; the wrapper stays so
// the forwarding doesn't silently depend on the Express major version (in
// Express 4 an uncaught rejection crashed the whole process).
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
