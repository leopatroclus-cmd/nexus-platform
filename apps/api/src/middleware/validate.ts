import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BadRequestError } from '../lib/errors.js';

type ValidationTarget = 'body' | 'params' | 'query';

export function validate(schema: z.ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return next(new BadRequestError(`Validation error: ${errors.join(', ')}`));
    }
    req[target] = result.data;
    next();
  };
}
