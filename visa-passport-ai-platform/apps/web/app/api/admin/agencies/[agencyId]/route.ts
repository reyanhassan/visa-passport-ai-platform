import { sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AgencyStatus,
  AuditAction,
  createAuditLog,
  Prisma,
  prisma,
} from "@visa-platform/database";
import type { AgencyResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import { isAdmin } from "@/lib/server/access-control";
import { serializeAgency } from "@/lib/server/agencies";

type RouteContext = {
  params: Promise<{ agencyId: string }>;
};

const agencyIdSchema = z.string().trim().min(1).max(64);
const updateAgencySchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()).optional(),
    phone: z.string().trim().min(3).max(32).nullable().optional(),
    country: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .nullable()
      .optional(),
    city: z.string().trim().min(2).max(120).nullable().optional(),
    status: z.nativeEnum(AgencyStatus).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one agency field is required",
  });

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  if (!isAdmin(user)) return apiError("ADMIN_REQUIRED", "Admin access is required", 403);

  const { agencyId } = await context.params;
  if (!agencyIdSchema.safeParse(agencyId).success) {
    return apiError("VALIDATION_ERROR", "Invalid agency ID", 400);
  }

  const parsed = updateAgencySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid agency update", 400);

  try {
    const agency = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.agency.update({
        where: { id: agencyId },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
          ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
          ...(parsed.data.country !== undefined ? { country: parsed.data.country } : {}),
          ...(parsed.data.city !== undefined ? { city: parsed.data.city } : {}),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        },
      });

      await createAuditLog(transaction, {
        action: AuditAction.AGENCY_UPDATED,
        entityType: "Agency",
        entityId: updated.id,
        userId: user.id,
        agencyId: updated.id,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        metadata: {
          updatedFields: Object.keys(parsed.data),
          status: updated.status,
        },
      });

      return updated;
    });

    const response: AgencyResponse = { success: true, agency: serializeAgency(agency) };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return apiError("AGENCY_NOT_FOUND", "Agency not found", 404);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("AGENCY_EMAIL_IN_USE", "An agency already exists for this email", 409);
    }
    console.error(`[admin-agencies] update failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to update agency", 500);
  }
}
