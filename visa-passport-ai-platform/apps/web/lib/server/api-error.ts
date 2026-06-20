import type { StructuredApiError } from "@visa-platform/types";
import { NextResponse } from "next/server";

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json<StructuredApiError>(
    {
      success: false,
      error: { code, message },
    },
    { status },
  );
}
