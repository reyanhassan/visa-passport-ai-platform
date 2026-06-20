# Passport extraction worker

The worker consumes `passport-extraction` jobs from Redis, calls the private FastAPI OCR service, and stores encrypted extraction results in PostgreSQL through Prisma.

## Processing lifecycle

1. Receive a queue payload containing the database job UUID.
2. Fetch `PassportExtractionJob` from PostgreSQL.
3. Set its status to `PROCESSING`.
4. Call `POST {OCR_SERVICE_URL}/ocr/passport`.
5. On success, transactionally:
   - upsert `PassportExtractedData`;
   - set the job to `COMPLETED` and save confidence;
   - append `PASSPORT_OCR_COMPLETED` to `AuditLog`.
6. On failure, transactionally set the job to `FAILED`, save a sanitized error message, and append `PASSPORT_OCR_FAILED`.

Completed jobs are idempotent: a redelivered queue message returns `ALREADY_COMPLETED` without repeating OCR or database writes.

## Structure

```text
src/
├── index.ts
├── config.ts
├── queues/
│   └── passportExtractionQueue.ts
├── processors/
│   └── passportExtractionProcessor.ts
└── services/
    ├── ocrClient.ts
    ├── encryption.ts
    ├── auditLog.ts
    └── piiMasking.ts
```

## Environment

Required:

```env
DATABASE_URL=postgresql://visa_user:visa_password@localhost:5432/visa_platform
REDIS_URL=redis://localhost:6379
OCR_SERVICE_URL=http://localhost:8001
FIELD_ENCRYPTION_KEY=change_this_32_byte_key
```

Optional:

```env
PASSPORT_EXTRACTION_QUEUE=passport-extraction
WORKER_CONCURRENCY=5
OCR_REQUEST_TIMEOUT_MS=30000
INTERNAL_API_KEY=local-internal-api-key-change-me
```

## Run locally

From the monorepo root:

```bash
pnpm install
pnpm --filter @visa-platform/database build
pnpm --filter @visa-platform/types build
pnpm --filter @visa-platform/worker dev
```

Or start the complete Docker stack:

```bash
docker compose -f infra/docker-compose.yml up --build
```

## PII and encryption rules

- Never log passport numbers, names, MRZ text, OCR response bodies, or image URLs.
- Worker logs contain database job IDs and sanitized operational errors only.
- Audit metadata contains confidence, MRZ validity, warning counts, and attempt numbers—not extracted identity fields.
- `encryptField` and `decryptField` currently use a local AES-256-GCM key derived from `FIELD_ENCRYPTION_KEY`. Replace this with managed KMS envelope encryption and key rotation before production.
- Do not log decryption failures or ciphertext payloads.

## Verification

```bash
pnpm --filter @visa-platform/worker typecheck
pnpm --filter @visa-platform/worker build
```
