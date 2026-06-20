import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function encryptionKey(): Buffer {
  const configuredKey = process.env.FIELD_ENCRYPTION_KEY;
  if (!configuredKey || configuredKey.length < 16) {
    throw new Error("FIELD_ENCRYPTION_KEY must contain at least 16 characters");
  }

  // TODO: Replace local key derivation with KMS-backed envelope encryption and key rotation.
  return createHash("sha256").update(configuredKey, "utf8").digest();
}

export function encryptField(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authenticationTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptField(payload: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext] = payload.split(":");
  if (version !== VERSION || !encodedIv || !encodedTag || encodedCiphertext === undefined) {
    throw new Error("Encrypted field payload is invalid");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
