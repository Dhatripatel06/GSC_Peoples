import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';
import { PrismaClient } from './generated/client';

let client: PrismaClient | undefined;

export const isDatabaseConfigured = () => Boolean(env.DATABASE_URL);

/** Lazily creates the singleton Prisma client. Throws if DATABASE_URL is not set. */
export function getPrisma(): PrismaClient {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  client ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  return client;
}

export async function disconnectDatabase(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}
