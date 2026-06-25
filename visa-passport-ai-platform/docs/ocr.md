# Passport OCR

VisaFlow keeps passport OCR behind the FastAPI service in `apps/ocr-service`. The web app creates extraction jobs, the BullMQ worker requests a short-lived signed URL for the private uploaded object, and the OCR service downloads that URL without receiving object storage credentials.

## Modes

```env
OCR_PROVIDER=mock
OCR_PROVIDER=azure
OCR_PROVIDER=aws
```

- `mock` returns deterministic test passport data and is the default for local development.
- `azure` calls Azure AI Document Intelligence with the `prebuilt-idDocument` model.
- `aws` is reserved and returns a structured `AWS_TEXTRACT_NOT_IMPLEMENTED` error.

## Azure Configuration

```env
OCR_PROVIDER=azure
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key
AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID=prebuilt-idDocument
AZURE_DOCUMENT_INTELLIGENCE_API_VERSION=2024-11-30
OCR_MAX_FILE_SIZE_MB=15
```

The Azure adapter uses the REST API, submits document bytes to:

```text
POST /documentintelligence/documentModels/{modelId}:analyze?api-version=2024-11-30
```

It then polls the `Operation-Location` returned by Azure until analysis succeeds, fails, or times out.

## Testing With Mock

Use:

```env
OCR_PROVIDER=mock
```

Then post:

```bash
curl -X POST http://localhost:8001/ocr/passport \
  -H "Content-Type: application/json" \
  -d '{"document_type":"passport","country_hint":"PK","image_url":"https://example.com/passport.jpg","job_id":"local-test"}'
```

## Testing With Azure

1. Configure the Azure env vars above.
2. Upload a passport through the web app so it is stored privately.
3. Start the web app, worker, Redis, database, and OCR service.
4. Submit an extraction job. The worker resolves the object key to a signed read URL and sends only that URL to OCR.

Unit tests never call Azure. Azure mapping tests use fixture JSON.

## Security Notes

- Do not log passport fields, MRZ text, document bytes, signed URLs, Azure keys, or object storage secrets.
- The OCR service only downloads from the signed URL supplied by the worker.
- In production, Azure mode requires HTTPS document URLs.
- Documents are processed in memory; the OCR service does not persist passport files to disk.
- Extracted passport fields are encrypted by the worker before database storage.

## Supported Fields

- `passport_number`
- `surname`
- `given_names`
- `nationality`
- `date_of_birth`
- `sex`
- `date_of_issue`
- `date_of_expiry`
- `place_of_birth`
- `mrz.raw`
- `mrz.valid`
- `warnings`

Azure fields are normalized from the prebuilt ID document model. When a valid TD3 MRZ is present, MRZ values are preferred for passport number, nationality, date of birth, and expiry date. Conflicts are reported in `warnings`.

## Known Limitations

- The AWS Textract provider is a structured placeholder.
- Very poor scans, missing MRZ lines, or non-passport ID documents may return `BAD_SCAN_QUALITY` or `NO_PASSPORT_DETECTED`.
- The nationality normalizer includes common country names and ISO-2 mappings used by the app, but it is not a complete ISO registry.
- The Azure adapter currently targets single-document passport extraction, not batch analysis.
