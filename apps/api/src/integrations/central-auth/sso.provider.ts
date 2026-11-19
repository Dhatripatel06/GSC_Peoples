import { NotImplementedError, UnauthorizedError } from '../../shared/errors';
import type { CentralAuthProvider } from './types';

/**
 * Placeholder for the production Central Authentication integration.
 * It FAILS CLOSED: until the platform contract (token format, JWKS/issuer,
 * claim mapping) is provided, no token is ever accepted.
 */
export class SsoProvider implements CentralAuthProvider {
  readonly kind = 'sso' as const;

  verifyToken(): Promise<never> {
    return Promise.reject(new UnauthorizedError('Central Authentication is not configured yet'));
  }

  resolveAccess(): Promise<never> {
    return Promise.reject(new NotImplementedError('Central Authentication role mapping pending'));
  }

  syncUser(): Promise<never> {
    return Promise.reject(new NotImplementedError('Central Authentication user sync pending'));
  }
}
