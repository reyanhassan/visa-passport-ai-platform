import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  return NextResponse.json({
    success: true,
    user: { id: user.id, fullName: user.name, email: user.email, role: user.role },
  });
}
