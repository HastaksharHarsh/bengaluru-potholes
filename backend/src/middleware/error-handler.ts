// ─── Global error handler middleware ────────────────────────────────────────
import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error(`❌ [${req.method} ${req.path}]`, err.message);
  console.error(err.stack);

  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
}
