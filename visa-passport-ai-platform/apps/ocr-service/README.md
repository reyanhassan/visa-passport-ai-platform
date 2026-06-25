# Passport OCR service

A small FastAPI service that owns passport OCR orchestration and MRZ parsing for the VisaFlow platform. It supports deterministic mock OCR locally and Azure Document Intelligence for real passport extraction.

## Structure

```text
app/
├── main.py                         # FastAPI application and middleware
├── config.py                       # Environment-backed settings
├── routes/
│   ├── health.py                   # Health endpoint
│   └── passport.py                 # Passport OCR contract
├── schemas/
│   └── passport.py                 # Pydantic request and response models
├── services/
│   ├── ocr_engine.py               # Provider interface and mock engine
│   ├── mrz_parser.py               # MRZ parsing boundary
│   └── image_preprocessing.py      # Image preparation boundary
└── utils/
    └── normalization.py            # Country and MRZ normalization
```

## Run locally

From `apps/ocr-service`:

```bash
python -m venv .venv
python -m pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

The service is then available at `http://localhost:8001`, with interactive API documentation at `http://localhost:8001/docs` in development.

From the monorepo root, the full stack can be started with:

```bash
docker compose -f infra/docker-compose.yml up --build
```

## API

### Health

```bash
curl http://localhost:8001/health
```

```json
{
  "status": "ok",
  "service": "ocr-service"
}
```

### Mock passport OCR

```bash
curl -X POST http://localhost:8001/ocr/passport \
  -H "Content-Type: application/json" \
  -d '{
    "document_type": "passport",
    "country_hint": "PK",
    "image_url": "https://example.com/passport.jpg",
    "job_id": "optional-job-id"
  }'
```

The response echoes `job_id` and returns deterministic sample passport data, a confidence value, mock MRZ validity, and an empty warning list. `country_hint` accepts two- or three-letter alphabetic hints and is normalized to uppercase.

## Provider architecture

`OCREngine` is the stable provider interface. `PassportOCRService` orchestrates image preparation, provider extraction, and MRZ parsing without coupling HTTP routes to a vendor SDK.

The default is:

```env
OCR_PROVIDER=mock
```

Supported provider values are `mock`, `azure`, and `aws`:

- `mock` returns deterministic local data.
- `azure` calls Azure Document Intelligence with `prebuilt-idDocument`.
- `aws` returns a structured not-implemented error.

For the full provider guide and environment variables, see `docs/ocr.md`.

## Security notes

Do not log passport images, signed URLs, MRZ text, Azure keys, or extracted identity fields. Azure mode downloads the signed URL in memory, enforces file type and size checks, and sends bytes directly to Document Intelligence.

## Tests

Install the development dependencies defined in `pyproject.toml`, then run:

```bash
python -m pip install -e ".[dev]"
pytest
ruff check app tests
```
