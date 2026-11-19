import { DEV_PERSONAS, DEV_PERSONA_KEYS, type DevPersonaKey } from '@gsc/contracts';
import { devAuthServerEnabled } from '@/lib/dev-auth/config';

/**
 * LOCAL DEVELOPMENT ONLY token issuer. Returns 404 unless NODE_ENV=development and DEV_AUTH_ENABLED=true.
 * The browser may only name one of three fixed persona keys; the subject comes from the server-side
 * map. It never accepts a user id, role, company or permission, and issues no authority of its own:
 * the API still verifies the token and resolves the membership and permissions from the database.
 */
const notFound = () =>
  Response.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 });
const enabled = () =>
  devAuthServerEnabled({
    NODE_ENV: process.env.NODE_ENV,
    DEV_AUTH_ENABLED: process.env.DEV_AUTH_ENABLED,
  });

export function GET() {
  if (!enabled()) return notFound();
  return Response.json({
    personas: DEV_PERSONA_KEYS.map((key) => ({ key, label: DEV_PERSONAS[key].label })),
  });
}

export async function POST(req: Request) {
  if (!enabled()) return notFound();
  const body: unknown = await req.json().catch(() => undefined);
  const persona =
    typeof body === 'object' && body !== null ? (body as { persona?: unknown }).persona : undefined;
  if (typeof persona !== 'string' || !DEV_PERSONA_KEYS.includes(persona as DevPersonaKey)) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Unknown development persona' } },
      { status: 400 },
    );
  }
  const { externalId } = DEV_PERSONAS[persona as DevPersonaKey];
  return Response.json(
    { persona, token: `dev:${externalId}` },
    { headers: { 'cache-control': 'no-store' } },
  );
}
