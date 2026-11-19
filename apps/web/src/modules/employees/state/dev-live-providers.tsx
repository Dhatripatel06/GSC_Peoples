'use client';

import { DEV_PERSONA_KEYS, DEV_PERSONAS, type DevPersonaKey } from '@gsc/contracts';
import { ServerCog } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { SelectField } from '@/components/ui/select';
import { publicEnv } from '@/config/env';
import { createHttpEmployeesService } from '../adapters/http-service';
import { fetchSession } from '../adapters/me-client';
import { describeError, isApiError } from '../errors';
import type { Session } from '../permissions';
import { EmployeesContextProvider } from './employees-context';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: string }
  | { status: 'ready'; session: Session; token: string };

function describeSessionError(status: number, message: string): string {
  if (status === 401) return `Session rejected (401): ${message}`;
  if (status === 403) return `No access for this user in this company (403): ${message}`;
  if (status === 0) return 'The API is not reachable. Start it with pnpm dev:api.';
  return message;
}

/**
 * LOCAL DEVELOPMENT ONLY (rendered only when `devAuthClientAvailable`). Gets a token for one of three
 * fixed personas from the dev-session route, then resolves the real session from `GET /api/v1/me`.
 * Data comes from the real API and database; on any failure it shows an error and NEVER demo data.
 */
export function DevLiveEmployeesProviders({ children }: { children: React.ReactNode }) {
  const [persona, setPersona] = useState<DevPersonaKey>('hr');
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let res: Response;
        try {
          res = await fetch('/api/dev-session', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ persona }),
            cache: 'no-store',
          });
        } catch {
          throw new Error('Could not reach the development session endpoint');
        }
        if (!res.ok) throw new Error(`Development sign-in is not available (${res.status})`);
        const { token } = (await res.json()) as { token: string };
        const session = await fetchSession({
          baseUrl: publicEnv.apiUrl,
          token,
          displayName: `${DEV_PERSONAS[persona].label} (development user)`,
        });
        if (!cancelled) setState({ status: 'ready', session, token });
      } catch (e) {
        if (!cancelled)
          setState({
            status: 'error',
            message: isApiError(e)
              ? describeSessionError(e.status, describeError(e))
              : (e as Error).message,
            code: isApiError(e) ? `${e.status}` : 'ERR',
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persona]);

  const ready = state.status === 'ready' ? state : null;
  const service = useMemo(
    () =>
      ready
        ? createHttpEmployeesService({ baseUrl: publicEnv.apiUrl, getToken: () => ready.token })
        : null,
    [ready],
  );

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3">
        <Alert variant="info" title="Development session.">
          <span className="inline-flex items-center gap-1.5">
            <ServerCog className="size-4" strokeWidth={1.75} aria-hidden />
            Local API and local PostgreSQL. Not Central Authentication; available only in local
            development.
          </span>
        </Alert>
        <SelectField
          label="Dev: sign in as"
          containerClassName="max-w-md"
          value={persona}
          onChange={(e) => {
            setState({ status: 'loading' });
            setPersona(e.target.value as DevPersonaKey);
          }}
          helper={ready ? `${ready.session.roleKey} (from /me)` : 'Resolving session…'}
        >
          {DEV_PERSONA_KEYS.map((key) => (
            <option key={key} value={key}>
              {DEV_PERSONAS[key].label}
            </option>
          ))}
        </SelectField>
      </div>
      {state.status === 'loading' && (
        <p role="status" className="text-sm" data-testid="session-loading">
          Signing in…
        </p>
      )}
      {state.status === 'error' && (
        <Alert variant="danger" title="Could not start a session.">
          <span data-testid="session-error" data-code={state.code}>
            {state.message}
          </span>
        </Alert>
      )}
      {ready && service && (
        <EmployeesContextProvider service={service} session={ready.session}>
          {/* Remount on identity change so every list/profile reloads under the new permissions. */}
          <div key={persona}>{children}</div>
        </EmployeesContextProvider>
      )}
    </div>
  );
}
