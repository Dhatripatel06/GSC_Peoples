import { z } from 'zod';

/**
 * Permission registry (single source of truth, shared by API and web).
 *
 * PRD SET-003: four fixed roles, permissions defined in code, no custom roles. The role -> permission
 * map below (ROLE_PERMISSIONS) is what the API grants at runtime; `role_permissions` rows in the
 * database are NOT consulted. Scope suffixes follow PRD section 5: `all` = whole company, `team` =
 * direct and indirect reports (resolved on the server), `self` = the caller's own records.
 */
export const PERMISSIONS = {
  // Company settings (ORG-001) and organisation data (ORG-002..004)
  COMPANY_READ: 'company:read',
  COMPANY_WRITE: 'company:write',
  ORG_READ: 'org:read', // departments, designations, holidays (view)
  ORG_WRITE: 'org:write',

  // Accounts and roles (AUTH-004..006, SET-002/003)
  USER_READ: 'user:read',
  USER_INVITE: 'user:invite',
  USER_ACTIVATE: 'user:activate',
  USER_ROLE_WRITE: 'user:role:write',

  // Employee CRM (EMP-001..009)
  DIRECTORY_READ: 'directory:read', // limited directory fields, everyone
  EMPLOYEE_READ_ALL: 'employee:read:all',
  EMPLOYEE_READ_TEAM: 'employee:read:team',
  EMPLOYEE_READ_SELF: 'employee:read:self',
  EMPLOYEE_WRITE: 'employee:write',
  EMPLOYEE_STATUS_WRITE: 'employee:status:write',
  EMPLOYEE_SELF_WRITE: 'employee:self:write', // phone, address, emergency contact only (EMP-009)

  // Onboarding (ONB-001..005)
  ONBOARDING_MANAGE: 'onboarding:manage',
  ONBOARDING_OWN_TASKS: 'onboarding:own',

  // Attendance (ATT-001..007)
  ATTENDANCE_SELF: 'attendance:self', // check-in/out and request a correction
  ATTENDANCE_READ_ALL: 'attendance:read:all',
  ATTENDANCE_READ_TEAM: 'attendance:read:team',
  ATTENDANCE_READ_SELF: 'attendance:read:self',
  ATTENDANCE_DECIDE_ALL: 'attendance:decide:all',
  ATTENDANCE_DECIDE_TEAM: 'attendance:decide:team',
  ATTENDANCE_MANUAL_WRITE: 'attendance:manual:write',

  // Leave (LEAVE-001..008)
  LEAVE_MANAGE: 'leave:manage', // leave types and balance adjustments
  LEAVE_READ_ALL: 'leave:read:all', // balances, history, calendar
  LEAVE_READ_TEAM: 'leave:read:team',
  LEAVE_READ_SELF: 'leave:read:self',
  LEAVE_APPLY: 'leave:apply',
  LEAVE_DECIDE_ALL: 'leave:decide:all',
  LEAVE_DECIDE_TEAM: 'leave:decide:team',
  LEAVE_CANCEL_ANY: 'leave:cancel:any', // cancel after the leave has started

  // Documents (DOC-001..005)
  DOCUMENT_READ_ALL: 'document:read:all',
  DOCUMENT_READ_TEAM: 'document:read:team', // only documents flagged "visible to manager"
  DOCUMENT_READ_SELF: 'document:read:self',
  DOCUMENT_UPLOAD_ALL: 'document:upload:all',
  DOCUMENT_UPLOAD_SELF: 'document:upload:self',
  DOCUMENT_MANAGE: 'document:manage', // delete and set the manager-visible flag
  COMPANY_DOCUMENT_READ: 'company-document:read',
  COMPANY_DOCUMENT_WRITE: 'company-document:write',

  // Dashboards, notifications, audit (DASH-001..003, NOTIF-001, SET-004)
  DASHBOARD_ADMIN: 'dashboard:admin',
  DASHBOARD_MANAGER: 'dashboard:manager',
  DASHBOARD_EMPLOYEE: 'dashboard:employee',
  NOTIFICATION_SELF: 'notification:self',
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const permissionValues = Object.values(PERMISSIONS) as [Permission, ...Permission[]];
export const permissionSchema = z.enum(permissionValues);
export const ALL_PERMISSIONS: readonly Permission[] = permissionSchema.options;

export function isPermission(value: string): value is Permission {
  return permissionSchema.safeParse(value).success;
}

/** Company-level role keys stored in `roles.key`. */
export const ROLE_KEYS = ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value);
}

const P = PERMISSIONS;

