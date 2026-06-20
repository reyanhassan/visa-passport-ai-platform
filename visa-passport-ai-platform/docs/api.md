# API foundation

The Next.js app owns the public API surface. The FastAPI service is an internal service and must not be internet-accessible in production.

## Current endpoints

| Service | Method | Path | Purpose |
| --- | --- | --- | --- |
| Web | `GET` | `/api/health` | Web process health check |
| Web | `POST` | `/api/passports/extract` | Create and enqueue a passport extraction job |
| Web | `GET` | `/api/passports/jobs/{jobId}` | Read extraction status and available results |
| OCR | `GET` | `/health` | OCR process health check |
| OCR | `POST` | `/ocr/passport` | Return a mock passport OCR and MRZ result |

The passport extraction API validates JSON with Zod, creates a PostgreSQL record, and publishes an idempotent BullMQ job using the database UUID as the queue job ID. Authentication is intentionally deferred.

```bash
curl -X POST http://localhost:3000/api/passports/extract \
  -H "Content-Type: application/json" \
  -d '{"documentType":"passport","countryHint":"PK","imageUrl":"https://example.com/passport.jpg"}'

curl http://localhost:3000/api/passports/jobs/00000000-0000-4000-8000-000000000000
```

Errors use a stable envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body"
  }
}
```

The OCR endpoint accepts a JSON document reference. The mock implementation validates but does not download `image_url`, and no real OCR provider is enabled yet.

```bash
curl -X POST http://localhost:8001/ocr/passport \
  -H "Content-Type: application/json" \
  -d '{"document_type":"passport","country_hint":"PK","image_url":"https://example.com/passport.jpg","job_id":"optional-job-id"}'
```

The source-of-truth machine-readable contract is [`shared/api-contracts/openapi.yaml`](../shared/api-contracts/openapi.yaml). Update that file and the FastAPI response models together.

## Contract rules

- Use versioned paths for future public business APIs; keep internal contracts explicit and documented.
- Return opaque IDs; do not expose storage paths or database internals.
- Use ISO 8601 UTC timestamps at service boundaries.
- Make asynchronous commands idempotent before enabling automatic retries.
- Include a correlation ID in future public and internal requests.
