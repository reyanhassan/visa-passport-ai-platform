export interface StoredObject {
  objectKey: string;
  bucket: string;
  contentType: string;
  size: number;
}

export interface StorageProvider {
  uploadObject(input: {
    key: string;
    buffer: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<StoredObject>;

  getSignedReadUrl(input: {
    key: string;
    expiresInSeconds?: number;
  }): Promise<string>;

  deleteObject(input: {
    key: string;
  }): Promise<void>;
}
