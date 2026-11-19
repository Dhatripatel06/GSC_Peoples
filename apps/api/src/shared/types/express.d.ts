import type { AuthenticatedUser } from '../../integrations/central-auth/types';

declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware. */
      user?: AuthenticatedUser;
    }
  }
}

export {};
