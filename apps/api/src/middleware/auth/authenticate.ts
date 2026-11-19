import type { RequestHandler } from 'express';
import type { CentralAuthProvider } from '../../integrations/central-auth';
import { UnauthorizedError } from '../../shared/errors';

/** Verifies the bearer token with the configured Central Auth provider and sets req.user. */
export function authenticate(provider: CentralAuthProvider): RequestHandler {
  return async (req, _res, next) => {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    if (!token) throw new UnauthorizedError('Missing bearer token');

    const identity = await provider.verifyToken(token);
    const access = await provider.resolveAccess(identity);
    req.user = {
      externalId: identity.externalId,
      email: identity.email,
      name: identity.name,
      companyId: identity.companyId,
      ...access,
    };
    next();
  };
}
