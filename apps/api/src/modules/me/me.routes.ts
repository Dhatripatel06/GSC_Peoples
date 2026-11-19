import { Router } from 'express';
import type { MeResponse } from '@gsc/contracts';
import { isPermission } from '@gsc/contracts';
import { UnauthorizedError } from '../../shared/errors';

/**
 * Mounted at /api/v1/me AFTER `authenticate` and `resolveTenant`. Read-only; returns exactly what the
 * validated membership grants. No database access, no request input is read.
 */
export function createMeRouter(): Router {
  const router = Router();
  router.get('/', (req, res) => {
    const u = req.user;
    if (!u) throw new UnauthorizedError();
    const body: MeResponse = {
      data: {
        userId: u.userId,
        employeeId: u.employeeId,
        companyId: u.companyId,
        ...(u.email ? { email: u.email } : {}),
        ...(u.name ? { name: u.name } : {}),
        roles: u.roles,
        permissions: u.permissions.filter(isPermission),
      },
    };
    res.json(body);
  });
  return router;
}
