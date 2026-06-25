import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import {
  getSignedUrlExpiresSeconds,
  getStorageProvider,
  objectKeyBelongsToUser,
} from "@/lib/server/storage";

const requestSchema = z
  .object({
    objectKey: z.string().trim().min(1).max(1_024),
  })
  .strict();

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Object key is required", 400);
  }

  if (!objectKeyBelongsToUser(parsed.data.objectKey, user.id)) {
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
