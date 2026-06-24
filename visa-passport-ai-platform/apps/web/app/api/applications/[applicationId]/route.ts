import { getVisaRequirements, validateApplicationReadiness } from "@visa-platform/config";
import { decryptField, sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AuditAction,
  createAuditLog,
  Prisma,
  prisma,
  VisaApplicationStatus,
  type PassportExtractedData,
} from "@visa-platform/database";
import type {
  LinkedPassportExtraction,
  PassportExtractedFields,
  VisaApplicationDetail,
  VisaApplicationDetailResponse,
  VisaApplicationFormData,
  VisaDocumentChecklistItem,
} from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";

const applicationIdSchema = z.string().trim().min(1).max(64);
const applicationStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const calendarDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isCalendarDate, "Invalid calendar date");

const checklistItemSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(120),
    required: z.boolean(),
    status: z.enum(["missing", "uploaded", "not_applicable"]),
    notes: z.string().trim().max(500),
  })
  .strict();

const formDataSchema = z
  .object({
    purposeOfTravel: z.string().trim().max(240),
    intendedArrivalDate: calendarDateSchema.nullable(),
    intendedDepartureDate: calendarDateSchema.nullable(),
    accommodationAddress: z.string().trim().max(500),
    sponsorName: z.string().trim().max(200),
    emergencyContactName: z.string().trim().max(200),
    emergencyContactPhone: z.string().trim().max(64),
    notes: z.string().trim().max(2_000),
    documents: z.array(checklistItemSchema).max(20),
  })
  .strict();

const updateApplicationSchema = z
  .object({
    destinationCountry: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    visaType: z.string().trim().min(1).max(120).optional(),
    status: applicationStatusSchema.optional(),
    formData: formDataSchema.optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one application field is required",
  });

type RouteContext = {
  params: Promise<{ applicationId: string }>;
};

type ApplicationRecord = {
  id: string;
  passportJobId: string | null;
  destinationCountry: string;
  visaType: string;
  status: VisaApplicationStatus;
  formData: unknown;
  createdAt: Date;
  updatedAt: Date;
  passportJob: {
    id: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    countryHint: string | null;
    createdAt: Date;
    extractedData: PassportExtractedData | null;
  } | null;
};

async function createChecklist(
  destinationCountry: string,
  visaType: string,
): Promise<VisaDocumentChecklistItem[]> {
  const requirements = await getVisaRequirements(destinationCountry, visaType);
  return requirements.requiredDocuments.map((document) => ({
    id: document.key,
    label: document.label,
    required: document.required,
    status: "missing",
    notes: "",
  }));
}

async function normalizeFormData(
  raw: unknown,
  destinationCountry: string,
  visaType: string,
): Promise<VisaApplicationFormData> {
  const defaults: VisaApplicationFormData = {
    purposeOfTravel: "",
    intendedArrivalDate: null,
    intendedDepartureDate: null,
    accommodationAddress: "",
    sponsorName: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
    documents: await createChecklist(destinationCountry, visaType),
  };
  const parsed = formDataSchema.safeParse(raw);
  if (!parsed.success) return defaults;

  const documentsById = new Map<string, (typeof parsed.data.documents)[number]>(
    parsed.data.documents.map((item) => [item.id, item]),
  );
  return {
    purposeOfTravel: parsed.data.purposeOfTravel,
    intendedArrivalDate: parsed.data.intendedArrivalDate,
    intendedDepartureDate: parsed.data.intendedDepartureDate,
    accommodationAddress: parsed.data.accommodationAddress,
    sponsorName: parsed.data.sponsorName,
    emergencyContactName: parsed.data.emergencyContactName,
    emergencyContactPhone: parsed.data.emergencyContactPhone,
    notes: parsed.data.notes,
    documents: defaults.documents.map((definition) => {
      const existing = documentsById.get(definition.id);
      return existing
        ? { ...definition, status: existing.status, notes: existing.notes }
        : definition;
    }),
  };
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

function serializePassportJob(
  passportJob: ApplicationRecord["passportJob"],
): LinkedPassportExtraction | null {
  if (!passportJob) return null;
  return {
    id: passportJob.id,
    status: passportJob.status,
    countryHint: passportJob.countryHint,
    createdAt: passportJob.createdAt.toISOString(),
    extractedData: passportJob.extractedData
      ? serializeExtractedData(passportJob.extractedData)
      : null,
  };
}

async function serializeApplication(application: ApplicationRecord): Promise<VisaApplicationDetail> {
  const formData = await normalizeFormData(
    application.formData,
    application.destinationCountry,
    application.visaType,
  );
  const passportJob = serializePassportJob(application.passportJob);
  const readiness = await validateApplicationReadiness(
    {
      destinationCountry: application.destinationCountry,
      visaType: application.visaType,
      formData,
    },
    passportJob?.extractedData,
  );
  return {
    id: application.id,
    passportJobId: application.passportJobId,
    destinationCountry: application.destinationCountry,
    visaType: application.visaType,
    status: application.status,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
    passportJob,
    formData,
    checklist: formData.documents,
    readiness,
  };
}

async function findOwnedApplication(applicationId: string, userId: string) {
  return prisma.visaApplication.findFirst({
    where: { id: applicationId, userId },
    include: { passportJob: { include: { extractedData: true } } },
  });
}

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const { applicationId } = await context.params;
  if (!applicationIdSchema.safeParse(applicationId).success) {
    return apiError("VALIDATION_ERROR", "Invalid application ID", 400);
  }

  try {
    const application = await findOwnedApplication(applicationId, user.id);
    if (!application) {
      return apiError("APPLICATION_NOT_FOUND", "Visa application not found", 404);
    }

    const response: VisaApplicationDetailResponse = {
      success: true,
      application: await serializeApplication(application),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[application-detail] failed to load ${applicationId}: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to retrieve visa application", 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const { applicationId } = await context.params;
  if (!applicationIdSchema.safeParse(applicationId).success) {
    return apiError("VALIDATION_ERROR", "Invalid application ID", 400);
  }

  const parsed = updateApplicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid application update", 400);
  }

  try {
    const existing = await findOwnedApplication(applicationId, user.id);
    if (!existing) {
      return apiError("APPLICATION_NOT_FOUND", "Visa application not found", 404);
    }

    const destinationCountry = parsed.data.destinationCountry ?? existing.destinationCountry;
    const visaType = parsed.data.visaType ?? existing.visaType;
    const formData = await normalizeFormData(
      parsed.data.formData ?? existing.formData,
      destinationCountry,
      visaType,
    );
    const updatedApplicationId = await prisma.$transaction(async (transaction) => {
      const application = await transaction.visaApplication.update({
        where: { id: existing.id },
        data: {
          destinationCountry,
          visaType,
          status: parsed.data.status ?? existing.status,
          formData: formData as unknown as Prisma.InputJsonValue,
        },
      });

      await createAuditLog(transaction, {
        action: AuditAction.VISA_APPLICATION_UPDATED,
        entityType: "VisaApplication",
        entityId: application.id,
        userId: user.id,
        agencyId: user.agencyId,
        metadata: {
          updatedFields: Object.keys(parsed.data),
          destinationCountry: application.destinationCountry,
          status: application.status,
        },
      });

      return application.id;
    });

    const updated = await findOwnedApplication(updatedApplicationId, user.id);
    if (!updated) {
      throw new Error("Updated visa application was not found");
    }

    const response: VisaApplicationDetailResponse = {
      success: true,
      application: await serializeApplication(updated),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[application-detail] failed to update ${applicationId}: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to update visa application", 500);
  }
}
