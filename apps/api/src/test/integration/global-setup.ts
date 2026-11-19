import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { connect, TEST_DB } from './helpers';

const db = path.resolve(import.meta.dirname, '../../database');

/**
 * Rebuilds schema `hr` inside hr_test from scratch before the integration run, from the real
 * migrations (the same folders `prisma migrate deploy` applies to hr_db), in name order.
 * `connect()` refuses anything but hr_test, so the DROP below can never reach hr_db.
 */
export default async function setup() {
  const c = await connect('TEST_DIRECT_URL');
  try {
    const { rows } = await c.query<{ db: string }>('select current_database() as db');
    if (rows[0]?.db !== TEST_DB)
      throw new Error('SAFEGUARD: refusing to reset a database that is not hr_test');

    await c.query('DROP SCHEMA IF EXISTS hr CASCADE');
    await c.query('CREATE SCHEMA hr AUTHORIZATION hr_migrator');
    await c.query('GRANT USAGE ON SCHEMA hr TO hr_app');
    await c.query(
      'ALTER DEFAULT PRIVILEGES FOR ROLE hr_migrator IN SCHEMA hr GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hr_app',
    );
    await c.query(
      'ALTER DEFAULT PRIVILEGES FOR ROLE hr_migrator IN SCHEMA hr GRANT USAGE, SELECT ON SEQUENCES TO hr_app',
    );
    await c.query('SET search_path = hr'); // what Prisma does for ?schema=hr while applying migrations

    // Exactly the files `prisma migrate deploy` applies to hr_db: every folder in migrations/, in name order.
    const migrations = readdirSync(path.join(db, 'migrations'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const name of migrations) {
      await c.query(readFileSync(path.join(db, 'migrations', name, 'migration.sql'), 'utf8'));
    }
  } finally {
    await c.end();
  }
}
