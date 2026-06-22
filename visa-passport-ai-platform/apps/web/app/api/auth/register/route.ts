import { sanitizeLogMessage } from "@visa-platform/config/security";
import { Prisma, UserRole, prisma } from "@visa-platform/database";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/server/api-error";

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200),
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(128),
  })
  .strict();

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid registration details", 400);

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existingUser) return apiError("EMAIL_IN_USE", "An account already exists for this email", 409);

    const user = await prisma.user.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, 12),
        role: UserRole.INDIVIDUAL,
      },
      select: { id: true, fullName: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("EMAIL_IN_USE", "An account already exists for this email", 409);
    }
    console.error(`[auth-register] database request failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to connect to the account database", 503);
  }
}
