export type SanitizedJson =
  | null
  | boolean
  | number
  | string
  | SanitizedJson[]
  | { [key: string]: SanitizedJson };

const REDACTED = "[REDACTED]";
const REDACTED_EMAIL = "[REDACTED_EMAIL]";
const REDACTED_MRZ = "[REDACTED_MRZ]";
const MRZ_PATTERN = /P<[A-Z0-9<]{10,}/gi;
const PASSPORT_PATTERN = /\b[A-Z]{1,3}\d{5,9}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function maskPassportNumber(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "[REDACTED_PASSPORT]";

  const visible = normalized.slice(-3);
  return `${"*".repeat(Math.max(3, normalized.length - visible.length))}${visible}`;
}

export function maskEmail(value: string): string {
  const [localPart, domain] = value.trim().split("@");
  if (!localPart || !domain) return REDACTED_EMAIL;

  const domainParts = domain.split(".");
  const domainName = domainParts.shift();
  if (!domainName) return REDACTED_EMAIL;

  const maskedLocal = `${localPart[0]}***${localPart.length > 1 ? localPart.at(-1) : ""}`;
  const maskedDomain = `${domainName[0]}***${domainName.length > 1 ? domainName.at(-1) : ""}`;
  const suffix = domainParts.length > 0 ? `.${domainParts.join(".")}` : "";
  return `${maskedLocal}@${maskedDomain}${suffix}`;
}

export function maskName(value: string): string {
  const firstCharacter = value.trim().charAt(0);
  return firstCharacter ? `${firstCharacter}***` : "[REDACTED_NAME]";
}

export function maskMrz(_value?: string): "[REDACTED_MRZ]" {
  return REDACTED_MRZ;
}

export function sanitizeLogMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return message
    .replace(MRZ_PATTERN, REDACTED_MRZ)
    .replace(PASSPORT_PATTERN, (value) => maskPassportNumber(value))
    .replace(EMAIL_PATTERN, (value) => maskEmail(value))
    .slice(0, 500);
}

const SECRET_KEYS = new Set([
  "accesstoken",
  "authorization",
  "ciphertext",
  "encryptionkey",
  "imageobjectkey",
  "imageurl",
  "password",
  "passwordhash",
  "refreshtoken",
  "secret",
  "signedurl",
  "token",
]);

const PRIVATE_FIELD_KEYS = new Set(["address", "dateofbirth", "dob", "placeofbirth"]);

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function sanitizeValue(value: unknown, key: string | undefined, seen: WeakSet<object>): SanitizedJson {
  const normalizedKey = key ? normalizeKey(key) : "";

  if (SECRET_KEYS.has(normalizedKey) || PRIVATE_FIELD_KEYS.has(normalizedKey)) return REDACTED;
  if (normalizedKey.includes("mrz")) return maskMrz();
  if (
    normalizedKey.includes("passportnumber") ||
    normalizedKey === "documentnumber" ||
    normalizedKey === "passport"
  ) {
    return typeof value === "string" ? maskPassportNumber(value) : "[REDACTED_PASSPORT]";
  }
  if (normalizedKey.includes("email")) {
    return typeof value === "string" ? maskEmail(value) : REDACTED_EMAIL;
  }
  if (
    normalizedKey === "name" ||
    normalizedKey === "names" ||
    normalizedKey === "fullname" ||
    normalizedKey === "firstname" ||
    normalizedKey === "middlename" ||
    normalizedKey === "lastname" ||
    normalizedKey.includes("surname") ||
    normalizedKey.includes("givenname")
  ) {
    return typeof value === "string" ? maskName(value) : "[REDACTED_NAME]";
  }

  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return REDACTED;

  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    const sanitized = value.map((item) => sanitizeValue(item, key, seen));
    seen.delete(value);
    return sanitized;
  }

  const sanitized: Record<string, SanitizedJson> = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    sanitized[childKey] = sanitizeValue(childValue, childKey, seen);
  }
  seen.delete(value);
  return sanitized;
}

/** Recursively converts metadata to JSON-safe values and masks known PII/secrets by key. */
export function sanitizeMetadata(metadata: unknown): SanitizedJson {
  return sanitizeValue(metadata ?? {}, undefined, new WeakSet());
}
