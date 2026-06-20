# Security and privacy foundation

Passport images and extracted identity fields can enable identity theft, account takeover, and cross-border fraud. They may also be regulated personal data. Treat every document as highly sensitive, every upload as untrusted, and every extracted value as unverified until reviewed.

## Field-level protection

The worker encrypts the following values before they enter PostgreSQL:

- passport number
- surname and given names
- date of birth
- place of birth
- raw MRZ

The shared `encryptField` and `decryptField` helpers use authenticated AES-256-GCM with a random IV and a key derived from `FIELD_ENCRYPTION_KEY`. This is a development foundation. Production must use managed KMS envelope encryption, key identifiers, rotation, and a re-encryption procedure. Never expose the encryption key through `NEXT_PUBLIC_*` variables.

Passport images must live in private object storage. Database records and storage object keys are references, not permission to expose an object publicly.

## Logging rules

Never log:

- a full passport number
- a raw or complete MRZ
- full extracted names
- passport images, image URLs, signed URLs, or object-storage keys
- plaintext encrypted fields, passwords, tokens, or encryption keys

The shared PII helpers mask passport numbers to their last three characters, partially mask email addresses, reduce names to their first character, and replace MRZ values entirely. Error messages are sanitized before worker/API logging.

Audit metadata is recursively sanitized in the database package before persistence. This is defense in depth, not permission to pass full request bodies or extracted records to the audit helper. Audit events should contain identifiers, state transitions, counts, and non-sensitive operational values only.

## Audit events

The foundation defines events for extraction creation, OCR start/completion/failure, passport-data viewing, and visa-application creation/update. Sensitive reads should fail closed if their audit event cannot be saved. Authentication is not implemented yet, so anonymous API reads are deliberately not attributed to the document owner.

Production audit records should be append-only, access-controlled separately from application data, monitored for anomalous access, and exported to tamper-resistant storage.

## Service and upload controls

- Keep OCR and worker services on private networks and authenticate service-to-service calls.
- Use short-lived signed upload/download URLs and validate tenant authorization before issuing them.
- Validate MIME type, file signature, size, page count, and image dimensions; add malware scanning and quarantine.
- Encrypt transport, disks, databases, backups, Redis, and object storage.
- Use separate least-privilege credentials for the web, worker, OCR service, migrations, and operators.
- Store secrets in the deployment platform's secret manager, never in Git.
- Add authorization checks to every document query before multi-tenant production use.

## Retention and deletion TODOs

- **Retention policy TODO:** define maximum retention per data class, account state, visa workflow, and jurisdiction.
- **Auto-delete policy TODO:** schedule deletion of expired jobs and cascade deletion through PostgreSQL, object storage, Redis, backups, and downstream processors, with deletion audit evidence.
- **Object-storage encryption TODO:** require provider-managed encryption now and evaluate customer-managed KMS keys, rotation, versioning, and lifecycle rules before production.

Do not use customer passport data for model training without explicit informed consent, a lawful basis, and documented data-governance approval.
