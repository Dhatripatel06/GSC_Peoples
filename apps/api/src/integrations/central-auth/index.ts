import { env } from '../../config/env';
import { DevAuthProvider } from './dev.provider';
import { SsoProvider } from './sso.provider';
import type { CentralAuthProvider } from './types';

export type { AuthenticatedUser, CentralAuthProvider, VerifiedIdentity } from './types';

export function createAuthProvider(): CentralAuthProvider {
  if (env.AUTH_MODE === 'sso') return new SsoProvider();
  if (env.NODE_ENV === 'production') {
    throw new Error('Development authentication adapter must never run in production');
  }
  return new DevAuthProvider(env.DEV_AUTH_COMPANY_ID);
}
