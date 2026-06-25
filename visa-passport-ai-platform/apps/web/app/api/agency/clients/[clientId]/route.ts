import { sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AuditAction,
  createAuditLog,
  prisma,
} from "@visa-platform/database";
import type { AgencyClientResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import { canUseAgencyWorkspace } from "@/lib/server/access-control";
import { serializeAgencyClient } from "@/lib/server/agencies";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

const clientIdSchema = z.string().trim().min(1).max(64);
const updateAgencyClientSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200).optional(),
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((value) => value.toLowerCase())
      .nullable()
      .optional(),
    phone: z.string().trim().min(3).max(32).nullable().optional(),
    notes: z.string().trim().max(2_000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one client field is required",
  });

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  if (!canUseAgencyWorkspace(user)) {
    return apiError("AGENCY_REQUIRED", "Agency workspace access is required", 403);
  }

  const { clientId } = await context.params;
  if (!clientIdSchema.safeParse(clientId).success) {
    return apiError("VALIDATION_ERROR", "Invalid client ID", 400);
  }

  try {
    const client = await prisma.agencyClient.findFirst({
      where: { id: clientId, agencyId: user.agencyId! },
      include: {
        _count: {
          select: {
            visaApplications: true,
            extractionJobs: true,
          },
        },
      },
    });
    if (!client) return apiError("CLIENT_NOT_FOUND", "Agency client not found", 404);

    const response: AgencyClientResponse = { success: true, client: serializeAgencyClient(client) };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[agency-clients] load failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to load agency client", 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  if (!canUseAgencyWorkspace(user)) {
    return apiError("AGENCY_REQUIRED", "Agency workspace access is required", 403);
  }

  const { clientId } = await context.params;
  if (!clientIdSchema.safeParse(clientId).success) {
    return apiError("VALIDATION_ERROR", "Invalid client ID", 400);
  }

  const parsed = updateAgencyClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid client update", 400);

  try {
    const existing = await prisma.agencyClient.findFirst({
      where: { id: clientId, agencyId: user.agencyId! },
      select: { id: true },
    });
    if (!existing) return apiError("CLIENT_NOT_FOUND", "Agency client not found", 404);

    const client = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.agencyClient.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.fullName !== undefined ? { fullName: parsed.data.fullName } : {}),
          ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
          ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
          ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        },
        include: {
          _count: {
            select: {
              visaApplications: true,
              extractionJobs: true,
            },
          },
        },
      });

      await createAuditLog(transaction, {
        action: AuditAction.AGENCY_CLIENT_UPDATED,
        entityType: "AgencyClient",
        entityId: updated.id,
        userId: user.id,
        agencyId: user.agencyId,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        metadata: { updatedFields: Object.keys(parsed.data) },
      });

      return updated;
    });

    const response: AgencyClientResponse = { success: true, client: serializeAgencyClient(client) };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[agency-clients] update failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to update agency client", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  if (!canUseAgencyWorkspace(user)) {
    return apiError("AGENCY_REQUIRED", "Agency workspace access is required", 403);
  }

  const { clientId } = await context.params;
  if (!clientIdSchema.safeParse(clientId).success) {
    return apiError("VALIDATION_ERROR", "Invalid client ID", 400);
  }

  try {
    const existing = await prisma.agencyClient.findFirst({
      where: { id: clientId, agencyId: user.agencyId! },
      select: { id: true, fullName: true, email: true },
    });
    if (!existing) return apiError("CLIENT_NOT_FOUND", "Agency client not found", 404);

    await prisma.$transaction(async (transaction) => {
      await transaction.agencyClient.delete({ where: { id: existing.id } });
      await createAuditLog(transaction, {
        action: AuditAction.AGENCY_CLIENT_DELETED,
        entityType: "AgencyClient",
        entityId: existing.id,
        userId: user.id,
        agencyId: user.agencyId,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        metadata: {
          fullName: existing.fullName,
          email: existing.email,
        },
      });
    });

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[agency-clients] delete failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to delete agency client", 500);
  }
}
