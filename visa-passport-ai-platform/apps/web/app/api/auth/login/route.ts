import { prisma } from "@visa-platform/database";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";

const loginSchema = z
  .object({
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid email or password", 400);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) {
    return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
  });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    await createSessionToken(user.id),
    sessionCookieOptions,
  );
  return response;
}
