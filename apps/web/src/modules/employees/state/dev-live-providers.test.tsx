// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEmployeesContext } from './employees-context';
import { DevLiveEmployeesProviders } from './dev-live-providers';

/** MOCKED API (fake fetch): proves the session/error logic only, not the real API. */
const ME: Record<string, { roles: string[]; permissions: string[] }> = {
  'dev:dev-hr-admin': { roles: ['HR_ADMIN'], permissions: ['employee:read:all', 'employee:write'] },
  'dev:dev-employee': { roles: ['EMPLOYEE'], permissions: ['employee:read:self'] },
};

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn((url: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(url), init)),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

function standardHandler(url: string, init?: RequestInit) {
  if (url.endsWith('/api/dev-session')) {
    const persona = (JSON.parse(String(init?.body)) as { persona: string }).persona;
    const token = { hr: 'dev:dev-hr-admin', manager: 'dev:dev-manager', employee: 'dev:dev-employee' }[persona];
    return json(200, { persona, token });
  }
  const auth = ((init?.headers as Record<string, string>).Authorization ?? '').replace('Bearer ', '');
  const me = ME[auth];
  if (!me) return json(403, { error: { code: 'FORBIDDEN', message: 'No active membership' } });
  return json(200, { data: { userId: 'u', employeeId: 'e', companyId: 'c', ...me } });
}

function Probe() {
  const { session, caps, isDemo, service } = useEmployeesContext();
  return (
    <p data-testid="probe">
      {session.roleKey}|{caps.canCreate ? 'create' : 'nocreate'}|{isDemo ? 'demo' : 'real'}|{service.kind}
    </p>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('DevLiveEmployeesProviders', () => {
  it('takes the role and permissions from /me, not from the frontend', async () => {
    mockFetch(standardHandler);
    render(<DevLiveEmployeesProviders><Probe /></DevLiveEmployeesProviders>);
    expect(await screen.findByTestId('probe')).toHaveTextContent('HR_ADMIN|create|real|http');
  });

  it('switching identity re-resolves /me and changes capabilities', async () => {
    const fn = mockFetch(standardHandler);
    render(<DevLiveEmployeesProviders><Probe /></DevLiveEmployeesProviders>);
    await screen.findByTestId('probe');
    await userEvent.selectOptions(screen.getByLabelText('Dev: sign in as'), 'employee');
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('EMPLOYEE|nocreate|real|http'));
    const meCalls = fn.mock.calls.filter(([u]) => String(u).endsWith('/me'));
    expect(meCalls).toHaveLength(2);
  });

  it('shows an error (never demo data) when the API is unreachable', async () => {
    mockFetch((url) => {
      if (url.endsWith('/api/dev-session')) return json(200, { token: 'dev:dev-hr-admin' });
      throw new TypeError('fetch failed');
    });
    render(<DevLiveEmployeesProviders><Probe /></DevLiveEmployeesProviders>);
    expect(await screen.findByTestId('session-error')).toHaveTextContent('not reachable');
    expect(screen.queryByTestId('probe')).toBeNull();
    expect(screen.queryByText(/demo mode/i)).toBeNull();
  });

  it.each([
    [401, 'rejected'],
    [403, 'No access'],
  ])('handles %i from /me with an error state', async (status, text) => {
    mockFetch((url) =>
      url.endsWith('/api/dev-session')
        ? json(200, { token: 'dev:dev-hr-admin' })
        : json(status, { error: { code: 'X', message: 'nope' } }),
    );
    render(<DevLiveEmployeesProviders><Probe /></DevLiveEmployeesProviders>);
    expect(await screen.findByTestId('session-error')).toHaveTextContent(text);
    expect(screen.queryByTestId('probe')).toBeNull();
  });

  it('shows an error when the dev session endpoint is unavailable (e.g. 404 in production)', async () => {
    mockFetch(() => json(404, { error: { code: 'NOT_FOUND', message: 'Not found' } }));
    render(<DevLiveEmployeesProviders><Probe /></DevLiveEmployeesProviders>);
    expect(await screen.findByTestId('session-error')).toHaveTextContent('not available (404)');
  });
});
