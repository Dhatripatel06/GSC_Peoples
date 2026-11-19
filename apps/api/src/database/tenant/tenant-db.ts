import { Prisma, type PrismaClient } from '../generated/client';
import { tenantMeta } from './meta.generated';
import { ALLOWED_OPERATIONS, scopeOperation, TenantViolationError } from './scope';
import type { TenantContext } from './types';

/** Company-owned delegates exposed to application code. `user` and every raw method are absent. */
const DELEGATES = {
  company: 'Company',
  role: 'Role',
  rolePermission: 'RolePermission',
  department: 'Department',
  companyMembership: 'CompanyMembership',
  employee: 'Employee',
  employeeAuditLog: 'EmployeeAuditLog',
} as const;

type DelegateKey = keyof typeof DELEGATES;
export type TenantDb = Pick<Prisma.TransactionClient, DelegateKey>;

/** Setting read by (future) row-level-security policies: `current_setting('app.company_id', true)`. */
export const COMPANY_SETTING = 'app.company_id';

function scopeClient(tx: Prisma.TransactionClient, ctx: TenantContext): TenantDb {
  const facade: Record<string, unknown> = {};
  for (const [key, modelName] of Object.entries(DELEGATES)) {
    const delegate = (tx as unknown as Record<string, Record<string, (a?: unknown) => unknown>>)[
      key
    ];
    facade[key] = new Proxy(
      {},
      {
        get(_target, operation) {
          if (typeof operation !== 'string' || !ALLOWED_OPERATIONS.has(operation)) {
            throw new TenantViolationError(
              `Operation "${String(operation)}" is not available on the tenant client`,
            );
          }
          // Violations surface as rejected promises (never synchronous throws), like any Prisma error.
          return (args?: unknown) => {
            try {
              return delegate?.[operation]?.(
                scopeOperation(tenantMeta, ctx, modelName, operation, args),
              );
            } catch (error) {
              return Promise.reject(error);
            }
          };
        },
      },
    );
  }
  return facade as TenantDb;
}

/**
 * Creates `withTenant(ctx, fn)` bound to a Prisma client.
 *
 * Every tenant unit of work runs in ONE interactive transaction (READ COMMITTED, which the
 * manager-cycle trigger relies on). Inside it:
 *   1. `set_config('app.company_id', <id>, true)` is the parameterised form of `SET LOCAL`, so the
 *      value exists only for this transaction and is discarded on COMMIT/ROLLBACK. A pooled
 *      connection therefore never carries one tenant's id into another tenant's work.
 *   2. All model access goes through a facade that rewrites every operation with `scopeOperation`.
 *      Prisma cannot extend an already-open transaction client, which is why this is a facade over
 *      the transaction client rather than a `$extends` extension.
 * The facade has no `$queryRaw`/`$executeRaw`, no `user` delegate and no `$transaction`.
 */
export function createTenantRunner(prisma: PrismaClient) {
  return async function withTenant<T>(
    ctx: TenantContext,
    fn: (db: TenantDb) => Promise<T>,
  ): Promise<T> {
    if (!ctx.companyId) throw new TenantViolationError('Missing tenant context');
    return prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT set_config(${COMPANY_SETTING}, ${ctx.companyId}, true)`;
        return fn(scopeClient(tx, ctx));
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  };
}
