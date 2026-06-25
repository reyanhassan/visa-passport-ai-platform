import { NextResponse } from "next/server";

import { apiError } from "@/lib/server/api-error";
import { readLocalObject, verifyLocalReadToken } from "@/lib/server/storage/local-storage";

type RouteContext = {
  params: Promise<{ objectKey: string[] }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  const { objectKey: objectKeyParts } = await context.params;
  const objectKey = objectKeyParts.map(decodeURIComponent).join("/");
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";

  if (!verifyLocalReadToken(objectKey, expires, signature)) {
    return apiError("SIGNED_URL_EXPIRED", "The signed URL is invalid or expired", 403);
  }

  try {
    const object = await readLocalObject(objectKey);
    const body = new Blob([new Uint8Array(object.buffer)], { type: object.contentType });
    return new NextResponse(body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Length": String(object.size),
        "Content-Type": object.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return apiError("OBJECT_NOT_FOUND", "Stored object was not found", 404);
  }
}
