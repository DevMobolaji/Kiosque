import { logger } from "@/config/logger";
import { Request, Response, NextFunction } from "express";
import { getContextMiddleware } from "./context.middlware";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // if (shouldSkip(req)) {
  //   return next();
  // }

  const start = process.hrtime.bigint();
  const requestId = getContextMiddleware(req).requestId || req.requestId || "unknown";

  const baseMeta = {
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent") || "",
  };

  logger.info(baseMeta, "HTTP_REQUEST_START");

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const finishedMeta = {
      requestId,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };

    if (res.statusCode >= 500) {
      logger.error(finishedMeta, "HTTP_REQUEST_ERROR");
    } else if (res.statusCode >= 400) {
      logger.warn(finishedMeta, "HTTP_REQUEST_CLIENT_ERROR");
    } else {
      logger.info(finishedMeta, "HTTP_REQUEST_END");
    }
  });

  next();
}
