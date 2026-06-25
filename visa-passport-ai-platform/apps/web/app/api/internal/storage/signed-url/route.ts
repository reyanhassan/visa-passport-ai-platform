import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/server/api-error";
import {
  getSignedUrlExpiresSeconds,
  getStorageProvider,
  objectKeyBelongsToUser,
} from "@/lib/server/storage";

const requestSchema = z
  .object({
    objectKey: z.string().trim().min(1).max(1_024),
    userId: z.string().trim().min(1).max(191),
  })
  .strict();

function isAuthorized(request: Request): boolean {
  const expected = process.env.INTERNAL_API_KEY?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return apiError("UNAUTHORIZED_INTERNAL_REQUEST", "Internal authorization failed", 401);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Object key and user ID are required", 400);
  }

  if (!objectKeyBelongsToUser(parsed.data.objectKey, parsed.data.userId)) {
    return apiError("FORBIDDEN_OBJECT_KEY", "Object key is not available to this user", 403);
  }

  const expiresInSeconds = getSignedUrlExpiresSeconds();
  const url = await getStorageProvider().getSignedReadUrl({
    key: parsed.data.objectKey,
    expiresInSeconds,
  });

  return NextResponse.json({
    success: true,
    url,
    expiresInSeconds,
  }, { headers: { "Cache-Control": "no-store" } });
}
