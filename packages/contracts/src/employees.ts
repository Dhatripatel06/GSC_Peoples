import { z } from 'zod';

/**
 * Employee Directory contracts. Fields are limited to what exists on the `Employee` model.
 * Request bodies are `.strict()`: unknown keys (companyId, salary, phone, ...) are rejected, never
 * silently dropped. `companyId` never appears in a request or response; the tenant comes from the
 * authenticated membership only.
 */

export const employmentTypeSchema = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const employmentStatusSchema = z.enum(['ONBOARDING', 'ACTIVE', 'ON_LEAVE', 'TERMINATED']);
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;

const isoDate = z.iso.date(); // YYYY-MM-DD

/** Entered manually by HR. Stored upper-case so uniqueness is case-insensitive. */
export const employeeNumberSchema = z
  .string()
  .trim()
  .min(1, 'Enter an employee number')
  .max(32, 'Use 32 characters or fewer')
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, 'Use letters, numbers and . _ / - only')
  .transform((v) => v.toUpperCase());

const nameSchema = z.string().trim().min(1, 'Required').max(100, 'Use 100 characters or fewer');
const workEmailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address'));
const jobTitleSchema = z.string().trim().min(1).max(100);

// ---------- responses ----------

export const employeeDepartmentRefSchema = z.object({ id: z.uuid(), name: z.string() });
export const employeeManagerRefSchema = z.object({
  id: z.uuid(),
  employeeNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

export const employeeSchema = z.object({
  id: z.uuid(),
  employeeNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  workEmail: z.string().nullable(),
  jobTitle: z.string().nullable(),
  employmentType: employmentTypeSchema,
  status: employmentStatusSchema,
  hireDate: isoDate.nullable(),
  terminationDate: isoDate.nullable(),
  department: employeeDepartmentRefSchema.nullable(),
  manager: employeeManagerRefSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Employee = z.infer<typeof employeeSchema>;

export const employeeResponseSchema = z.object({ data: employeeSchema });
export type EmployeeResponse = z.infer<typeof employeeResponseSchema>;

export const employeeListResponseSchema = z.object({
  data: z.array(employeeSchema),
  page: z.object({
    limit: z.number().int(),
    /** Opaque. Pass back as `cursor` to fetch the next page; null on the last page. */
    nextCursor: z.string().nullable(),
  }),
});
export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;

// ---------- list query (cursor pagination, fixed order: lastName, firstName, id) ----------

const csvOf = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v),
    z.array(item).max(10),
  );

export const employeeListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().min(1).max(512).optional(),
    /** Matches first name, last name, employee number or work email (each word must match). */
    q: z.string().trim().max(100).optional(),
    status: csvOf(employmentStatusSchema).optional(),
    employmentType: csvOf(employmentTypeSchema).optional(),
    departmentId: z.uuid().optional(),
    managerId: z.uuid().optional(),
  })
  .strict();
export type EmployeeListQuery = z.output<typeof employeeListQuerySchema>;
export type EmployeeListQueryInput = z.input<typeof employeeListQuerySchema>;

// ---------- writes ----------

export const createEmployeeSchema = z
  .object({
    employeeNumber: employeeNumberSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    workEmail: workEmailSchema.nullish(),
    jobTitle: jobTitleSchema.nullish(),
    employmentType: employmentTypeSchema.default('FULL_TIME'),
    hireDate: isoDate.nullish(),
    departmentId: z.uuid().nullish(),
    managerId: z.uuid().nullish(),
  })
  .strict();
export type CreateEmployeeInput = z.input<typeof createEmployeeSchema>;
export type CreateEmployee = z.output<typeof createEmployeeSchema>;

/** Status is changed only through the status endpoint. Department/manager assignment is a PATCH. */
export const updateEmployeeSchema = z
  .object({
    employeeNumber: employeeNumberSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    workEmail: workEmailSchema.nullable(),
    jobTitle: jobTitleSchema.nullable(),
    employmentType: employmentTypeSchema,
    hireDate: isoDate.nullable(),
    departmentId: z.uuid().nullable(),
    managerId: z.uuid().nullable(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to change' });
export type UpdateEmployeeInput = z.input<typeof updateEmployeeSchema>;
export type UpdateEmployee = z.output<typeof updateEmployeeSchema>;

export const changeEmployeeStatusSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('TERMINATED'),
      terminationDate: isoDate,
    })
    .strict(),
  z.object({ status: z.enum(['ONBOARDING', 'ACTIVE', 'ON_LEAVE']) }).strict(),
]);
export type ChangeEmployeeStatusInput = z.input<typeof changeEmployeeStatusSchema>;
export type ChangeEmployeeStatus = z.output<typeof changeEmployeeStatusSchema>;

export const employeeIdParamSchema = z.object({ id: z.uuid() });

// ---------- departments (read-only, for filters and assignment dropdowns) ----------

export const departmentOptionSchema = z.object({ id: z.uuid(), name: z.string() });
export const departmentListResponseSchema = z.object({ data: z.array(departmentOptionSchema) });
export type DepartmentListResponse = z.infer<typeof departmentListResponseSchema>;
