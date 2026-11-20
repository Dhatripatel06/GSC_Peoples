import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../../database/client';
import type { PrismaClient } from '../../database/generated/client';
import { runInTenantContext, withRequestTenantContext } from '../../database/tenant/request-context';
import { connect, failure, testUrl } from './helpers';
import { insertCompany, insertDepartment, insertEmployee, insertRole, insertUser, resetData } from './seed';

/**
 * Row-Level Security, verified as the real runtime role (hr_app) on real PostgreSQL (hr_test).
 * Fixtures are inserted by the table owner (hr_migrator), which RLS does not apply to.
 */

let admin: pg.Client; // hr_migrator (owner): fixtures and ground truth
let app: pg.Client; // hr_app: what the API connects as
let prisma: PrismaClient;

beforeAll(async () => {
  admin = await connect('TEST_DIRECT_URL');
  app = await connect('TEST_DATABASE_URL');
  prisma = createPrismaClient(testUrl('TEST_DATABASE_URL'), { max: 4 });
});
afterAll(async () => {
  await prisma?.$disconnect();
  await app?.end();
  await admin?.end();
});

/** table -> a valid INSERT for company `$2` with row id `$1` (parents exist per company, see seed). */
const TABLES: Record<string, { company: string; insert: string; appendOnly?: boolean }> = {
  companies: { company: 'id', insert: `INSERT INTO hr.companies (id,name,"updatedAt") VALUES ($1,$2,now())` },
  employees: {
    company: '"companyId"',
    insert: `INSERT INTO hr.employees (id,"companyId","employeeNumber","firstName","lastName","updatedAt") VALUES ($1,$2,$1,'a','b',now())`,
  },
  departments: {
    company: '"companyId"',
    insert: `INSERT INTO hr.departments (id,"companyId",name,"updatedAt") VALUES ($1,$2,$1,now())`,
  },
  holidays: {
    company: '"companyId"',
    insert: `INSERT INTO hr.holidays (id,"companyId",date,name,"updatedAt") VALUES ($1,$2,DATE '2030-01-01' + (abs(hashtext($1)) % 3000),'n',now())`,
  },
  role_permissions: {
    company: '"companyId"',
    insert: `INSERT INTO hr.role_permissions (id,"companyId","roleId",permission) VALUES ($1,$2,'r-'||$2,'x:'||$1)`,
  },
  employee_audit_logs: {
    company: '"companyId"',
    appendOnly: true,
    insert: `INSERT INTO hr.employee_audit_logs (id,"companyId","employeeId","actorUserId",action,changes) VALUES ($1,$2,'e-'||$2,'u1','CREATED','{}')`,
  },
  audit_logs: {
    company: '"companyId"',
    appendOnly: true,
    insert: `INSERT INTO hr.audit_logs (id,"companyId",action,entity,"entityId") VALUES ($1,$2,'X','t','1')`,
  },
};
const names = Object.keys(TABLES);
/** A column and a valid value used to attempt UPDATEs on each table. */
const SET: Record<string, string> = {
  companies: `name = 'hacked'`,
  employees: `"firstName" = 'hacked'`,
  departments: `name = 'hacked'`,
  holidays: `name = 'hacked'`,
  role_permissions: `permission = 'hacked'`,
  employee_audit_logs: `action = 'UPDATED'`,
  audit_logs: `action = 'hacked'`,
};
const HACKED: Record<string, string> = {
  companies: `name = 'hacked'`,
  employees: `"firstName" = 'hacked'`,
  departments: `name = 'hacked'`,
  holidays: `name = 'hacked'`,
  role_permissions: `permission = 'hacked'`,
  employee_audit_logs: `action = 'UPDATED'`,
  audit_logs: `action = 'hacked'`,
};

beforeEach(async () => {
  await resetData(admin);
  await admin.query('TRUNCATE hr.holidays, hr.employee_audit_logs, hr.audit_logs CASCADE');
  await insertUser(admin, 'u1');
  for (const c of ['c1', 'c2']) {
    await insertCompany(admin, c);
    await insertRole(admin, `r-${c}`, c);
    await insertDepartment(admin, `d-${c}`, c);
    await insertEmployee(admin, { id: `e-${c}`, companyId: c });
    for (const [t, def] of Object.entries(TABLES)) {
      if (t === 'companies' || t === 'employees' || t === 'departments') continue; // created explicitly above
      await admin.query(def.insert, [`seed-${t}-${c}`, c]);
    }
  }
});

