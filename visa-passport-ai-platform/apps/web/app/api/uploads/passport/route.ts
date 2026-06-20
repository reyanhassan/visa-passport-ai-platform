import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { UploadPassportResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

function uploadDirectory(): string {
  return join(process.cwd(), "public", "uploads", "passports");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return apiError("VALIDATION_ERROR", "Passport file is required", 400);

  const extension = extensionByMimeType[file.type];
  if (!extension) return apiError("UNSUPPORTED_FILE_TYPE", "Use a JPG, PNG, WebP, or PDF file", 415);
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return apiError("FILE_SIZE_INVALID", "Passport file must be between 1 byte and 15 MB", 413);
  }

  const directory = uploadDirectory();
  const filename = `${randomUUID()}${extension}`;
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), Buffer.from(await file.arrayBuffer()), {
    flag: "wx",
  });

  const objectKey = `uploads/passports/${filename}`;
  const response: UploadPassportResponse = {
    success: true,
    imageUrl: `/${objectKey}`,
    objectKey,
  };
  return NextResponse.json(response, { status: 201 });
}
