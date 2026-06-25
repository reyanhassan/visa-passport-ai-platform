import { LocalStorageProvider } from "./local-storage";
import { S3StorageProvider } from "./s3-storage";
import type { StorageProvider } from "./storage-provider";

export type StorageProviderName = "local" | "s3";

let cachedProvider: StorageProvider | null = null;
let cachedProviderName: StorageProviderName | null = null;

function readStorageProviderName(): StorageProviderName {
  const provider = (process.env.STORAGE_PROVIDER ?? "local").trim().toLowerCase();
  if (provider !== "local" && provider !== "s3") {
    throw new Error("STORAGE_PROVIDER must be one of: local, s3");
  }
  return provider;
}

export function getStorageProvider(): StorageProvider {
  const providerName = readStorageProviderName();
  if (cachedProvider && cachedProviderName === providerName) return cachedProvider;

  cachedProviderName = providerName;
  cachedProvider = providerName === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
  return cachedProvider;
}

export function getSignedUrlExpiresSeconds(): number {
  const value = Number(process.env.SIGNED_URL_EXPIRES_SECONDS ?? 900);
  return Number.isInteger(value) && value > 0 && value <= 86_400 ? value : 900;
}

export function getMaxUploadSizeBytes(): number {
  const value = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 15);
  const megabytes = Number.isFinite(value) && value > 0 ? value : 15;
  return Math.floor(megabytes * 1024 * 1024);
}

export function userObjectKeyPrefix(userId: string): string {
  return `users/${userId}/`;
}

export function objectKeyBelongsToUser(objectKey: string, userId: string): boolean {
  return objectKey.startsWith(userObjectKeyPrefix(userId)) && !objectKey.includes("..");
}

export type { StoredObject, StorageProvider } from "./storage-provider";
