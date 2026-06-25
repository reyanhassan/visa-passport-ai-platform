import {
  AuditAction,
  createAuditLog,
  prisma,
  type PassportExtractedData,
} from "@visa-platform/database";
import { decryptField, encryptField, sanitizeLogMessage } from "@visa-platform/config/security";
import type { PassportDataUpdateResponse, PassportExtractedFields } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import { canUseAgencyWorkspace } from "@/lib/server/access-control";

const jobIdSchema = z.string().uuid();

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const calendarDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isCalendarDate, "Invalid calendar date");

const passportDataSchema = z
  .object({
    passportNumber: z.string().trim().min(1).max(50),
    surname: z.string().trim().min(1).max(120),
    givenNames: z.string().trim().min(1).max(120),
    nationality: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase()),
    dateOfBirth: calendarDateSchema,
    sex: z.enum(["M", "F", "X"]).nullable(),
    dateOfIssue: calendarDateSchema.nullable(),
    dateOfExpiry: calendarDateSchema.nullable(),
    placeOfBirth: z.string().trim().max(120).nullable(),
    mrzValid: z.boolean(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export const dynamic = "force-dynamic";

function asUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

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

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const { jobId } = await context.params;
  if (!jobIdSchema.safeParse(jobId).success) {
    return apiError("VALIDATION_ERROR", "Invalid job ID", 400);
  }

  const parsed = passportDataSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid passport data", 400);
  }

  try {
    const job = await prisma.passportExtractionJob.findFirst({
      where: canUseAgencyWorkspace(user)
        ? { id: jobId, agencyId: user.agencyId! }
        : { id: jobId, userId: user.id, agencyId: null },
      select: { id: true, agencyId: true, extractedData: { select: { id: true } } },
    });

    if (!job) {
      return apiError("JOB_NOT_FOUND", "Passport extraction job not found", 404);
    }
    if (!job.extractedData) {
      return apiError("EXTRACTED_DATA_NOT_FOUND", "Passport data is not available yet", 404);
    }

    const updatedData = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.passportExtractedData.update({
        where: { jobId: job.id },
        data: {
          passportNumberEncrypted: encryptField(parsed.data.passportNumber),
          surnameEncrypted: encryptField(parsed.data.surname),
          givenNamesEncrypted: encryptField(parsed.data.givenNames),
          nationality: parsed.data.nationality,
          dateOfBirthEncrypted: encryptField(parsed.data.dateOfBirth),
          sex: parsed.data.sex,
          dateOfIssue: parsed.data.dateOfIssue ? asUtcDate(parsed.data.dateOfIssue) : null,
          dateOfExpiry: parsed.data.dateOfExpiry ? asUtcDate(parsed.data.dateOfExpiry) : null,
          placeOfBirthEncrypted: parsed.data.placeOfBirth
            ? encryptField(parsed.data.placeOfBirth)
            : null,
          mrzValid: parsed.data.mrzValid,
        },
      });

      await createAuditLog(transaction, {
        action: AuditAction.PASSPORT_DATA_UPDATED,
        entityType: "PassportExtractionJob",
        entityId: job.id,
        userId: user.id,
        agencyId: job.agencyId,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        metadata: { mrzValid: parsed.data.mrzValid },
      });

      return updated;
    });

    const response: PassportDataUpdateResponse = {
      success: true,
      message: "Passport data updated successfully",
      data: serializeExtractedData(updatedData),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[passport-data] failed to update job ${jobId}: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to update passport data", 500);
  }
}
