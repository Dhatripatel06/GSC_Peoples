import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';
import { parseDatabaseUrl } from '../../database/connection-url';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../../../.env'), quiet: true });

/** The ONLY database integration tests may ever touch. */
export const TEST_DB = 'hr_test';

type UrlKey = 'TEST_DATABASE_URL' | 'TEST_DIRECT_URL';

const dbNameOf = (url: string) => new URL(url).pathname.slice(1);

/** Returns the URL only if it points at hr_test and differs from every development URL. */
export function testUrl(key: UrlKey): string {
  const url = process.env[key];
  if (!url) throw new Error(`${key} is not set. Run: pnpm db:test:setup`);
  const name = dbNameOf(url);
  if (name !== TEST_DB)
    throw new Error(
      `SAFEGUARD: ${key} points at "${name}"; integration tests only run against "${TEST_DB}"`,
    );
  for (const dev of ['DATABASE_URL', 'DIRECT_URL']) {
    const devUrl = process.env[dev];
    if (devUrl && dbNameOf(devUrl) === name)
      throw new Error(`SAFEGUARD: ${key} must not share a database with ${dev}`);
  }
  return url;
}

/** Connects and re-verifies server-side that we are really inside hr_test before returning. */
export async function connect(key: UrlKey): Promise<pg.Client> {
  const { connectionString } = parseDatabaseUrl(testUrl(key));
  const client = new pg.Client({ connectionString });
  await client.connect();
  const { rows } = await client.query<{ db: string }>('select current_database() as db');
  if (rows[0]?.db !== TEST_DB) {
    await client.end();
    throw new Error(`SAFEGUARD: connected to "${rows[0]?.db}", expected "${TEST_DB}"`);
  }
  return client;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tracks a promise without awaiting it, so tests can assert it is still blocked. */
export function track<T>(promise: Promise<T>) {
  let state: 'pending' | 'resolved' | 'rejected' = 'pending';
  promise.then(
    () => (state = 'resolved'),
    () => (state = 'rejected'),
  );
  return { promise, state: () => state };
}

export interface PgError extends Error {
  code?: string;
  constraint?: string;
}
export async function failure(fn: () => Promise<unknown>): Promise<PgError> {
  try {
    await fn();
  } catch (e) {
    return e as PgError;
  }
  throw new Error('Expected the statement to fail, but it succeeded');
}
