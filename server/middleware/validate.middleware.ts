// middleware/validate.middleware.ts
// 1) express-validator based validator (legacy / existing routes):
//    Usage: router.post('/users', [...createUserValidation, validate], handler)
//
// 2) Zod based validator (new routes going forward):
//    Usage: router.post('/users', validateZod(createUserSchema), handler)
//
// Only the offending field + message are returned, so no internal detail leaks.
import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import type { ZodSchema, ZodTypeAny } from 'zod';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const result = validationResult(req);
  if (result.isEmpty()) {
    next();
    return;
  }

  const errors = result.array().map((error) => ({
    field: error.type === 'field' ? error.path : undefined,
    message: error.msg,
  }));

  res.status(400).json({
    success: false,
    message: errors[0]?.message ?? 'Invalid request',
    errors,
  });
}

/**
 * Validate request against a Zod schema.
 * Schema shape: { body?, query?, params? }  — each key is an optional Zod schema
 * OR a single schema is treated as req.body schema.
 */
export function validateZod<T extends ZodTypeAny | { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }>(
  schema: T,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const isBare = (schema as any).safeParse !== undefined;
      if (isBare) {
        const parsed = (schema as ZodSchema).safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          });
          return;
        }
        (req as any).body = parsed.data;
      } else {
        const shaped = schema as { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema };
        if (shaped.body) {
          const p = shaped.body.safeParse(req.body);
          if (!p.success) {
            res.status(400).json({
              success: false,
              message: 'Validation failed (body)',
              errors: p.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
            });
            return;
          }
          (req as any).body = p.data;
        }
        if (shaped.query) {
          const p = shaped.query.safeParse(req.query);
          if (!p.success) {
            res.status(400).json({
              success: false,
              message: 'Validation failed (query)',
              errors: p.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
            });
            return;
          }
          (req as any).query = p.data;
        }
        if (shaped.params) {
          const p = shaped.params.safeParse(req.params);
          if (!p.success) {
            res.status(400).json({
              success: false,
              message: 'Validation failed (params)',
              errors: p.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
            });
            return;
          }
          (req as any).params = p.data;
        }
      }
      next();
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Validator error', error: err.message });
    }
  };
}

