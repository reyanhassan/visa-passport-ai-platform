# Visa Passport AI Platform

A production-oriented monorepo for an AI-powered visa and passport processing marketplace. It includes working account sessions, protected customer routes, local passport uploads, queued mock OCR extraction, encrypted passport fields, recent extraction history, and draft visa applications.

## Tech stack

- **Web:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui-ready component conventions
- **Data:** PostgreSQL and Prisma
- **Jobs:** Redis and BullMQ with a Node.js TypeScript worker
- **OCR:** Python 3.12 and FastAPI
- **Workspace:** pnpm workspaces
- **Local infrastructure:** Docker Compose

No Rust is used.

## Repository structure

```text
visa-passport-ai-platform/
├── apps/
│   ├── web/                  # Next.js customer and operator experience
│   ├── ocr-service/          # Private FastAPI OCR/extraction boundary
│   └── worker/               # BullMQ background worker
├── packages/
│   ├── database/             # Prisma schema and shared DB client
│   ├── types/                # Shared TypeScript contracts
│   ├── config/               # Validated environment helpers
│   └── ui/                   # Shared React primitives
├── shared/
│   ├── country-rules/        # Versioned visa rule JSON and schema
│   └── api-contracts/        # Language-neutral OpenAPI contracts
├── infra/
│   └── docker-compose.yml    # Full local application stack
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── security.md
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

## Prerequisites

- Node.js 22 or newer
- pnpm 10 or newer (`corepack enable` is the simplest setup)
- Python 3.12 or newer
- Docker Desktop or a compatible Docker Engine with Compose

## Install

From this directory:

```bash
cp .env.example .env
pnpm install

python -m venv .venv
```

Activate the Python environment, then install the OCR service:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -e "./apps/ocr-service[dev]"
```

The checked-in environment file is only a template. Replace `INTERNAL_API_KEY` and the database password before any shared or deployed environment.

## Run locally

### Full Docker stack

From the monorepo root, install workspace dependencies and build the complete local stack:

```bash
pnpm install
docker compose -f infra/docker-compose.yml up --build
```

This starts PostgreSQL, Redis, FastAPI OCR, the BullMQ worker, and Next.js. Container startup is health-gated so the web and worker services wait for PostgreSQL, Redis, and OCR to become healthy.

Verify the public services from another terminal:

```bash
curl http://localhost:3000
curl http://localhost:8001/health
```

Local endpoints:

- Web app: `http://localhost:3000`
- Web health: `http://localhost:3000/api/health`
- OCR API: `http://localhost:8001`
- OCR health: `http://localhost:8001/health`
- FastAPI docs in development: `http://localhost:8001/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Stop the stack while preserving database and Redis volumes:

```bash
docker compose -f infra/docker-compose.yml down
```

Use `docker compose -f infra/docker-compose.yml down -v` only when you intentionally want to delete local PostgreSQL and Redis data.

### Native application development

To run application processes outside Docker, start only the infrastructure services:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
```

Generate the Prisma client and apply the checked-in migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

Start the web app, worker, and OCR service together:

```bash
pnpm dev
```

Run an individual service with `pnpm dev:web`, `pnpm dev:worker`, or `pnpm dev:ocr`. Run `pnpm build:packages` first when launching the web or worker directly after a clean install.

## How services communicate

1. The browser talks only to the Next.js web app.
2. Next.js stores durable state in PostgreSQL through `@visa-platform/database`.
3. Next.js places lightweight extraction jobs on Redis; raw documents should live in private object storage, not queue payloads.
4. The BullMQ worker consumes jobs, calls the private FastAPI OCR service over authenticated HTTP, encrypts extracted PII, and persists the result.
5. FastAPI owns OCR and passport-field extraction only. The worker owns orchestration, retries, and persistence.

The OCR response is deterministic mock data until a production OCR provider is configured. Authentication, uploads, queue orchestration, polling, encryption, recent history, and draft applications are functional.

## Functional MVP flow

1. Create an individual account at `http://localhost:3000/register`.
2. Sign in at `/login`; the HTTP-only session cookie protects dashboard APIs and pages.
3. Upload a JPG, PNG, WebP, or PDF up to 15 MB at `/dashboard/passports`, or use an HTTPS image URL.
4. The UI polls the BullMQ job until mock OCR completes, then shows editable extracted fields.
5. Create and view draft visa applications at `/dashboard/applications`.

Local uploads are stored in `apps/web/public/uploads/passports` and are suitable only for development. Replace this adapter with private object storage and signed URLs before production.

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run all application processes in development |
| `pnpm build` | Build all TypeScript workspace projects |
| `pnpm lint` | Lint workspace projects that define linting |
| `pnpm typecheck` | Type-check all TypeScript projects |
| `pnpm test` | Run workspace tests and FastAPI tests |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Apply migrations and create a new development migration when the schema changes |
| `pnpm infra:up` | Build and start the full Docker stack in the background |
| `pnpm infra:down` | Stop the Docker stack while preserving data volumes |

## Design and extension points

- Add shadcn/ui components from `apps/web`; shared primitives live in `packages/ui`.
- Add OCR engines behind adapters in `apps/ocr-service`, never inside the web app or worker.
- Add country rules as reviewed JSON matching `shared/country-rules/schema.json`.
- Keep public API changes synchronized with `shared/api-contracts/openapi.yaml`.
- Review [`docs/architecture.md`](docs/architecture.md) and [`docs/security.md`](docs/security.md) before adding document storage or real customer data.
