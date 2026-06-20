import {
  AuditAction,
  createAuditLog,
  ExtractionJobStatus,
  prisma,
  type PassportExtractedData,
} from "@visa-platform/database";
import { decryptField, sanitizeLogMessage } from "@visa-platform/config/security";
import type {
  PassportExtractedFields,
  PassportExtractionJobResponse,
} from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/server/api-error";
import { getCurrentUser } from "@/lib/auth";
const jobIdSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export const dynamic = "force-dynamic";

function serializeExtractedData(record: PassportExtractedData): PassportExtractedFields {
  return {
    passportNumber: decryptField(record.passportNumberEncrypted),
    surname: decryptField(record.surnameEncrypted),
    givenNames: decryptField(record.givenNamesEncrypted),
    nationality: record.nationality,
    dateOfBirth: decryptField(record.dateOfBirthEncrypted),
    sex: record.sex,
    dateOfIssue: record.dateOfIssue?.toISOString().slice(0, 10) ?? null,
    dateOfExpiry: record.dateOfExpiry?.toISOString().slice(0, 10) ?? null,
    placeOfBirth: record.placeOfBirthEncrypted
      ? decryptField(record.placeOfBirthEncrypted)
      : null,
    mrzValid: record.mrzValid,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const { jobId } = await context.params;
  if (!jobIdSchema.safeParse(jobId).success) {
    return apiError("VALIDATION_ERROR", "Invalid job ID", 400);
  }

  try {
    const job = await prisma.passportExtractionJob.findFirst({
      where: { id: jobId, userId: user.id },
      include: { extractedData: true },
    });

    if (!job) {
      return apiError("JOB_NOT_FOUND", "Passport extraction job not found", 404);
    }

    const response: PassportExtractionJobResponse = {
      success: true,
      job: {
        id: job.id,
        status: job.status,
        confidence: job.confidence === null ? null : Number(job.confidence),
        countryHint: job.countryHint,
        createdAt: job.createdAt.toISOString(),
        ...(job.status === ExtractionJobStatus.FAILED
          ? { errorMessage: job.errorMessage }
          : {}),
        ...(job.status === ExtractionJobStatus.COMPLETED && job.extractedData
          ? { extractedData: serializeExtractedData(job.extractedData) }
          : {}),
      },
    };

    if (job.status === ExtractionJobStatus.COMPLETED && job.extractedData) {
      const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      await createAuditLog(prisma, {
        action: AuditAction.PASSPORT_DATA_VIEWED,
        entityType: "PassportExtractionJob",
        entityId: job.id,
        userId: user.id,
        agencyId: user.agencyId,
        ipAddress: forwardedFor ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        metadata: { status: job.status },
      });
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(`[passport-job] failed to load job ${jobId}: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to retrieve passport extraction job", 500);
  }
}
