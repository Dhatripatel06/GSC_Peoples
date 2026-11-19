import type { RequestHandler } from 'express';
import { getHealth } from './health.service';

export const healthController: RequestHandler = async (_req, res) => {
  res.json(await getHealth());
};
