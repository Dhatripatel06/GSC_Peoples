import type {
  ChangeEmployeeStatus,
  CreateEmployee,
  EmployeeListQuery,
  UpdateEmployee,
} from '@gsc/contracts';
import type { Prisma } from '../../database/generated/client';
import type { TenantDb } from '../../database/tenant';
import type { TenantContext } from '../../database/tenant/types';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import type {
  Actor,
  EmployeePage,
  EmployeeRepository,
  EmployeeRow,
  ReadScope,
} from './employees.types';

/** Runs a unit of work in a tenant-bound transaction. Production: `withTenant`. */
export type TenantRunner = <T>(ctx: TenantContext, fn: (db: TenantDb) => Promise<T>) => Promise<T>;

type Obj = Record<string, unknown>;

const SELECT = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  workEmail: true,
  jobTitle: true,
  employmentType: true,
  status: true,
  hireDate: true,
  terminationDate: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } },
} as const;

const ORDER = [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }] as const;
const MAX_CHAIN = 1000;

// ---------- cursor (opaque keyset position: lastName, firstName, id) ----------

export function encodeCursor(row: Pick<EmployeeRow, 'lastName' | 'firstName' | 'id'>): string {
  return Buffer.from(JSON.stringify([row.lastName, row.firstName, row.id])).toString('base64url');
}

export function decodeCursor(cursor: string): { lastName: string; firstName: string; id: string } {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.every((p) => typeof p === 'string')
    ) {
      return { lastName: parsed[0] as string, firstName: parsed[1] as string, id: parsed[2] as string };
    }
  } catch {
    /* fall through */
  }
  throw new ValidationError('Invalid cursor');
}

// ---------- helpers ----------

/**
 * Prisma's `contains` does not escape LIKE wildcards, so a literal "%" or "_" typed into the search
 * box would match everything. PostgreSQL's default LIKE escape character is the backslash.
 */
export const escapeLike = (term: string): string => term.replace(/[\\%_]/g, (ch) => `\\${ch}`);

const toDate = (v: string | null | undefined): Date | null | undefined =>
  v === undefined ? undefined : v === null ? null : new Date(`${v}T00:00:00.000Z`);
const isoDay = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

function scopeWhere(scope: ReadScope): Obj[] | 'none' {
  if (scope.kind === 'all') return [];
  if (!scope.employeeId) return 'none'; // no linked employee profile: nothing is in team/self scope
  const any: Obj[] = [];
  if (scope.team) any.push({ managerId: scope.employeeId }); // direct reports only
  if (scope.self) any.push({ id: scope.employeeId });
  return any.length > 0 ? [{ OR: any }] : 'none';
}

function isPrismaCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === code;
}

function rethrow(err: unknown): never {
  if (isPrismaCode(err, 'P2002')) {
    throw new ConflictError('An employee with this employee number or work email already exists');
  }
  if (isPrismaCode(err, 'P2025')) throw new NotFoundError('Employee not found');
  if (isPrismaCode(err, 'P2003')) throw new NotFoundError('Referenced department or manager not found');
  throw err;
}

type Change = { from: unknown; to: unknown };

async function writeAudit(
  db: TenantDb,
  actor: Actor,
  employeeId: string,
  action: 'CREATED' | 'UPDATED' | 'DEPARTMENT_CHANGED' | 'MANAGER_CHANGED' | 'STATUS_CHANGED',
  changes: Record<string, Change>,
): Promise<void> {
  // `companyId` is injected (and mismatches rejected) by the tenant layer; Prisma's types cannot know that.
  const data = {
    employeeId,
    actorUserId: actor.userId,
    action,
    changes: changes as Prisma.InputJsonObject,
  } as Prisma.EmployeeAuditLogUncheckedCreateInput;
  await db.employeeAuditLog.create({ data });
}

async function requireDepartment(db: TenantDb, id: string): Promise<void> {
  const found = await db.department.findFirst({ where: { id }, select: { id: true } });
  if (!found) throw new NotFoundError('Department not found');
}

/**
 * A manager must exist in the company (cross-company ids are 404) and still be employed:
 * a TERMINATED employee cannot be given reports. Existing reports of someone who is later
 * terminated are not touched here; that is a separate HR workflow.
 */
async function requireManager(db: TenantDb, id: string): Promise<void> {
  const found = await db.employee.findFirst({ where: { id }, select: { id: true, status: true } });
  if (!found) throw new NotFoundError('Manager not found');
  if (found.status === 'TERMINATED') {
    throw new ValidationError('A terminated employee cannot be assigned as a manager', [
      { path: ['managerId'], message: 'Choose an employee who is still employed' },
    ]);
  }
}

