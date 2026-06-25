import { sanitizeLogMessage } from "@visa-platform/config/security";
import { AgencyStatus, Prisma, prisma } from "@visa-platform/database";
import type { AdminAgenciesResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import { isAdmin } from "@/lib/server/access-control";
import { serializeAgency } from "@/lib/server/agencies";

const querySchema = z.object({
  status: z.nativeEnum(AgencyStatus).optional(),
  query: z.string().trim().min(1).max(120).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);
  if (!isAdmin(user)) return apiError("ADMIN_REQUIRED", "Admin access is required", 403);

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid agency filters", 400);

  const where: Prisma.AgencyWhereInput = {
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.query
      ? {
          OR: [
            { name: { contains: parsed.data.query, mode: "insensitive" } },
            { email: { contains: parsed.data.query, mode: "insensitive" } },
            { city: { contains: parsed.data.query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const agencies = await prisma.agency.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            visaApplications: true,
          },
        },
      },
      take: 100,
    });

    const response: AdminAgenciesResponse = {
      success: true,
      agencies: agencies.map((agency) => ({
        ...serializeAgency(agency),
        usersCount: agency._count.users,
        clientsCount: agency._count.clients,
        applicationsCount: agency._count.visaApplications,
      })),
    };

    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[admin-agencies] list failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to load agencies", 500);
  }
}
