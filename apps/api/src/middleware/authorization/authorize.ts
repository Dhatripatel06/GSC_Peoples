import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors';

/** Requires the user to hold at least one of the given roles. Run after authenticate. */
export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.some((r) => req.user!.roles.includes(r))) throw new ForbiddenError();
    next();
  };

/** Requires the user to hold every given permission. Run after authenticate. */
export const requirePermission =
  (...permissions: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError();
    if (!permissions.every((p) => req.user!.permissions.includes(p))) throw new ForbiddenError();
    next();
  };
