import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { getPrisma, isDatabaseConfigured } from './database/client';
import { createIdentityStore } from './database/identity';
import { createTenantRunner } from './database/tenant';
import { assertTenantMeta } from './database/tenant/assert-meta';
import {
  createAuthProvider,
  type CentralAuthProvider,
} from './integrations/central-auth';
import { authenticate } from './middleware/auth/authenticate';
import { requireCsrf } from './middleware/auth/csrf';
import { resolveTenant, type MembershipResolver } from './middleware/auth/resolve-tenant';
import { errorHandler, notFoundHandler } from './middleware/error/error-handler';
import { requestLogger } from './middleware/request-logger';
import { createDepartmentRepository } from './modules/departments/departments.repository';
import { createDepartmentsRouter } from './modules/departments/departments.routes';
import { createEmployeeRepository, type TenantRunner } from './modules/employees/employees.repository';
import { createEmployeesRouter } from './modules/employees/employees.routes';
import { createEmployeeService } from './modules/employees/employees.service';
import { createMeRouter } from './modules/me/me.routes';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createSettingsRouter } from './modules/settings/settings.routes';
import { SessionAuthProvider } from './integrations/local-auth/session-provider';
import { healthRouter } from './modules/health/health.routes';
import { API_PREFIX } from './shared/constants';

/** Overridable collaborators. Production uses the defaults; tests inject in-memory fakes. */
export interface AppDependencies {
  authProvider?: CentralAuthProvider;
  sessionProvider?: CentralAuthProvider;
  resolveMembership?: MembershipResolver;
  tenantRunner?: TenantRunner;
}

export function createApp(deps: AppDependencies = {}): Express {
  assertTenantMeta(); // fail closed if the tenant metadata is empty or wrong

  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      allowedHeaders: ['authorization', 'content-type', 'x-request-id'],
    }),
  );
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));

  // Database collaborators are created lazily so the app (and its public routes) can start,
  // and unit tests can run, without a configured database.
  const resolveMembership: MembershipResolver =
    deps.resolveMembership ?? ((input) => createIdentityStore(getPrisma()).resolveActiveMembership(input));
  let runner = deps.tenantRunner;
  const tenantRunner: TenantRunner = (ctx, fn) => (runner ??= createTenantRunner(getPrisma()))(ctx, fn);

  const api = express.Router();
  // Public routes first.
  api.use(healthRouter);

  const prisma = isDatabaseConfigured() ? getPrisma() : undefined;
  if (prisma) api.use('/auth', createAuthRouter(prisma));

  // Everything registered after this line requires authentication (who you are) ...
  api.use(authenticate(
    deps.authProvider ?? createAuthProvider(),
    deps.sessionProvider ?? (prisma ? new SessionAuthProvider(prisma) : undefined),
  ));
  api.use(requireCsrf(prisma));

  // ... and feature routes also require a validated ACTIVE company membership (which company).
  const tenant = resolveTenant(resolveMembership);
  api.use('/me', tenant, createMeRouter());
  if (prisma) api.use('/settings', tenant, createSettingsRouter(prisma));
  api.use('/employees', tenant, createEmployeesRouter(createEmployeeService(createEmployeeRepository(tenantRunner))));
  api.use('/departments', tenant, createDepartmentsRouter(createDepartmentRepository(tenantRunner)));

  app.use(API_PREFIX, api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
