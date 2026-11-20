import type { RequestHandler } from 'express';
import type { CentralAuthProvider } from '../../integrations/central-auth';
import { UnauthorizedError } from '../../shared/errors';

/**
 * Verifies the bearer token with the configured Central Auth provider and sets `req.identity`.
 * This proves who the caller is; it does NOT grant access to any company. Feature routes must also
 * run `resolveTenant`, which validates an ACTIVE membership and sets `req.user`.
 */
export function authenticate(provider: CentralAuthProvider, sessionProvider?: CentralAuthProvider): RequestHandler {
  return async (req, _res, next) => {
    const header = req.header('authorization');
    const bearerToken = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;

    const cookieHeader = req.headers.cookie;
    const sessionCookie = cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('gsc_session='));
    const sessionToken = sessionCookie ? decodeURIComponent(sessionCookie.slice('gsc_session='.length)) : undefined;

    if (!bearerToken && !sessionToken) throw new UnauthorizedError('Missing bearer token or session');

    req.identity = await (sessionToken && sessionProvider
      ? sessionProvider.verifyToken(sessionToken)
      : provider.verifyToken(bearerToken!));
    await provider.syncUser(req.identity);
    next();
  };
}
