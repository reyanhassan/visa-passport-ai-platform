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
import { loadWebDeploymentConfig } from "@/lib/server/deployment-config";
import { completeMockPassportExtraction } from "@/lib/server/mock-passport-extraction";
import {
  getPassportExtractionQueue,
  resetPassportExtractionQueue,
} from "@/lib/server/passport-extraction-queue";
import { getCurrentUser } from "@/lib/auth";
import { objectKeyBelongsToUser } from "@/lib/server/storage";
import { canUseAgencyWorkspace } from "@/lib/server/access-control";

const passportObjectKeyPattern =
  /^users\/[^/]+\/passports\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp|pdf)$/i;
const legacyPassportObjectKeyPattern =
  /^uploads\/passports\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|pdf)$/i;
const safePassportFilenamePattern =
  /^[a-z0-9][a-z0-9_-]*\.(?:jpg|jpeg|png|webp|pdf)$/i;

function isValidObjectKey(value: string): boolean {
  return passportObjectKeyPattern.test(value);
}

function isValidImageUrl(value: string): boolean {
  if (value.startsWith("/")) return legacyPassportObjectKeyPattern.test(value.slice(1));
  const mockPrefix = "mock://uploads/passports/";
  if (value.startsWith(mockPrefix)) {
    return safePassportFilenamePattern.test(value.slice(mockPrefix.length));
  }
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.includes("..")) return false;
    const filename = decodedPath.split("/").pop();
    return Boolean(filename && safePassportFilenamePattern.test(filename));
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
      .refine(isValidObjectKey)
      .optional(),
    agencyClientId: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.imageUrl || value.objectKey));

async function enqueueWithTimeout(
  payload: PassportExtractionQueuePayload,
  jobId: string,
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      getPassportExtractionQueue().add("extract-passport", payload, { jobId }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Passport extraction queue enqueue timed out")),
          5_000,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

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

  if (
    parsed.data.objectKey
    && !objectKeyBelongsToUser(parsed.data.objectKey, user.id)
  ) {
    return apiError("FORBIDDEN_OBJECT_KEY", "Passport object does not belong to this user", 403);
  }

  let agencyId: string | null = null;
  let agencyClientId: string | null = null;

  if (parsed.data.agencyClientId) {
    if (!canUseAgencyWorkspace(user)) {
      return apiError("AGENCY_REQUIRED", "Agency client extraction requires agency access", 403);
    }

    const client = await prisma.agencyClient.findFirst({
      where: { id: parsed.data.agencyClientId, agencyId: user.agencyId! },
      select: { id: true },
    });
    if (!client) return apiError("AGENCY_CLIENT_NOT_FOUND", "Agency client not found", 404);

    agencyId = user.agencyId!;
    agencyClientId = client.id;
  } else if (canUseAgencyWorkspace(user)) {
    agencyId = user.agencyId!;
  }

  let extractionMode: "queue" | "mock";
  try {
    ({ extractionMode } = loadWebDeploymentConfig());
  } catch (error) {
    console.error("[passport-extract] invalid deployment configuration", error);
    return apiError("CONFIGURATION_ERROR", "Passport extraction is not configured correctly", 500);
  }

  let job: Awaited<ReturnType<typeof prisma.passportExtractionJob.create>>;
  const imageReference = parsed.data.objectKey ?? parsed.data.imageUrl!;

  try {
    job = await prisma.$transaction(async (transaction) => {
      const createdJob = await transaction.passportExtractionJob.create({
        data: {
          userId: user.id,
          agencyId,
          agencyClientId,
          status: ExtractionJobStatus.PENDING,
          documentType: parsed.data.documentType,
          countryHint: parsed.data.countryHint,
          imageObjectKey: imageReference,
        },
      });

      await createAuditLog(transaction, {
        action: AuditAction.PASSPORT_EXTRACTION_CREATED,
        entityType: "PassportExtractionJob",
        entityId: createdJob.id,
        userId: user.id,
        agencyId,
        metadata: {
          documentType: createdJob.documentType,
          countryHint: createdJob.countryHint,
          agencyClientId: createdJob.agencyClientId,
        },
      });

      return createdJob;
    });
  } catch (error) {
    resetPassportExtractionQueue();
    console.error(
      `[passport-extract] failed to create database job: ${sanitizeLogMessage(error)}`,
    );
    return apiError("DATABASE_ERROR", "Unable to create passport extraction job", 500);
  }

  if (extractionMode === "mock") {
    try {
      await completeMockPassportExtraction(job.id, user.id, "mock_mode");

      const response: CreatePassportExtractionResponse = {
        success: true,
        jobId: job.id,
        status: "COMPLETED",
        message: "Passport extraction completed using mock mode",
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error(
        `[passport-extract] mock extraction failed for job ${job.id}: ${sanitizeLogMessage(error)}`,
      );
      return apiError("MOCK_EXTRACTION_FAILED", "Unable to complete mock passport extraction", 500);
    }
  }

  const queuePayload: PassportExtractionQueuePayload = {
    jobId: job.id,
    userId: user.id,
    agencyId,
    agencyClientId,
    documentType: "passport",
    countryHint: parsed.data.countryHint,
    objectKey: parsed.data.objectKey,
    imageUrl: parsed.data.imageUrl,
    requestedAt: job.createdAt.toISOString(),
  };

  try {
    await enqueueWithTimeout(queuePayload, job.id);
  } catch (error) {
    console.error(
      `[passport-extract] failed to enqueue job ${job.id}: ${sanitizeLogMessage(error)}`,
    );

    if (process.env.NODE_ENV === "development") {
      try {
        await completeMockPassportExtraction(job.id, user.id, "development_queue_fallback");
        console.warn(
          "Redis unavailable. Completed passport extraction using development mock fallback.",
        );

        const response: CreatePassportExtractionResponse = {
          success: true,
          jobId: job.id,
          status: "COMPLETED",
          message: "Passport extraction completed using local development fallback",
        };

        return NextResponse.json(response);
      } catch (fallbackError) {
        console.error(
          `[passport-extract] development fallback failed for job ${job.id}: ${sanitizeLogMessage(fallbackError)}`,
        );
        return apiError(
          "FALLBACK_FAILED",
          "Unable to complete passport extraction using the development fallback",
          500,
        );
      }
    }

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
