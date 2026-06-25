import { sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AgencyStatus,
  AuditAction,
  createAuditLog,
  Prisma,
  prisma,
  UserRole,
} from "@visa-platform/database";
import type { AgencyResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import { serializeAgency } from "@/lib/server/agencies";

const createAgencySchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    phone: z.string().trim().min(3).max(32).optional(),
    country: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    city: z.string().trim().min(2).max(120).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  if (user.role !== UserRole.INDIVIDUAL || user.agencyId) {
    return apiError("AGENCY_NOT_ALLOWED", "Only individual accounts can create an agency", 403);
  }

  const parsed = createAgencySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid agency details", 400);

  try {
    const agency = await prisma.$transaction(async (transaction) => {
      const created = await transaction.agency.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone ?? null,
          country: parsed.data.country ?? null,
          city: parsed.data.city ?? null,
          status: AgencyStatus.PENDING,
        },
      });

      await transaction.user.update({
        where: { id: user.id },
        data: { role: UserRole.AGENCY_ADMIN, agencyId: created.id },
      });

      await createAuditLog(transaction, {
        action: AuditAction.AGENCY_CREATED,
        entityType: "Agency",
        entityId: created.id,
        userId: user.id,
        agencyId: created.id,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        metadata: {
          name: created.name,
          email: created.email,
          status: created.status,
        },
      });

      return created;
    });

    const response: AgencyResponse = { success: true, agency: serializeAgency(agency) };
    return NextResponse.json(response, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("AGENCY_EMAIL_IN_USE", "An agency already exists for this email", 409);
    }
    console.error(`[agencies] create failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to create agency", 500);
  }
}
