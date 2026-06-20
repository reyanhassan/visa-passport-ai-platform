# Country rules system

The country rules system stores small, version-controlled JSON documents in `shared/country-rules` and exposes a typed filesystem loader from `@visa-platform/config`.

These files are sample application configuration, not legal or immigration advice. Passport formats and visa requirements can change without notice. Before production use, every rule must be checked against current authoritative government sources and approved through a documented review process.

## Available samples

| Code | Country | File |
| --- | --- | --- |
| `PK` | Pakistan | `pakistan.json` |
| `AE` | United Arab Emirates | `uae.json` |
| `SA` | Saudi Arabia | `saudi-arabia.json` |
| `GB` | United Kingdom | `uk.json` |
| `CA` | Canada | `canada.json` |

Lookup uses the ISO country code rather than accepting arbitrary filenames. This prevents path traversal and keeps country aliases explicit.

## Rule shape

Each file contains:

- a two-letter `country_code` and display `country_name`;
- passport-number format and required extraction fields;
- the expected date representation;
- a minimum remaining-validity window;
- supported sample visa types and required documents.

All files must satisfy [`shared/country-rules/schema.json`](../shared/country-rules/schema.json). The TypeScript loader performs a second runtime validation with Zod and verifies that the file's country code matches the requested code.

## TypeScript usage

```ts
import {
  loadCountryRules,
  validatePassportData,
} from "@visa-platform/config";

const rules = await loadCountryRules("pk");

const result = await validatePassportData(
  rules.country_code,
  {
    passport_number: "AB1234567",
    surname: "HASSAN",
    given_names: "REYAN",
    nationality: "PAK",
    date_of_birth: "2001-01-01",
    sex: "M",
    date_of_expiry: "2032-01-01",
  },
  {
    visaType: "tourist",
    referenceDate: new Date("2026-06-19T00:00:00Z"),
  },
);
```

The validation result contains:

```ts
{
  countryCode: "PK",
  missingFields: [],
  warnings: [],
  passportNumberValid: true,
  expiryValidForVisa: true,
  isValid: true,
}
```

`passportNumberValid` is `null` when no passport number was supplied. `expiryValidForVisa` is `false` when expiry is missing, malformed, or earlier than the configured validity threshold. Date calculations use UTC and clamp month-end dates to avoid local timezone drift.

## Filesystem resolution

By default, the loader resolves `shared/country-rules` relative to the compiled package location. Deployments can override this with an absolute or working-directory-relative path:

```env
COUNTRY_RULES_DIR=/app/shared/country-rules
```

Loaded rules are cached in memory. Tests or development tools can call `clearCountryRulesCache()` after changing files. Production processes should restart after an approved rule deployment.

## Adding or changing a country

1. Add the JSON file and validate it against `schema.json`.
2. Add the ISO code and filename to the allowlist in `packages/config/src/countryRules.ts`.
3. Add positive, missing-field, malformed-date, number-format, and expiry-boundary tests.
4. Record authoritative source URLs, reviewer, review date, and effective date in the future database-backed rule workflow.
5. Obtain compliance or legal approval before deployment.
6. Keep historical changes in source control and emit an audit event when the active rule set changes.

Regex matching is only a format check. It does not establish authenticity, citizenship, identity, visa eligibility, or document validity.
