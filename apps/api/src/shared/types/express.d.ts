import type { AuthenticatedUser, VerifiedIdentity } from '../../integrations/central-auth/types';

declare global {
  namespace Express {
    interface Request {
      /** Verified token claims. Set by `authenticate`. Not yet authorised for any company. */
      identity?: VerifiedIdentity;
      /** Authorised caller. Set by `resolveTenant` after a validated ACTIVE membership lookup. */
      user?: AuthenticatedUser;
    }
  }
}

export {};
