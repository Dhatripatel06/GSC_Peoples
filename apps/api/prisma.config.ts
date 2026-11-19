import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env itself. The repo-level .env is the single source.
loadEnv({ path: path.resolve(import.meta.dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: 'src/database/prisma/schema.prisma',
  migrations: {
    path: 'src/database/migrations',
    seed: 'tsx src/database/seeds/index.ts',
  },
  datasource: {
    // Empty when unset so `prisma generate` works without a database.
    url: process.env.DATABASE_URL ?? '',
  },
});
