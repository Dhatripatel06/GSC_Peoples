import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, isPermission } from './permissions';

describe('permission registry', () => {
  it('defines exactly the approved employee permissions', () => {
    expect([...ALL_PERMISSIONS].sort()).toEqual(
      [
        'employee:read:all',
        'employee:read:team',
        'employee:read:self',
        'employee:write',
        'employee:status:write',
      ].sort(),
    );
  });

  it('isPermission rejects anything outside the registry', () => {
    expect(isPermission('employee:write')).toBe(true);
    expect(isPermission('employee:*')).toBe(false);
    expect(isPermission('')).toBe(false);
  });

  it('role defaults: employees and managers cannot write; only HR/super admins change status', () => {
    expect(ROLE_DEFAULT_PERMISSIONS.EMPLOYEE).toEqual([PERMISSIONS.EMPLOYEE_READ_SELF]);
    expect(ROLE_DEFAULT_PERMISSIONS.MANAGER).toEqual([
      PERMISSIONS.EMPLOYEE_READ_TEAM,
      PERMISSIONS.EMPLOYEE_READ_SELF,
    ]);
    expect(ROLE_DEFAULT_PERMISSIONS.HR_ADMIN).toContain(PERMISSIONS.EMPLOYEE_WRITE);
    expect(ROLE_DEFAULT_PERMISSIONS.HR_ADMIN).toContain(PERMISSIONS.EMPLOYEE_STATUS_WRITE);
    expect(ROLE_DEFAULT_PERMISSIONS.SUPER_ADMIN).toEqual(ALL_PERMISSIONS);
  });
});
