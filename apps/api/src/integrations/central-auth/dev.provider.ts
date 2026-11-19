import { UnauthorizedError } from '../../shared/errors';
import type { CentralAuthProvider, VerifiedIdentity } from './types';

/**
 * LOCAL DEVELOPMENT ONLY - not an authentication system and not SSO.
 * Accepts tokens of the form `dev:<externalId>[:<role>[,<role>...]]` with no
 * cryptographic verification. The env schema refuses AUTH_MODE=development in
 * production, and the factory refuses it again as a second guard.
 */
export class DevAuthProvider implements CentralAuthProvider {
  readonly kind = 'development' as const;

  constructor(private readonly companyId: string) {}

  verifyToken(token: string): Promise<VerifiedIdentity> {
    const [prefix, externalId, roles] = token.split(':');
    if (prefix !== 'dev' || !externalId) {
      return Promise.reject(
        new UnauthorizedError('Development adapter expects "dev:<userId>[:<role,role>]"'),
      );
    }
    return Promise.resolve({
      externalId,
      companyId: this.companyId,
      rawRoles: roles ? roles.split(',').filter(Boolean) : [],
    });
  }

  resolveAccess(identity: VerifiedIdentity) {
    // Roles pass through unchanged; real role -> permission mapping is pending the platform contract.
    return Promise.resolve({ roles: identity.rawRoles ?? [], permissions: [] as string[] });
  }

  syncUser(): Promise<void> {
    return Promise.resolve();
  }
}
