import { Router } from 'express';
import { healthController } from './health.controller';

export const healthRouter: Router = Router();

// Public: no authentication, used by load balancers and local checks.
healthRouter.get('/health', healthController);
