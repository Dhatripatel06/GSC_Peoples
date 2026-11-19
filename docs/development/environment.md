# Environment Variables

Single `.env` at the repository root (copy from `.env.example`; never commit it). The API,
Prisma config and Docker Compose all read it. Real environment variables take precedence.

| Variable                | Required | Default                        | Description                                                  |
| ----------------------- | -------- | ------------------------------ | ------------------------------------------------------------ |
| `POSTGRES_USER`         | Docker   | -                              | Local container DB user                                      |
| `POSTGRES_PASSWORD`     | Docker   | -                              | Local container DB password (choose your own)                |
| `POSTGRES_DB`           | no       | `hr_db`                        | Database name                                                |
| `POSTGRES_PORT`         | no       | `5432`                         | Host port                                                    |
| `REDIS_PORT`            | no       | `6379`                         | Host port                                                    |
| `NODE_ENV`              | no       | `development`                  | `development` / `test` / `production`                        |
| `API_PORT`              | no       | `4000`                         | API port                                                     |
| `LOG_LEVEL`             | no       | `info`                         | pino level                                                   |
| `CORS_ORIGINS`          | no       | `http://localhost:3000`        | Comma-separated allowed origins                              |
| `DATABASE_URL`          | **yes**  | -                              | Dedicated HR database (`hr_db`) only                         |
| `REDIS_URL`             | no       | -                              | Empty disables BullMQ / outbound events                      |
| `AUTH_MODE`             | no       | `development`                  | `development` or `sso`; development is refused in production |
| `CENTRAL_AUTH_BASE_URL` | later    | -                              | Pending platform contract                                    |
| `CENTRAL_AUTH_JWKS_URL` | later    | -                              | Pending platform contract                                    |
| `CENTRAL_AUTH_ISSUER`   | later    | -                              | Pending platform contract                                    |
| `CENTRAL_AUTH_AUDIENCE` | later    | -                              | Pending platform contract                                    |
| `DEV_AUTH_COMPANY_ID`   | no       | `dev-company`                  | Company used by the dev auth adapter                         |
| `NEXT_PUBLIC_API_URL`   | no       | `http://localhost:4000/api/v1` | API base URL for the browser                                 |

`DATABASE_URL` example shape: `postgresql://<user>:<password>@localhost:5432/hr_db?schema=public`
(use the same user/password as in `POSTGRES_*`).

For the web app, `NEXT_PUBLIC_*` values must be available to Next.js: either export them in your
shell or add `apps/web/.env.local` (git-ignored).

## Database workflow

```bash
pnpm infra:up         # or use your own PostgreSQL
pnpm db:generate
pnpm db:migrate       # first run creates the initial migration (Company table)
pnpm db:seed
```

## Troubleshooting

- `Invalid environment configuration` on API start: a required variable is missing (see list above).
- Health shows `database: down`: Postgres unreachable or `DATABASE_URL` wrong.
- Health shows `redis: not_configured`: expected when `REDIS_URL` is empty.
