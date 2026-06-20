import { sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AuditAction,
  createAuditLog,
  ExtractionJobStatus,
  prisma,
} from "@visa-platform/database";
import type {
  CreatePassportExtractionResponse,
  PassportExtractionQueuePayload,
} from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/server/api-error";
import { getPassportExtractionQueue } from "@/lib/server/passport-extraction-queue";
import { getCurrentUser } from "@/lib/auth";

function isValidImageUrl(value: string): boolean {
  if (value.startsWith("/uploads/passports/") && !value.includes("..")) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const requestSchema = z
  .object({
    documentType: z.literal("passport"),
    countryHint: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2,3}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    imageUrl: z.string().trim().max(2_048).refine(isValidImageUrl).optional(),
    objectKey: z
      .string()
      .trim()
      .regex(/^uploads\/passports\/[a-f0-9-]+\.(?:jpg|png|webp|pdf)$/i)
      .optional(),
  })
  .strict()
  .refine((value) => Boolean(value.imageUrl || value.objectKey));

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid request body", 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid request body", 400);
  }

  let job: Awaited<ReturnType<typeof prisma.passportExtractionJob.create>>;
  const imageReference = parsed.data.objectKey ?? parsed.data.imageUrl!;

  try {
    job = await prisma.$transaction(async (transaction) => {
      const createdJob = await transaction.passportExtractionJob.create({
        data: {
          userId: user.id,
          agencyId: user.agencyId,
          status: ExtractionJobStatus.PENDING,
          documentType: parsed.data.documentType,
          countryHint: parsed.data.countryHint,
          // Temporary mock transport. Replace with an opaque private-storage key before real uploads.
          imageObjectKey: imageReference,
        },
      });

      await createAuditLog(transaction, {
        action: AuditAction.PASSPORT_EXTRACTION_CREATED,
        entityType: "PassportExtractionJob",
        entityId: createdJob.id,
        userId: user.id,
        agencyId: user.agencyId,
        metadata: {
          documentType: createdJob.documentType,
          countryHint: createdJob.countryHint,
        },
      });

      return createdJob;
    });
  } catch (error) {
    console.error(
      `[passport-extract] failed to create database job: ${sanitizeLogMessage(error)}`,
    );
    return apiError("DATABASE_ERROR", "Unable to create passport extraction job", 500);
  }

  const queuePayload: PassportExtractionQueuePayload = {
    jobId: job.id,
    userId: user.id,
    agencyId: user.agencyId,
    documentType: "passport",
    countryHint: parsed.data.countryHint,
    imageUrl: imageReference.startsWith("http")
      ? imageReference
      : new URL(`/${imageReference.replace(/^\//, "")}`, process.env.NEXT_PUBLIC_APP_URL ?? request.url).toString(),
    requestedAt: job.createdAt.toISOString(),
  };

  try {
    await getPassportExtractionQueue().add("extract-passport", queuePayload, {
      jobId: job.id,
    });
  } catch (error) {
    console.error(
      `[passport-extract] failed to enqueue job ${job.id}: ${sanitizeLogMessage(error)}`,
    );
    await prisma.passportExtractionJob
      .update({
        where: { id: job.id },
        data: {
          status: ExtractionJobStatus.FAILED,
          errorMessage: "The extraction queue was unavailable",
        },
      })
      .catch((updateError: unknown) => {
        console.error(
          `[passport-extract] failed to mark job ${job.id} as failed: ${sanitizeLogMessage(updateError)}`,
        );
      });

    return apiError("QUEUE_UNAVAILABLE", "Unable to queue passport extraction job", 503);
  }

  const response: CreatePassportExtractionResponse = {
    success: true,
    jobId: job.id,
    status: "PENDING",
    message: "Passport extraction job created successfully",
  };

  return NextResponse.json(response, { status: 202 });
}
