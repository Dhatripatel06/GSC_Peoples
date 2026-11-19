/**
 * LOCAL DEVELOPMENT ONLY. The fixed identities created by `pnpm db:provision:local`.
 * The browser may only name one of these keys; the mapping to a Central Authentication subject
 * lives on the server side (web dev-session route, API dev provider allow-list). Roles and
 * permissions are never part of this: they always come from the database membership via `/me`.
 */
export const DEV_PERSONAS = {
  hr: { externalId: 'dev-hr-admin', label: 'HR Admin' },
  manager: { externalId: 'dev-manager', label: 'Manager' },
  employee: { externalId: 'dev-employee', label: 'Employee' },
} as const;

export type DevPersonaKey = keyof typeof DEV_PERSONAS;
export const DEV_PERSONA_KEYS = Object.keys(DEV_PERSONAS) as DevPersonaKey[];
export const DEV_EXTERNAL_IDS: readonly string[] = DEV_PERSONA_KEYS.map(
  (k) => DEV_PERSONAS[k].externalId,
);
