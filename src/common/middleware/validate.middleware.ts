import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Validates the specified part of the request against a Zod schema.
 * On success, replaces the original with the parsed (and transformed) value.
 * On failure, throws ZodError — caught by the global error handler.
 */
export const validate =
  (schema: ZodSchema, source: Source = 'body') =>
    (req: Request, _res: Response, next: NextFunction) => {
      const parsed = schema.parse(req[source]);
      (req as any)[source] = parsed;
      next();
    };