import { decryptField, maskPassportNumber, sanitizeLogMessage } from "@visa-platform/config/security";
import { prisma } from "@visa-platform/database";
import type { RecentPassportExtractionsResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  try {
    const jobs = await prisma.passportExtractionJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { extractedData: { select: { passportNumberEncrypted: true } } },
    });

    const response: RecentPassportExtractionsResponse = {
      success: true,
      jobs: jobs.map((job) => ({
        id: job.id,
        documentType: job.documentType,
        countryHint: job.countryHint,
        maskedPassportNumber: job.extractedData
          ? maskPassportNumber(decryptField(job.extractedData.passportNumberEncrypted))
          : null,
        status: job.status,
        confidence: job.confidence === null ? null : Number(job.confidence),
        createdAt: job.createdAt.toISOString(),
      })),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[passport-recent] failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to load recent passport extractions", 500);
  }
}
