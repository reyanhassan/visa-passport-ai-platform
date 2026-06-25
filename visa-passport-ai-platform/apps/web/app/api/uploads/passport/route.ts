import { randomUUID } from "node:crypto";

import { sanitizeLogMessage } from "@visa-platform/config/security";
import type { UploadPassportResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import { loadWebDeploymentConfig } from "@/lib/server/deployment-config";
import { getMaxUploadSizeBytes, getStorageProvider } from "@/lib/server/storage";

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return apiError("VALIDATION_ERROR", "Passport file is required", 400);

  const extension = extensionByMimeType[file.type];
  if (!extension) return apiError("UNSUPPORTED_FILE_TYPE", "Use a JPG, PNG, WebP, or PDF file", 415);

  const maxUploadSizeBytes = getMaxUploadSizeBytes();
  if (file.size === 0 || file.size > maxUploadSizeBytes) {
    return apiError(
      "FILE_SIZE_INVALID",
      `Passport file must be between 1 byte and ${Math.floor(maxUploadSizeBytes / 1024 / 1024)} MB`,
      413,
    );
  }

  let uploadProvider: "local" | "mock";
  try {
    ({ uploadProvider } = loadWebDeploymentConfig());
  } catch (error) {
    console.error("[passport-upload] invalid deployment configuration", error);
    return apiError("CONFIGURATION_ERROR", "Passport upload is not configured correctly", 500);
  }

  const objectKey = `users/${user.id}/passports/${randomUUID()}.${extension}`;
  const contentType = file.type;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (uploadProvider !== "mock") {
    try {
      await getStorageProvider().uploadObject({
        key: objectKey,
        buffer,
        contentType,
        metadata: {
          userId: user.id,
          documentType: "passport",
        },
      });
    } catch (error) {
      console.error(`[passport-upload] storage upload failed: ${sanitizeLogMessage(error)}`);
      return apiError("STORAGE_UPLOAD_FAILED", "Unable to store passport file", 500);
    }
  }

  const response: UploadPassportResponse = {
    success: true,
    objectKey,
    contentType,
    size: buffer.byteLength,
  };
  return NextResponse.json(response, { status: 201 });
}
