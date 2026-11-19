import { z } from 'zod';
import { permissionSchema } from './permissions';

/**
 * GET /api/v1/me - who the verified caller is, in which company, and what they may do.
 * Derived only from the validated ACTIVE membership (never from request input). The frontend uses
 * it for display and UI gating; the API still enforces every permission itself.
 */
export const meResponseSchema = z.object({
  data: z.object({
    userId: z.string(),
    employeeId: z.string().nullable(),
    companyId: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
    roles: z.array(z.string()),
    permissions: z.array(permissionSchema),
  }),
});
export type MeResponse = z.infer<typeof meResponseSchema>;
