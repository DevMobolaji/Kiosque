import "express-serve-static-core";

declare global {
  namespace Express {
    interface Request {
      logger: pino
      requestId?: string;
      // user?: {
      //   userId: string;
      //   email: string;
      //   role: string;
      // };
      context?: RequestContext;
    }
  }
}