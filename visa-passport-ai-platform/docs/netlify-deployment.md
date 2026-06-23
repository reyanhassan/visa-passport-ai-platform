# Netlify deployment

Netlify deploys the completed Next.js MVP from `apps/web`. The local PostgreSQL,
Redis, BullMQ worker, FastAPI OCR service, and Docker Compose setup remain available
for development, but only the web app runs on Netlify today.

## Required environment variables

Add these values in **Netlify > Site configuration > Environment variables**:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
JWT_SECRET=replace_with_strong_random_secret_at_least_32_chars
FIELD_ENCRYPTION_KEY=replace_with_strong_random_secret_at_least_32_chars
NEXT_PUBLIC_APP_URL=https://your-netlify-site.netlify.app

DEPLOYMENT_TARGET=netlify
EXTRACTION_MODE=mock
UPLOAD_PROVIDER=mock

NEXT_TELEMETRY_DISABLED=1
```

Use a hosted PostgreSQL database from a provider such as Neon, Supabase,
Railway, or another provider that supports secure PostgreSQL connections. Do
not point Netlify at the local Docker PostgreSQL service. Never commit real
database credentials or application secrets.

`EXTRACTION_MODE=mock` is an explicit production-capable MVP mode. It creates
the database job, writes encrypted deterministic passport fields, records the
audit event, and completes synchronously without Redis or BullMQ.

`UPLOAD_PROVIDER=mock` still validates the multipart file type and size, but it
does not write the passport file to Netlify's ephemeral filesystem. It returns
an opaque mock reference used only by mock extraction.

## Netlify project settings

The repository-level `netlify.toml` already defines these values:

- Base directory: `visa-passport-ai-platform`
- Build command: `corepack enable && corepack prepare pnpm@10.12.1 --activate && pnpm install --frozen-lockfile && pnpm db:generate && pnpm build:packages && pnpm --filter @visa-platform/web build`
- Publish directory: `apps/web/.next`
- Node.js: 22
- pnpm: 10.12.1
- Next.js runtime plugin: `@netlify/plugin-nextjs`

When importing the GitHub repository, Netlify should discover these settings.
If the UI asks for a base directory, use `visa-passport-ai-platform`.

## Deploy database migrations

Apply the checked-in Prisma migrations to the hosted database before the first
production smoke test and whenever a deployment includes new migrations:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require" pnpm db:deploy
```

On PowerShell, set the environment variable for the current terminal first:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
pnpm db:deploy
```

Run this from the `visa-passport-ai-platform` directory. The command uses
`prisma migrate deploy`; it never runs `prisma migrate dev`. A one-time Netlify
build command can run migrations, but a controlled migration step before the
application deploy is safer because build retries and previews should not own
production schema changes.

## Current deployment boundary

Netlify currently hosts only the Next.js web app and its server functions. The
worker, Redis, and FastAPI OCR service are intentionally not deployed there.
Real OCR can be connected later by deploying those services on a persistent
runtime such as Railway, Render, or Fly.io and switching the web app back to
`EXTRACTION_MODE=queue` with the required service URLs and credentials.
