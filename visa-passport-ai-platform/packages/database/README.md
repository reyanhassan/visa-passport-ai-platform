# Database package

`@visa-platform/database` owns the PostgreSQL schema and exports the shared Prisma client used by trusted Node.js services.

## Models

- `User` and `Agency` model individual, agency, and platform-admin access.
- `PassportExtractionJob` tracks asynchronous OCR work without placing document bytes in PostgreSQL.
- `PassportExtractedData` stores the one-to-one structured extraction result. Sensitive identity fields are explicitly named as encrypted values.
- `VisaApplication` stores workflow state and flexible, versioned form data.
- `CountryRule` stores active country rule documents.
- `AuditLog` records append-only security and business events.

## Local setup

Copy the repository environment template and start PostgreSQL from the repository root:

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d postgres
pnpm db:generate
```

Create and apply a development migration after changing `prisma/schema.prisma`:

```bash
pnpm db:migrate -- --name add_platform_schema
```

From this package directly, the equivalent command is:

```bash
pnpm prisma migrate dev --name add_platform_schema
```

Deploy already-reviewed migrations in production with:

```bash
pnpm --filter @visa-platform/database db:deploy
```

Never use `prisma migrate dev` or `prisma db push` against a production database.

## Client usage

```ts
import { prisma } from "@visa-platform/database";

const application = await prisma.visaApplication.findUnique({
  where: { id: applicationId },
});
```

The exported client is a process-level singleton in development, preventing hot reload from creating excess database connections.

## Data conventions

- `country`, `countryCode`, and `destinationCountry` store uppercase ISO 3166-1 alpha-2 codes. `countryHint` permits two- or three-character OCR hints.
- `confidence` is a decimal value from `0.0000` to `1.0000`; enforce this range in the service layer.
- Date-only passport values use PostgreSQL `date`; event timestamps use timezone-aware timestamps and should be written in UTC.
- Raw passport images belong in private object storage. Store only opaque object keys in `imageObjectKey`.
- Values ending in `Encrypted` must be encrypted before reaching Prisma. Do not log plaintext or encryption keys.
- Audit records should be treated as append-only. Corrections belong in a new event, not an update to an existing row.

## Ownership and deletion

Deleting a user or agency preserves operational and audit records by setting their nullable foreign keys to `NULL`. Deleting an extraction job cascades to its one-to-one extracted data record. Production deletion workflows should first satisfy retention, legal-hold, and audit requirements.