/** Everything every signed-in employee-record holder gets (matrix rows with Own / View for all roles). */
const EVERYONE: readonly Permission[] = [
  P.ORG_READ,
  P.DIRECTORY_READ,
  P.EMPLOYEE_READ_SELF,
  P.EMPLOYEE_SELF_WRITE,
  P.ATTENDANCE_SELF,
  P.ATTENDANCE_READ_SELF,
  P.LEAVE_READ_SELF,
  P.LEAVE_APPLY,
  P.DOCUMENT_READ_SELF,
  P.DOCUMENT_UPLOAD_SELF,
  P.COMPANY_DOCUMENT_READ,
  P.NOTIFICATION_SELF,
];

/**
 * The permission matrix of PRD section 5, per role. Runtime authorisation uses exactly this map.
 *  - SUPER_ADMIN: full control, including roles and audit logs.
 *  - HR_ADMIN: company-wide people operations; company settings view-only (no `company:write`);
 *    may activate/deactivate accounts but never change roles; no audit logs.
 *  - MANAGER: own team (direct and indirect reports), work fields only; approves team leave and
 *    corrections; no onboarding checklists; documents only when flagged by HR.
 *  - EMPLOYEE: own records only.
 */
export const ROLE_PERMISSIONS: Readonly<Record<RoleKey, readonly Permission[]>> = {
  SUPER_ADMIN: [
    ...EVERYONE,
    P.COMPANY_READ,
    P.COMPANY_WRITE,
    P.ORG_WRITE,
    P.USER_READ,
    P.USER_INVITE,
    P.USER_ACTIVATE,
    P.USER_ROLE_WRITE,
    P.EMPLOYEE_READ_ALL,
    P.EMPLOYEE_WRITE,
    P.EMPLOYEE_STATUS_WRITE,
    P.ONBOARDING_MANAGE,
    P.ONBOARDING_OWN_TASKS,
    P.ATTENDANCE_READ_ALL,
    P.ATTENDANCE_DECIDE_ALL,
    P.ATTENDANCE_MANUAL_WRITE,
    P.LEAVE_MANAGE,
    P.LEAVE_READ_ALL,
    P.LEAVE_DECIDE_ALL,
    P.LEAVE_CANCEL_ANY,
    P.DOCUMENT_READ_ALL,
    P.DOCUMENT_UPLOAD_ALL,
    P.DOCUMENT_MANAGE,
    P.COMPANY_DOCUMENT_WRITE,
    P.DASHBOARD_ADMIN,
    P.AUDIT_READ,
  ],
  HR_ADMIN: [
    ...EVERYONE,
    P.COMPANY_READ,
    P.ORG_WRITE,
    P.USER_READ,
    P.USER_INVITE,
    P.USER_ACTIVATE,
    P.EMPLOYEE_READ_ALL,
    P.EMPLOYEE_WRITE,
    P.EMPLOYEE_STATUS_WRITE,
    P.ONBOARDING_MANAGE,
    P.ONBOARDING_OWN_TASKS,
    P.ATTENDANCE_READ_ALL,
    P.ATTENDANCE_DECIDE_ALL,
    P.ATTENDANCE_MANUAL_WRITE,
    P.LEAVE_MANAGE,
    P.LEAVE_READ_ALL,
    P.LEAVE_DECIDE_ALL,
    P.LEAVE_CANCEL_ANY,
    P.DOCUMENT_READ_ALL,
    P.DOCUMENT_UPLOAD_ALL,
    P.DOCUMENT_MANAGE,
    P.COMPANY_DOCUMENT_WRITE,
    P.DASHBOARD_ADMIN,
  ],
  MANAGER: [
    ...EVERYONE,
    P.EMPLOYEE_READ_TEAM,
    P.ATTENDANCE_READ_TEAM,
    P.ATTENDANCE_DECIDE_TEAM,
    P.LEAVE_READ_TEAM,
    P.LEAVE_DECIDE_TEAM,
    P.DOCUMENT_READ_TEAM,
    P.DASHBOARD_MANAGER,
  ],
  EMPLOYEE: [...EVERYONE, P.ONBOARDING_OWN_TASKS, P.DASHBOARD_EMPLOYEE],
};

/** Permissions granted to a role key. Unknown role keys get nothing (fail closed). */
export function permissionsForRole(roleKey: string): Permission[] {
  return isRoleKey(roleKey) ? [...new Set(ROLE_PERMISSIONS[roleKey])] : [];
}

/** @deprecated Kept for existing imports; identical to ROLE_PERMISSIONS. */
export const ROLE_DEFAULT_PERMISSIONS = ROLE_PERMISSIONS;

/** Which dashboard a role lands on (DASH-001..003). */
export type DashboardKind = 'admin' | 'manager' | 'employee';
export function dashboardForRole(roleKey: string): DashboardKind | null {
  switch (roleKey) {
    case 'SUPER_ADMIN':
    case 'HR_ADMIN':
      return 'admin';
    case 'MANAGER':
      return 'manager';
    case 'EMPLOYEE':
      return 'employee';
    default:
      return null;
  }
}
