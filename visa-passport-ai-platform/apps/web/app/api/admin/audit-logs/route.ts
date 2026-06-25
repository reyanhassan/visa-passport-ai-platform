import { sanitizeLogMessage, sanitizeMetadata } from "@visa-platform/config/security";
import { Prisma, prisma } from "@visa-platform/database";
import type { AdminAuditLogsResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import { isAdmin } from "@/lib/server/access-control";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().trim().min(1).max(120).optional(),
  entityType: z.string().trim().min(1).max(120).optional(),
  userId: z.string().trim().min(1).max(191).optional(),
  agencyId: z.string().trim().min(1).max(191).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  if (!isAdmin(user)) return apiError("ADMIN_REQUIRED", "Admin access is required", 403);

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid audit log filters", 400);

  const where: Prisma.AuditLogWhereInput = {
    ...(parsed.data.action ? { action: parsed.data.action } : {}),
    ...(parsed.data.entityType ? { entityType: parsed.data.entityType } : {}),
    ...(parsed.data.userId ? { userId: parsed.data.userId } : {}),
    ...(parsed.data.agencyId ? { agencyId: parsed.data.agencyId } : {}),
  };

  try {
    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.data.page - 1) * parsed.data.pageSize,
        take: parsed.data.pageSize,
      }),
    ]);

    const response: AdminAuditLogsResponse = {
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        userId: log.userId,
        agencyId: log.agencyId,
        metadata: sanitizeMetadata(log.metadata),
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / parsed.data.pageSize)),
      },
    };

    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[admin-audit-logs] list failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to load audit logs", 500);
  }
}
