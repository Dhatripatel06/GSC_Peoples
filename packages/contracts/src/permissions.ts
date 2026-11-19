import { z } from 'zod';

/**
 * Permission registry (single source of truth, shared by API and web).
 * Strings are stored in `role_permissions.permission`; unknown strings found in the database are
 * ignored by the API, so a typo or retired permission can never grant access.
 */
export const PERMISSIONS = {
  EMPLOYEE_READ_ALL: 'employee:read:all',
  EMPLOYEE_READ_TEAM: 'employee:read:team',
  EMPLOYEE_READ_SELF: 'employee:read:self',
  EMPLOYEE_WRITE: 'employee:write',
  EMPLOYEE_STATUS_WRITE: 'employee:status:write',
} as const;

export const permissionSchema = z.enum([
  PERMISSIONS.EMPLOYEE_READ_ALL,
  PERMISSIONS.EMPLOYEE_READ_TEAM,
  PERMISSIONS.EMPLOYEE_READ_SELF,
  PERMISSIONS.EMPLOYEE_WRITE,
  PERMISSIONS.EMPLOYEE_STATUS_WRITE,
]);
export type Permission = z.infer<typeof permissionSchema>;
export const ALL_PERMISSIONS: readonly Permission[] = permissionSchema.options;

export function isPermission(value: string): value is Permission {
  return permissionSchema.safeParse(value).success;
}

/** Company-level role keys stored in `roles.key`. */
export const ROLE_KEYS = ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/**
 * Recommended default grants per role, for seeding `role_permissions` when a company is provisioned.
 * Runtime authorisation reads the database rows, not this map.
 *  - HR_ADMIN / SUPER_ADMIN: whole company, may create, edit and change status.
 *  - MANAGER: direct reports (team scope) and own profile. No writes.
 *  - EMPLOYEE: own profile only. No writes (employees cannot edit their own record in this phase).
 */
export const ROLE_DEFAULT_PERMISSIONS: Readonly<Record<RoleKey, readonly Permission[]>> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  HR_ADMIN: [
    PERMISSIONS.EMPLOYEE_READ_ALL,
    PERMISSIONS.EMPLOYEE_READ_SELF,
    PERMISSIONS.EMPLOYEE_WRITE,
    PERMISSIONS.EMPLOYEE_STATUS_WRITE,
  ],
  MANAGER: [PERMISSIONS.EMPLOYEE_READ_TEAM, PERMISSIONS.EMPLOYEE_READ_SELF],
  EMPLOYEE: [PERMISSIONS.EMPLOYEE_READ_SELF],
};
