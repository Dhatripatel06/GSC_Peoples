import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { createAuthProvider } from './integrations/central-auth';
import { authenticate } from './middleware/auth/authenticate';
import { errorHandler, notFoundHandler } from './middleware/error/error-handler';
import { requestLogger } from './middleware/request-logger';
import { healthRouter } from './modules/health/health.routes';
import { API_PREFIX } from './shared/constants';

export function createApp(): Express {
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

  const api = express.Router();
  // Public routes first.
  api.use(healthRouter);

  // Everything registered after this line requires authentication.
  // Feature routers (employees, leave, ...) are mounted here by later tasks.
  api.use(authenticate(createAuthProvider()));

  app.use(API_PREFIX, api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
