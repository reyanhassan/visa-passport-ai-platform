import { encryptField } from "@visa-platform/config/security";
import {
  AuditAction,
  createAuditLog,
  ExtractionJobStatus,
  prisma,
} from "@visa-platform/database";

const MOCK_CONFIDENCE = 0.92;

const mockPassportData = {
  passportNumber: "AB1234567",
  surname: "HASSAN",
  givenNames: "REYAN",
  nationality: "PAK",
  dateOfBirth: "2001-01-01",
  sex: "M",
  dateOfIssue: "2022-01-01",
  dateOfExpiry: "2032-01-01",
  placeOfBirth: "LAHORE",
  mrzValid: true,
  mrzRaw: "P<PAKHASSAN<<REYAN<<<<<<<<<<<<<<<<<<<<<<",
} as const;

function asUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Completes a passport job without Redis for local development only. */
export async function completeMockPassportExtraction(jobId: string, userId: string) {
  return prisma.$transaction(async (transaction) => {
    const job = await transaction.passportExtractionJob.findFirst({
      where: { id: jobId, userId },
      select: { id: true, agencyId: true },
    });

    if (!job) {
      throw new Error("Passport extraction job was not found");
    }

    const extractedData = {
      passportNumberEncrypted: encryptField(mockPassportData.passportNumber),
      surnameEncrypted: encryptField(mockPassportData.surname),
      givenNamesEncrypted: encryptField(mockPassportData.givenNames),
      nationality: mockPassportData.nationality,
      dateOfBirthEncrypted: encryptField(mockPassportData.dateOfBirth),
      sex: mockPassportData.sex,
      dateOfIssue: asUtcDate(mockPassportData.dateOfIssue),
      dateOfExpiry: asUtcDate(mockPassportData.dateOfExpiry),
      placeOfBirthEncrypted: encryptField(mockPassportData.placeOfBirth),
      mrzRawEncrypted: encryptField(mockPassportData.mrzRaw),
      mrzValid: mockPassportData.mrzValid,
    };

    await transaction.passportExtractedData.upsert({
      where: { jobId: job.id },
      create: { jobId: job.id, ...extractedData },
      update: extractedData,
    });

    const completedJob = await transaction.passportExtractionJob.update({
      where: { id: job.id },
      data: {
        status: ExtractionJobStatus.COMPLETED,
        confidence: MOCK_CONFIDENCE,
        errorMessage: null,
      },
    });

    await createAuditLog(transaction, {
      action: AuditAction.PASSPORT_OCR_COMPLETED,
      entityType: "PassportExtractionJob",
      entityId: job.id,
      userId,
      agencyId: job.agencyId,
      metadata: {
        confidence: MOCK_CONFIDENCE,
        mrzValid: mockPassportData.mrzValid,
        source: "development_mock_fallback",
      },
    });

    return completedJob;
  });
}
