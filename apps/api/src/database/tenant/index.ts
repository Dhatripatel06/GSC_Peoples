import { getPrisma } from '../client';
import { createTenantRunner } from './tenant-db';

export { createTenantRunner, COMPANY_SETTING, type TenantDb } from './tenant-db';
export { TenantViolationError } from './scope';
export type { TenantContext } from './types';

/** The application entry point for company-owned data. */
export const withTenant: ReturnType<typeof createTenantRunner> = (ctx, fn) =>
  createTenantRunner(getPrisma())(ctx, fn);
