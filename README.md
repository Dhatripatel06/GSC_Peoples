# GSC Peoples

HR & People CRM module of the GrowSpark Consulting Business Platform.
This repository contains the **HR app only** (web + API + `hr_db`). Project and Sales apps live elsewhere.

> Status: project foundation. No HR business features are implemented yet.

## Stack

| Area     | Technology                                                               |
| -------- | ------------------------------------------------------------------------ |
| Web      | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Forms    | React Hook Form + Zod, Lucide icons                                      |
| API      | Node.js 22+, Express 5, TypeScript, Zod, pino                            |
| Database | PostgreSQL 16, Prisma 7 (`hr_db`)                                        |
| Jobs     | Redis 7, BullMQ                                                          |
| Tests    | Vitest, Supertest, Playwright                                            |
| Monorepo | pnpm workspaces                                                          |

## Layout

```
apps/web         Next.js frontend
apps/api         Express API (Prisma, BullMQ)
packages/shared  Shared TS utilities, common types, validation helpers
packages/contracts  API + domain-event contracts (Zod)
packages/config  Shared tsconfig + ESLint config
infrastructure/  Docker-related files (Postgres init scripts, etc.)
docs/            Architecture, API and development docs
```

## Prerequisites

- Node.js >= 22
- pnpm >= 10 (`npm i -g pnpm@10`)
- Docker (optional, for local PostgreSQL + Redis)

## Quick start

```bash
pnpm install
cp .env.example .env          # then fill in the blanks (see docs/development/environment.md)
pnpm infra:up                 # PostgreSQL + Redis via Docker (optional if you run your own)
pnpm db:generate              # generate Prisma client
pnpm db:migrate               # create/apply migrations in hr_db
pnpm dev                      # web on :3000, API on :4000
```

- Web: http://localhost:3000
- API health: http://localhost:4000/api/v1/health

## Commands

| Command                        | Purpose                                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| `pnpm dev`                     | Run web and API together                                               |
| `pnpm dev:web` / `dev:api`     | Run one app                                                            |
| `pnpm build`                   | Build everything                                                       |
| `pnpm lint` / `typecheck`      | ESLint / TypeScript across the workspace                               |
| `pnpm test`                    | Unit + API tests (Vitest, Supertest)                                   |
| `pnpm test:e2e`                | Playwright (run `pnpm --filter @gsc/web exec playwright install` once) |
| `pnpm db:generate`             | Generate Prisma client                                                 |
| `pnpm db:migrate`              | Create/apply dev migrations                                            |
| `pnpm db:seed`                 | Run seeds                                                              |
| `pnpm infra:up` / `infra:down` | Start/stop Docker Postgres + Redis                                     |
| `pnpm format`                  | Prettier                                                               |

## Without Redis or Docker

Leave `REDIS_URL` empty. The API still runs; background jobs and outbound domain events are
disabled (events are logged as dropped). `DATABASE_URL` is required to start the API.

## More

- [Architecture overview](docs/architecture/overview.md)
- [Environment variables](docs/development/environment.md)