/** Runs fn in one transaction on the hr_app connection with the tenant set the way the API does it. */
async function asTenant<T>(company: string, fn: () => Promise<T>): Promise<T> {
  await app.query('BEGIN');
  try {
    await app.query('SELECT set_config($1, $2, true)', ['app.company_id', company]);
    const result = await fn();
    await app.query('COMMIT');
    return result;
  } catch (e) {
    await app.query('ROLLBACK');
    throw e;
  }
}
/** Rows a statement changed on the given connection, or 0 when the database refused it outright. */
async function affected(client: pg.Client, sql: string): Promise<number> {
  try {
    return (await client.query(sql)).rowCount ?? 0;
  } catch {
    return 0;
  }
}
const adminCount = async (t: string, where = 'true') =>
  (await admin.query(`SELECT count(*)::int AS n FROM hr.${t} WHERE ${where}`)).rows[0].n as number;
const appCount = async (t: string, where = 'true') =>
  (await app.query(`SELECT count(*)::int AS n FROM hr.${t} WHERE ${where}`)).rows[0].n as number;

describe('catalog: what RLS is on, and who it applies to', () => {
  it('RLS is enabled on exactly the seven covered tables, with the intended policies', async () => {
    const on = (await admin.query(
      `SELECT relname FROM pg_class WHERE relnamespace='hr'::regnamespace AND relkind='r' AND relrowsecurity ORDER BY relname`,
    )).rows.map((r) => r.relname);
    expect(on).toEqual([...names].sort());

    const pol = (await admin.query(
      `SELECT tablename, policyname, cmd, permissive FROM pg_policies WHERE schemaname='hr' ORDER BY tablename, policyname`,
    )).rows.map((r) => `${r.tablename}:${r.policyname}:${r.cmd}:${r.permissive}`);
    expect(pol).toEqual([
      'audit_logs:audit_logs_tenant_insert:INSERT:PERMISSIVE',
      'audit_logs:audit_logs_tenant_select:SELECT:PERMISSIVE',
      'companies:companies_tenant_select:SELECT:PERMISSIVE',
      'companies:companies_tenant_update:UPDATE:PERMISSIVE',
      'departments:departments_tenant_isolation:ALL:PERMISSIVE',
      'employee_audit_logs:employee_audit_logs_tenant_insert:INSERT:PERMISSIVE',
      'employee_audit_logs:employee_audit_logs_tenant_select:SELECT:PERMISSIVE',
      'employees:employees_tenant_isolation:ALL:PERMISSIVE',
      'holidays:holidays_tenant_isolation:ALL:PERMISSIVE',
      'role_permissions:role_permissions_tenant_isolation:ALL:PERMISSIVE',
    ]);
  });

  it('the runtime role cannot bypass RLS: not superuser, no BYPASSRLS, owns none of the tables', async () => {
    const r = (await admin.query(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname='hr_app'`)).rows[0];
    expect(r).toEqual({ rolsuper: false, rolbypassrls: false });
    const owners = (await admin.query(
      `SELECT DISTINCT tableowner FROM pg_tables WHERE schemaname='hr'`,
    )).rows.map((x) => x.tableowner);
    expect(owners).toEqual(['hr_migrator']);
  });

  it('documents the tables NOT covered (authentication plane): RLS is off on exactly these', async () => {
    const off = (await admin.query(
      `SELECT relname FROM pg_class WHERE relnamespace='hr'::regnamespace AND relkind='r' AND NOT relrowsecurity AND relname <> '_prisma_migrations' ORDER BY relname`,
    )).rows.map((r) => r.relname);
    expect(off).toEqual([
      'company_memberships',
      'invitation_tokens',
      'password_reset_tokens',
      'roles',
      'user_sessions',
      'users',
    ]);
  });
});

describe('missing tenant context fails closed', () => {
  for (const t of names) {
    it(`${t}: no rows readable, nothing insertable, nothing updatable or deletable`, async () => {
      const before = await adminCount(t);
      expect(before).toBeGreaterThan(0);

      // a brand-new connection: the setting was never defined
      const fresh = await connect('TEST_DATABASE_URL');
      try {
        expect((await fresh.query(`SELECT count(*)::int AS n FROM hr.${t}`)).rows[0].n).toBe(0);
        const ins = await failure(() => fresh.query(TABLES[t]!.insert, [`new-${t}`, 'c1']));
        expect(ins.code).toBe('42501'); // new row violates row-level security policy
        expect(await affected(fresh, `UPDATE hr.${t} SET ${SET[t]}`)).toBe(0);
        expect(await affected(fresh, `DELETE FROM hr.${t}`)).toBe(0);
      } finally {
        await fresh.end();
      }
      expect(await adminCount(t)).toBe(before); // nothing changed
    });
  }

  it('the setting reverts when the transaction ends (empty string, not the previous tenant)', async () => {
    await asTenant('c1', async () => expect(await appCount('employees')).toBe(1));
    expect((await app.query(`SELECT current_setting('app.company_id', true) AS v`)).rows[0].v).toBe('');
    expect(await appCount('employees')).toBe(0);
    expect(await appCount('companies')).toBe(0);
  });

  it('an empty or garbage tenant value matches nothing', async () => {
    for (const bad of ['', "c1' OR '1'='1", 'c1 ', 'C1', '%']) {
      await asTenant(bad, async () => {
        for (const t of names) expect(await appCount(t), `${t} with "${bad}"`).toBe(0);
      });
    }
  });
});

describe('cross-company reads and writes with a tenant context', () => {
  for (const t of names) {
    it(`${t}: tenant c1 sees only c1; cannot read, create, move, change or delete c2 rows`, async () => {
      const col = TABLES[t]!.company;
      await asTenant('c1', async () => {
        expect(await appCount(t)).toBe(await adminCount(t, `${col} = 'c1'`));
        expect(await appCount(t, `${col} = 'c2'`)).toBe(0); // explicit attempt to read the other company
      });

      // INSERT for the other company: WITH CHECK rejects
      const ins = await failure(() => asTenant('c1', () => app.query(TABLES[t]!.insert, [`x-${t}`, 'c2'])));
      expect(ins.code).toBe('42501');
      expect(await adminCount(t, `${col} = 'c2'`)).toBe(1); // untouched

      // UPDATE / DELETE targeting the other company affect nothing
      const moved = await asTenant('c1', async () => [
        await affected(app, `UPDATE hr.${t} SET ${SET[t]} WHERE ${col} = 'c2'`),
        await affected(app, `DELETE FROM hr.${t} WHERE ${col} = 'c2'`),
      ]);
      expect(moved).toEqual([0, 0]);
      expect(await adminCount(t, `${col} = 'c2' AND ${HACKED[t]}`)).toBe(0);
      expect(await adminCount(t, `${col} = 'c2'`)).toBe(1);
    });
  }

  it('a row cannot be moved to another company by updating its company column', async () => {
    const err = await failure(() =>
      asTenant('c1', () => app.query(`UPDATE hr.employees SET "companyId" = 'c2' WHERE id = 'e-c1'`)),
    );
    expect(err.code).toBe('42501');
    expect(await adminCount('employees', `id='e-c1' AND "companyId"='c1'`)).toBe(1);
  });

  it('own-company writes work normally (policies do not over-block)', async () => {
    await asTenant('c1', async () => {
      await app.query(TABLES.holidays!.insert, ['own-h', 'c1']);
      await app.query(`UPDATE hr.holidays SET name='renamed' WHERE id='own-h'`);
      await app.query(`UPDATE hr.companies SET name='Renamed Co' WHERE id='c1'`);
      await app.query(TABLES.audit_logs!.insert, ['own-a', 'c1']);
      await app.query(`DELETE FROM hr.holidays WHERE id='own-h'`);
    });
    expect(await adminCount('companies', `id='c1' AND name='Renamed Co'`)).toBe(1);
    expect(await adminCount('holidays', `id='own-h'`)).toBe(0);
    expect(await adminCount('audit_logs', `id='own-a'`)).toBe(1);
  });

  it('switching tenants on one pooled connection never leaks: c1, c2, none, c1', async () => {
    for (const [c, expected] of [['c1', 'e-c1'], ['c2', 'e-c2']] as const) {
      await asTenant(c, async () => {
        expect((await app.query('SELECT id FROM hr.employees')).rows.map((r) => r.id)).toEqual([expected]);
      });
    }
    expect(await appCount('employees')).toBe(0);
    await asTenant('c1', async () => expect(await appCount('employees')).toBe(1));
  });

  it('composite foreign keys still stop cross-company references from inside a valid tenant', async () => {
    const err = await failure(() =>
      asTenant('c1', () =>
        app.query(
          `INSERT INTO hr.employees (id,"companyId","employeeNumber","firstName","lastName","departmentId","updatedAt") VALUES ('bad','c1','bad','a','b','d-c2',now())`,
        ),
      ),
    );
    expect(err.code).toBe('23503');
  });
});

describe('companies: read and update own row only', () => {
  it('cannot create or delete a company, or read another', async () => {
    await asTenant('c1', async () => {
      expect((await app.query('SELECT id FROM hr.companies')).rows.map((r) => r.id)).toEqual(['c1']);
    });
    const ins = await failure(() => asTenant('c1', () => app.query(TABLES.companies!.insert, ['c3', 'c3'])));
    expect(ins.code).toBe('42501');
    expect(await asTenant('c1', () => affected(app, `DELETE FROM hr.companies WHERE id='c1'`))).toBe(0);
    expect(await adminCount('companies')).toBe(2);
  });
});

describe('audit tables are append-only for the runtime role', () => {
  for (const t of ['audit_logs', 'employee_audit_logs']) {
    it(`${t}: insert and read own company only; update and delete change nothing`, async () => {
      await asTenant('c1', async () => {
        await app.query(TABLES[t]!.insert, [`mine-${t}`, 'c1']);
        expect(await appCount(t)).toBe(2);
      });
      for (const sql of [`UPDATE hr.${t} SET ${SET[t]}`, `DELETE FROM hr.${t}`]) {
        expect(await asTenant('c1', () => affected(app, sql))).toBe(0);
      }
      expect(await adminCount(t, HACKED[t]!)).toBe(0); // no row was altered
      expect(await adminCount(t, `"companyId" = 'c1'`)).toBe(2);
    });
  }
});

describe('the API client carries the request tenant into RLS (withRequestTenantContext)', () => {
  const ctx = () => withRequestTenantContext(prisma);

  it('without a request context nothing is visible and nothing can be written (fail closed)', async () => {
    const db = ctx();
    expect(await db.company.findMany()).toEqual([]);
    expect(await db.employee.count()).toBe(0);
    await expect(
      db.auditLog.create({ data: { companyId: 'c1', action: 'X', entity: 't', entityId: '1' } }),
    ).rejects.toBeDefined();
  });

  it('inside a request context it sees only that company, for model calls and for $transaction', async () => {
    const db = ctx();
    await runInTenantContext('c1', async () => {
      expect((await db.company.findMany()).map((c) => c.id)).toEqual(['c1']);
      expect(await db.employee.count()).toBe(1);
      const viaTx = await db.$transaction(async (tx) => (await tx.employee.findMany({ select: { id: true } })).map((e) => e.id));
      expect(viaTx).toEqual(['e-c1']);
      // cannot reach or write the other company, even by id
      expect(await db.employee.findFirst({ where: { id: 'e-c2' } })).toBeNull();
      expect((await db.employee.updateMany({ where: { id: 'e-c2' }, data: { firstName: 'x' } })).count).toBe(0);
      await expect(
        db.auditLog.create({ data: { companyId: 'c2', action: 'X', entity: 't', entityId: '1' } }),
      ).rejects.toBeDefined();
      const ok = await db.auditLog.create({ data: { companyId: 'c1', action: 'OK', entity: 't', entityId: randomUUID() } });
      expect(ok.companyId).toBe('c1');
    });
    await runInTenantContext('c2', async () => {
      expect((await db.company.findMany()).map((c) => c.id)).toEqual(['c2']);
    });
    expect(await db.company.findMany()).toEqual([]); // and back to nothing outside any request
  });

  it('concurrent requests for different companies never see each other (async context isolation)', async () => {
    const db = ctx();
    const results = await Promise.all(
      Array.from({ length: 24 }, (_, i) => {
        const c = i % 2 === 0 ? 'c1' : 'c2';
        return runInTenantContext(c, async () => ({ c, ids: (await db.employee.findMany({ select: { id: true } })).map((e) => e.id) }));
      }),
    );
    for (const r of results) expect(r.ids).toEqual([`e-${r.c}`]);
  });

  it('a failed interactive transaction rolls back (behaviour of $transaction is preserved)', async () => {
    const db = ctx();
    await runInTenantContext('c1', async () => {
      await expect(
        db.$transaction(async (tx) => {
          await tx.auditLog.create({ data: { companyId: 'c1', action: 'ROLLME', entity: 't', entityId: 'z' } });
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
    });
    expect(await adminCount('audit_logs', `action = 'ROLLME'`)).toBe(0);
  });
});
