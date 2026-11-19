import type { RequestHandler } from 'express';
import type { CentralAuthProvider } from '../../integrations/central-auth';
import { UnauthorizedError } from '../../shared/errors';

/**
 * Verifies the bearer token with the configured Central Auth provider and sets `req.identity`.
 * This proves who the caller is; it does NOT grant access to any company. Feature routes must also
 * run `resolveTenant`, which validates an ACTIVE membership and sets `req.user`.
 */
export function authenticate(provider: CentralAuthProvider): RequestHandler {
  return async (req, _res, next) => {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    if (!token) throw new UnauthorizedError('Missing bearer token');

    req.identity = await provider.verifyToken(token);
    next();
  };
}
