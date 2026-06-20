# Country rules

Version-controlled sample passport and visa rule files consumed by application services.

- Files are validated against `schema.json` when loaded by `@visa-platform/config`.
- Country lookup uses ISO 3166-1 alpha-2 codes, regardless of filename.
- Treat every file as illustrative configuration until reviewed against authoritative government sources.
- Never update regulatory rules silently. Changes should include source review, approval, tests, and an audit trail.
- Do not rely on passport-number regexes as proof that a document is genuine.

See [`docs/country-rules.md`](../../docs/country-rules.md) for usage and maintenance guidance.
