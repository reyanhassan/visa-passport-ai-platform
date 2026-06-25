import { sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AuditAction,
  createAuditLog,
  prisma,
} from "@visa-platform/database";
import type { AgencyClientResponse, AgencyClientsResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import { canUseAgencyWorkspace } from "@/lib/server/access-control";
import { serializeAgencyClient } from "@/lib/server/agencies";

const agencyClientSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200),
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
  .strict();

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  if (!canUseAgencyWorkspace(user)) {
    return apiError("AGENCY_REQUIRED", "Agency workspace access is required", 403);
  }

  try {
    const clients = await prisma.agencyClient.findMany({
      where: { agencyId: user.agencyId! },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            visaApplications: true,
            extractionJobs: true,
          },
        },
      },
    });

    const response: AgencyClientsResponse = {
      success: true,
      clients: clients.map(serializeAgencyClient),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[agency-clients] list failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to load agency clients", 500);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  if (!canUseAgencyWorkspace(user)) {
    return apiError("AGENCY_REQUIRED", "Agency workspace access is required", 403);
  }

  const parsed = agencyClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid client details", 400);

  try {
    const client = await prisma.$transaction(async (transaction) => {
      const created = await transaction.agencyClient.create({
        data: {
          agencyId: user.agencyId!,
          fullName: parsed.data.fullName,
          email: parsed.data.email ?? null,
          phone: parsed.data.phone ?? null,
          notes: parsed.data.notes ?? null,
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
        action: AuditAction.AGENCY_CLIENT_CREATED,
        entityType: "AgencyClient",
        entityId: created.id,
        userId: user.id,
        agencyId: user.agencyId,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        metadata: {
          fullName: created.fullName,
          email: created.email,
        },
      });

      return created;
    });

    const response: AgencyClientResponse = { success: true, client: serializeAgencyClient(client) };
    return NextResponse.json(response, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[agency-clients] create failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to create agency client", 500);
  }
}
