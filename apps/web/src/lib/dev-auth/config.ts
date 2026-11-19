/**
 * LOCAL DEVELOPMENT ONLY gates. Pure functions so production behaviour can be unit tested.
 * There is no production path: both gates require NODE_ENV=development.
 */

/** Server gate for the dev-session route: needs NODE_ENV=development AND server-only DEV_AUTH_ENABLED=true. */
export function devAuthServerEnabled(env: {
  NODE_ENV?: string;
  DEV_AUTH_ENABLED?: string;
}): boolean {
  return env.NODE_ENV === 'development' && env.DEV_AUTH_ENABLED === 'true';
}

/** Client gate: show the development session provider (needs NODE_ENV=development and an explicit public flag). */
export function devAuthClientAvailable(env: {
  NODE_ENV?: string;
  NEXT_PUBLIC_DEV_AUTH?: string;
}): boolean {
  return env.NODE_ENV === 'development' && env.NEXT_PUBLIC_DEV_AUTH === 'true';
}

export type EmployeesAdapterKind = 'demo' | 'http';

/**
 * Which backend the Employee Directory uses. Production is ALWAYS `http` (never demo, whatever the
 * variable says). Outside production the default is `demo`, and `http` must be chosen explicitly.
 */
export function resolveEmployeesAdapter(env: {
  NODE_ENV?: string;
  NEXT_PUBLIC_EMPLOYEES_ADAPTER?: string;
}): EmployeesAdapterKind {
  if (env.NODE_ENV === 'production') return 'http';
  return env.NEXT_PUBLIC_EMPLOYEES_ADAPTER === 'http' ? 'http' : 'demo';
}
