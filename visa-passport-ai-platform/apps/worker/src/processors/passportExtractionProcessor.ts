import {
  ExtractionJobStatus,
  prisma,
  type PassportExtractionJob,
} from "@visa-platform/database";
import type {
  PassportExtractionQueuePayload,
  PassportExtractionWorkerResult,
} from "@visa-platform/types";
import { UnrecoverableError, type Job } from "bullmq";

import { AuditAction, createAuditLog } from "../services/auditLog.js";
import { encryptField } from "../services/encryption.js";
import { OCRClient, type PassportOCRResult } from "../services/ocrClient.js";
import { maskError } from "../services/piiMasking.js";

const ocrClient = new OCRClient();

function parseDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

async function saveCompletedResult(
  extractionJob: PassportExtractionJob,
  result: PassportOCRResult,
) {
  await prisma.$transaction(async (transaction) => {
    const extractedData = {
      passportNumberEncrypted: encryptField(result.extracted_data.passport_number),
      surnameEncrypted: encryptField(result.extracted_data.surname),
      givenNamesEncrypted: encryptField(result.extracted_data.given_names),
      nationality: result.extracted_data.nationality,
      dateOfBirthEncrypted: encryptField(result.extracted_data.date_of_birth),
      sex: result.extracted_data.sex,
      dateOfIssue: parseDate(result.extracted_data.date_of_issue),
      dateOfExpiry: parseDate(result.extracted_data.date_of_expiry),
      placeOfBirthEncrypted: result.extracted_data.place_of_birth
        ? encryptField(result.extracted_data.place_of_birth)
        : null,
      mrzRawEncrypted: result.mrz.raw ? encryptField(result.mrz.raw) : null,
      mrzValid: result.mrz.valid,
    };

    await transaction.passportExtractedData.upsert({
      where: { jobId: extractionJob.id },
      create: { jobId: extractionJob.id, ...extractedData },
      update: extractedData,
    });

    await transaction.passportExtractionJob.update({
      where: { id: extractionJob.id },
      data: {
        status: ExtractionJobStatus.COMPLETED,
        confidence: result.confidence,
        errorMessage: null,
      },
    });

    await createAuditLog(transaction, {
      action: AuditAction.PASSPORT_OCR_COMPLETED,
      entityType: "PassportExtractionJob",
      entityId: extractionJob.id,
      userId: extractionJob.userId,
      agencyId: extractionJob.agencyId,
      metadata: {
        confidence: result.confidence,
        mrzValid: result.mrz.valid,
        warningCount: result.warnings.length,
      },
    });
  });
}

async function saveFailedResult(
  extractionJob: PassportExtractionJob,
  errorMessage: string,
  attempt: number,
) {
  await prisma.$transaction(async (transaction) => {
    await transaction.passportExtractionJob.update({
      where: { id: extractionJob.id },
      data: {
        status: ExtractionJobStatus.FAILED,
        errorMessage,
      },
    });

    await createAuditLog(transaction, {
      action: AuditAction.PASSPORT_OCR_FAILED,
      entityType: "PassportExtractionJob",
      entityId: extractionJob.id,
      userId: extractionJob.userId,
      agencyId: extractionJob.agencyId,
      metadata: { attempt },
    });
  });
}

export async function passportExtractionProcessor(
  queueJob: Job<PassportExtractionQueuePayload>,
): Promise<PassportExtractionWorkerResult> {
  const extractionJob = await prisma.passportExtractionJob.findUnique({
    where: { id: queueJob.data.jobId },
  });

  if (!extractionJob) {
    throw new UnrecoverableError("Passport extraction job was not found");
  }

  if (extractionJob.status === ExtractionJobStatus.COMPLETED) {
    return { jobId: extractionJob.id, status: "ALREADY_COMPLETED" };
  }

  try {
    if (!extractionJob.imageObjectKey || !queueJob.data.imageUrl) {
      throw new UnrecoverableError("Passport extraction job has no image reference");
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.passportExtractionJob.update({
        where: { id: extractionJob.id },
        data: {
          status: ExtractionJobStatus.PROCESSING,
          errorMessage: null,
        },
      });

      await createAuditLog(transaction, {
        action: AuditAction.PASSPORT_OCR_STARTED,
        entityType: "PassportExtractionJob",
        entityId: extractionJob.id,
        userId: extractionJob.userId,
        agencyId: extractionJob.agencyId,
        metadata: { attempt: queueJob.attemptsMade + 1 },
      });
    });

    // The queue carries the worker-ready URL while PostgreSQL retains the stable object key.
    // TODO: Resolve private object keys to short-lived signed URLs immediately before OCR calls.
    const result = await ocrClient.extractPassport({
      documentType: extractionJob.documentType,
      countryHint: extractionJob.countryHint,
      imageUrl: queueJob.data.imageUrl,
      jobId: extractionJob.id,
    });

    await saveCompletedResult(extractionJob, result);
    return { jobId: extractionJob.id, status: "COMPLETED" };
  } catch (error) {
    const safeErrorMessage = maskError(error);

    await saveFailedResult(extractionJob, safeErrorMessage, queueJob.attemptsMade + 1).catch(
      (persistenceError: unknown) => {
        console.error(
          `[worker] could not persist failure for job ${extractionJob.id}: ${maskError(persistenceError)}`,
        );
      },
    );

    if (error instanceof UnrecoverableError) throw error;
    throw new Error(safeErrorMessage);
  }
}