/** Walks up the reporting chain; the database trigger is the concurrency-safe backstop. */
async function assertNoCycle(db: TenantDb, employeeId: string, managerId: string): Promise<void> {
  let current: string | null = managerId;
  for (let i = 0; current && i < MAX_CHAIN; i++) {
    if (current === employeeId) {
      throw new ValidationError('An employee cannot report, directly or indirectly, to themselves');
    }
    const next: { managerId: string | null } | null = await db.employee.findFirst({
      where: { id: current },
      select: { managerId: true },
    });
    current = next?.managerId ?? null;
  }
}

async function assertUnique(
  db: TenantDb,
  field: 'employeeNumber' | 'workEmail',
  value: string,
  exceptId?: string,
): Promise<void> {
  const clash = await db.employee.findFirst({
    where: { [field]: value, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new ConflictError(
      field === 'employeeNumber'
        ? 'An employee with this employee number already exists'
        : 'An employee with this work email already exists',
      { field },
    );
  }
}

function assertDates(hireDate: Date | null, terminationDate: Date | null): void {
  if (hireDate && terminationDate && terminationDate < hireDate) {
    throw new ValidationError('Termination date cannot be before the hire date');
  }
}

// ---------- repository ----------

export function createEmployeeRepository(run: TenantRunner): EmployeeRepository {
  return {
    async list(ctx, scope, query: EmployeeListQuery): Promise<EmployeePage> {
      const and: Obj[] = [];
      const scoped = scopeWhere(scope);
      if (scoped === 'none') return { rows: [], nextCursor: null };
      and.push(...scoped);

      for (const token of (query.q ?? '').split(/\s+/).filter(Boolean)) {
        const c = { contains: escapeLike(token), mode: 'insensitive' } as const;
        and.push({
          OR: [{ firstName: c }, { lastName: c }, { employeeNumber: c }, { workEmail: c }],
        });
      }
      if (query.status?.length) and.push({ status: { in: query.status } });
      if (query.employmentType?.length) and.push({ employmentType: { in: query.employmentType } });
      if (query.departmentId) and.push({ departmentId: query.departmentId });
      if (query.managerId) and.push({ managerId: query.managerId });
      if (query.cursor) {
        const c = decodeCursor(query.cursor);
        and.push({
          OR: [
            { lastName: { gt: c.lastName } },
            { lastName: c.lastName, firstName: { gt: c.firstName } },
            { lastName: c.lastName, firstName: c.firstName, id: { gt: c.id } },
          ],
        });
      }

      return run(ctx, async (db) => {
        const found = (await db.employee.findMany({
          where: { AND: and },
          orderBy: [...ORDER],
          take: query.limit + 1,
          select: SELECT,
        })) as EmployeeRow[];
        const rows = found.slice(0, query.limit);
        const last = rows[rows.length - 1];
        return {
          rows,
          nextCursor: found.length > query.limit && last ? encodeCursor(last) : null,
        };
      });
    },

    async get(ctx, scope, id) {
      const scoped = scopeWhere(scope);
      if (scoped === 'none') return null;
      return run(ctx, async (db) => {
        const row = await db.employee.findFirst({
          where: { AND: [{ id }, ...scoped] },
          select: SELECT,
        });
        return (row as EmployeeRow | null) ?? null;
      });
    },

    async create(ctx, actor, input: CreateEmployee) {
      try {
        return await run(ctx, async (db) => {
          await assertUnique(db, 'employeeNumber', input.employeeNumber);
          if (input.workEmail) await assertUnique(db, 'workEmail', input.workEmail);
          if (input.departmentId) await requireDepartment(db, input.departmentId);
          if (input.managerId) await requireManager(db, input.managerId);

          // `companyId` is injected by the tenant layer; Prisma's types cannot know that.
          const data = {
            employeeNumber: input.employeeNumber,
            firstName: input.firstName,
            lastName: input.lastName,
            workEmail: input.workEmail ?? null,
            jobTitle: input.jobTitle ?? null,
            employmentType: input.employmentType,
            hireDate: toDate(input.hireDate) ?? null,
            departmentId: input.departmentId ?? null,
            managerId: input.managerId ?? null,
          } as Prisma.EmployeeUncheckedCreateInput;
          const row = (await db.employee.create({ data, select: SELECT })) as EmployeeRow;

          await writeAudit(db, actor, row.id, 'CREATED', {
            employeeNumber: { from: null, to: row.employeeNumber },
            firstName: { from: null, to: row.firstName },
            lastName: { from: null, to: row.lastName },
            workEmail: { from: null, to: row.workEmail },
            jobTitle: { from: null, to: row.jobTitle },
            employmentType: { from: null, to: row.employmentType },
            status: { from: null, to: row.status },
            hireDate: { from: null, to: isoDay(row.hireDate) },
            departmentId: { from: null, to: row.department?.id ?? null },
            managerId: { from: null, to: row.manager?.id ?? null },
          });
          return row;
        });
      } catch (err) {
        return rethrow(err);
      }
    },

    async update(ctx, actor, id, patch: UpdateEmployee) {
      try {
        return await run(ctx, async (db) => {
          const before = (await db.employee.findFirst({
            where: { id },
            select: { ...SELECT, departmentId: true, managerId: true },
          })) as unknown as (EmployeeRow & { departmentId: string | null; managerId: string | null }) | null;
          if (!before) throw new NotFoundError('Employee not found');

          // Build the minimal change set (only fields that actually differ).
          const data: Obj = {};
          const diff: Record<string, Change> = {};
          const set = (field: string, from: unknown, to: unknown, dbValue: unknown = to) => {
            if (from === to) return;
            data[field] = dbValue;
            diff[field] = { from, to };
          };

          if (patch.employeeNumber !== undefined) set('employeeNumber', before.employeeNumber, patch.employeeNumber);
          if (patch.firstName !== undefined) set('firstName', before.firstName, patch.firstName);
          if (patch.lastName !== undefined) set('lastName', before.lastName, patch.lastName);
          if (patch.workEmail !== undefined) set('workEmail', before.workEmail, patch.workEmail);
          if (patch.jobTitle !== undefined) set('jobTitle', before.jobTitle, patch.jobTitle);
          if (patch.employmentType !== undefined) set('employmentType', before.employmentType, patch.employmentType);
          if (patch.hireDate !== undefined) set('hireDate', isoDay(before.hireDate), patch.hireDate, toDate(patch.hireDate));
          if (patch.departmentId !== undefined) set('departmentId', before.departmentId, patch.departmentId);
          if (patch.managerId !== undefined) set('managerId', before.managerId, patch.managerId);

          if (Object.keys(diff).length === 0) return before as EmployeeRow; // nothing changed: no write, no audit

          if (diff.employeeNumber) await assertUnique(db, 'employeeNumber', patch.employeeNumber as string, id);
          if (diff.workEmail && patch.workEmail) await assertUnique(db, 'workEmail', patch.workEmail, id);
          if (diff.departmentId && patch.departmentId) await requireDepartment(db, patch.departmentId);
          if (diff.managerId && patch.managerId) {
            await requireManager(db, patch.managerId);
            await assertNoCycle(db, id, patch.managerId);
          }
          if (diff.hireDate) {
            assertDates((data.hireDate as Date | null) ?? null, before.terminationDate);
          }

          const row = (await db.employee.update({ where: { id }, data, select: SELECT })) as EmployeeRow;

          const { departmentId, managerId, ...rest } = diff;
          if (departmentId) await writeAudit(db, actor, id, 'DEPARTMENT_CHANGED', { departmentId });
          if (managerId) await writeAudit(db, actor, id, 'MANAGER_CHANGED', { managerId });
          if (Object.keys(rest).length > 0) await writeAudit(db, actor, id, 'UPDATED', rest);
          return row;
        });
      } catch (err) {
        return rethrow(err);
      }
    },

    async changeStatus(ctx, actor, id, change: ChangeEmployeeStatus) {
      try {
        return await run(ctx, async (db) => {
          const before = (await db.employee.findFirst({ where: { id }, select: SELECT })) as EmployeeRow | null;
          if (!before) throw new NotFoundError('Employee not found');

          const terminationDate = change.status === 'TERMINATED' ? toDate(change.terminationDate)! : null;
          const sameDate = isoDay(before.terminationDate) === isoDay(terminationDate);
          if (before.status === change.status && sameDate) return before; // no-op: no write, no audit

          assertDates(before.hireDate, terminationDate);
          const row = (await db.employee.update({
            where: { id },
            data: { status: change.status, terminationDate },
            select: SELECT,
          })) as EmployeeRow;

          await writeAudit(db, actor, id, 'STATUS_CHANGED', {
            status: { from: before.status, to: row.status },
            terminationDate: { from: isoDay(before.terminationDate), to: isoDay(row.terminationDate) },
          });
          return row;
        });
      } catch (err) {
        return rethrow(err);
      }
    },
  };
}
