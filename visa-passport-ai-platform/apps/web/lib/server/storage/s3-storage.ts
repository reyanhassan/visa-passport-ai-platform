import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { StorageProvider, StoredObject } from "./storage-provider";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when STORAGE_PROVIDER=s3`);
  return value;
}

function readForcePathStyle(): boolean {
  return (process.env.S3_FORCE_PATH_STYLE ?? "true").trim().toLowerCase() !== "false";
}

export class S3StorageProvider implements StorageProvider {
  private readonly bucket = requiredEnv("S3_BUCKET");
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    region: process.env.S3_REGION?.trim() || "auto",
    forcePathStyle: readForcePathStyle(),
    credentials: {
      accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    },
  });

  async uploadObject(input: {
    key: string;
    buffer: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<StoredObject> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      Body: input.buffer,
      ContentType: input.contentType,
      Metadata: input.metadata,
    }));

    return {
      objectKey: input.key,
      bucket: this.bucket,
      contentType: input.contentType,
      size: input.buffer.byteLength,
    };
  }

  async getSignedReadUrl(input: {
    key: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: input.key }),
      { expiresIn: input.expiresInSeconds ?? 900 },
    );
  }

  async deleteObject(input: { key: string }): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: input.key }));
  }
}
