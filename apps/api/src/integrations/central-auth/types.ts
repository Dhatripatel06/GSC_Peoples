/**
 * Contract between the HR app and the platform's Central Authentication.
 * The real token claims, endpoints and user mapping are NOT known yet; every
 * production-facing detail stays behind this interface and configuration.
 */

export interface AuthenticatedUser {
  /** Stable identity issued by Central Authentication. */
  externalId: string;
  email?: string;
  name?: string;
  /** Company (tenant) the user is acting for. All HR data is scoped to it. */
  companyId: string;
  roles: string[];
  permissions: string[];
}

/** Claims extracted from a verified token, before role/permission resolution. */
export interface VerifiedIdentity {
  externalId: string;
  email?: string;
  name?: string;
  companyId: string;
  rawRoles?: string[];
}

export interface CentralAuthProvider {
  readonly kind: 'development' | 'sso';
  /** Verify a bearer token and extract the caller's identity. Throws UnauthorizedError on failure. */
  verifyToken(token: string): Promise<VerifiedIdentity>;
  /** Map platform roles to HR roles and permissions. */
  resolveAccess(
    identity: VerifiedIdentity,
  ): Promise<Pick<AuthenticatedUser, 'roles' | 'permissions'>>;
  /** Create or update the local HR user record for this identity. */
  syncUser(identity: VerifiedIdentity): Promise<void>;
}
