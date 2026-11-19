import {
  PERMISSIONS,
  type ChangeEmployeeStatus,
  type CreateEmployee,
  type Employee,
  type EmployeeListQuery,
  type EmployeeListResponse,
  type UpdateEmployee,
} from '@gsc/contracts';
import type { AuthenticatedUser } from '../../integrations/central-auth/types';
import { ForbiddenError, NotFoundError } from '../../shared/errors';
import type { EmployeeRepository, EmployeeRow, ReadScope } from './employees.types';

const isoDay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function toEmployeeDto(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employeeNumber: row.employeeNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    workEmail: row.workEmail,
    jobTitle: row.jobTitle,
    employmentType: row.employmentType,
    status: row.status,
    hireDate: isoDay(row.hireDate),
    terminationDate: isoDay(row.terminationDate),
    department: row.department,
    manager: row.manager,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Read scope from the caller's permissions. `team` is direct reports only (managerId = caller's
 * employee), `self` is the caller's own record. Throws 403 when the caller holds no read permission.
 */
export function readScopeFor(user: AuthenticatedUser): ReadScope {
  const has = (p: string) => user.permissions.includes(p);
  if (has(PERMISSIONS.EMPLOYEE_READ_ALL)) return { kind: 'all' };
  const team = has(PERMISSIONS.EMPLOYEE_READ_TEAM);
  const self = has(PERMISSIONS.EMPLOYEE_READ_SELF);
  if (!team && !self) throw new ForbiddenError();
  return { kind: 'limited', employeeId: user.employeeId, team, self };
}

function requirePermission(user: AuthenticatedUser, permission: string): void {
  if (!user.permissions.includes(permission)) throw new ForbiddenError();
}

/**
 * Employee use cases. Authorisation lives here; data access is the repository's job and every
 * repository call receives `{ companyId }` taken from the validated membership on `user`.
 * Rows outside the caller's scope, or in another company, are reported as 404 (never 403) so their
 * existence is not revealed.
 */
export function createEmployeeService(repository: EmployeeRepository) {
  const ctx = (user: AuthenticatedUser) => ({ companyId: user.companyId });
  const actor = (user: AuthenticatedUser) => ({ userId: user.userId });

  return {
    async list(user: AuthenticatedUser, query: EmployeeListQuery): Promise<EmployeeListResponse> {
      const page = await repository.list(ctx(user), readScopeFor(user), query);
      return {
        data: page.rows.map(toEmployeeDto),
        page: { limit: query.limit, nextCursor: page.nextCursor },
      };
    },

    async get(user: AuthenticatedUser, id: string): Promise<Employee> {
      const row = await repository.get(ctx(user), readScopeFor(user), id);
      if (!row) throw new NotFoundError('Employee not found');
      return toEmployeeDto(row);
    },

    async create(user: AuthenticatedUser, input: CreateEmployee): Promise<Employee> {
      requirePermission(user, PERMISSIONS.EMPLOYEE_WRITE);
      return toEmployeeDto(await repository.create(ctx(user), actor(user), input));
    },

    async update(user: AuthenticatedUser, id: string, patch: UpdateEmployee): Promise<Employee> {
      requirePermission(user, PERMISSIONS.EMPLOYEE_WRITE);
      return toEmployeeDto(await repository.update(ctx(user), actor(user), id, patch));
    },

    async changeStatus(
      user: AuthenticatedUser,
      id: string,
      change: ChangeEmployeeStatus,
    ): Promise<Employee> {
      requirePermission(user, PERMISSIONS.EMPLOYEE_STATUS_WRITE);
      return toEmployeeDto(await repository.changeStatus(ctx(user), actor(user), id, change));
    },
  };
}

export type EmployeeService = ReturnType<typeof createEmployeeService>;
