import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";

import type { StorageProvider, StoredObject } from "./storage-provider";

const localBucket = "local";
const defaultLocalUploadDir = "uploads/private";
const contentTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function localStorageRoot(): string {
  const configured = process.env.LOCAL_UPLOAD_DIR ?? defaultLocalUploadDir;
  return resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
}

function assertSafeKey(key: string): string {
  if (!key || key.startsWith("/") || key.startsWith("\\") || key.includes("\0")) {
    throw new Error("Storage object key is invalid");
  }

  const root = localStorageRoot();
  const target = resolve(root, key);
  const pathFromRoot = relative(root, target);
  if (pathFromRoot === "" || pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
    throw new Error("Storage object key escapes the local storage root");
  }

  return target;
}

function signingSecret(): string {
  return process.env.STORAGE_SIGNING_SECRET
    ?? process.env.JWT_SECRET
    ?? "local-development-storage-secret";
}

function signPayload(key: string, expiresAt: number): string {
  return createHmac("sha256", signingSecret())
    .update(`${key}.${expiresAt}`)
    .digest("hex");
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function verifyLocalReadToken(key: string, expiresAt: number, signature: string): boolean {
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = signPayload(key, expiresAt);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(signature, "hex");
  return expectedBuffer.length === providedBuffer.length
    && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function readLocalObject(key: string): Promise<{
  buffer: Buffer;
  contentType: string;
  size: number;
}> {
  const path = assertSafeKey(key);
  const [buffer, fileStat] = await Promise.all([readFile(path), stat(path)]);
  return {
    buffer,
    contentType: contentTypeByExtension[extname(key).toLowerCase()] ?? "application/octet-stream",
    size: fileStat.size,
  };
}

export class LocalStorageProvider implements StorageProvider {
  async uploadObject(input: {
    key: string;
    buffer: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<StoredObject> {
    const path = assertSafeKey(input.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.buffer, { flag: "wx" });
    return {
      objectKey: input.key,
      bucket: localBucket,
      contentType: input.contentType,
      size: input.buffer.byteLength,
    };
  }

  async getSignedReadUrl(input: {
    key: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    assertSafeKey(input.key);
    const expiresAt = Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? 900);
    const signature = signPayload(input.key, expiresAt);
    return `${appBaseUrl()}/api/storage/local/${encodeObjectKey(input.key)}?expires=${expiresAt}&signature=${signature}`;
  }

  async deleteObject(input: { key: string }): Promise<void> {
    const path = assertSafeKey(input.key);
    await rm(path, { force: true });
  }
}
