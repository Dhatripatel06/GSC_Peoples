/**
 * `pnpm db:provision:local` - local development provisioning. Idempotent. Localhost only.
 * Uses DIRECT_URL (hr_migrator) from the repo-level .env; credentials are never printed.
 */
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';
import { parseDatabaseUrl } from '../src/database/connection-url';
import {
  assertLocalTarget,
  defaultSpec,
  provisionLocal,
} from '../src/database/provisioning/local-provisioning';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SAFEGUARD: local provisioning refuses to run with NODE_ENV=production');
  }
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error('DIRECT_URL is not set (run pnpm db:setup first)');
  const target = assertLocalTarget(url);
  const companyId = process.env.DEV_AUTH_COMPANY_ID ?? 'dev-company';

  const client = new pg.Client({ connectionString: parseDatabaseUrl(url).connectionString });
  await client.connect();
  try {
    const { rows } = await client.query<{ db: string }>('select current_database() as db');
    if (rows[0]?.db !== target.database) throw new Error('SAFEGUARD: connected database mismatch');
    const spec = defaultSpec(companyId);
    const report = await provisionLocal(client, spec);
    console.log(`Provisioned ${target.database}@${target.host}, company "${companyId}":`);
    console.table(report.created);
    for (const [role, perms] of Object.entries(report.extraPermissions)) {
      console.warn(`Note: role ${role} has grants outside the registry defaults: ${perms.join(', ')}`);
    }
    console.log('Dev tokens (AUTH_MODE=development only):');
    for (const p of spec.people) console.log(`  ${p.roleKey.padEnd(9)} Bearer dev:${p.externalId}`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
