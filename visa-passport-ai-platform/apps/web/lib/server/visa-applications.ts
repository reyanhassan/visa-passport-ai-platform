import { getVisaRequirements, validateApplicationReadiness } from "@visa-platform/config";
import { decryptField } from "@visa-platform/config/security";
import {
  prisma,
  VisaApplicationStatus,
  type PassportExtractedData,
} from "@visa-platform/database";
import type {
  LinkedPassportExtraction,
  PassportExtractedFields,
  VisaApplicationDetail,
  VisaApplicationFormData,
  VisaDocumentChecklistItem,
} from "@visa-platform/types";
import { z } from "zod";

import type { SessionUser } from "@/lib/auth";
import { canUseAgencyWorkspace } from "@/lib/server/access-control";

export const applicationIdSchema = z.string().trim().min(1).max(64);

export const applicationStatusSchema = z.enum([
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

export const checklistItemSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(120),
    required: z.boolean(),
    status: z.enum(["missing", "uploaded", "not_applicable"]),
    notes: z.string().trim().max(500),
  })
  .strict();

export const formDataSchema = z
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

export type ApplicationRecord = {
  id: string;
  passportJobId: string | null;
  agencyClientId: string | null;
  destinationCountry: string;
  visaType: string;
  status: VisaApplicationStatus;
  formData: unknown;
  createdAt: Date;
  updatedAt: Date;
  agencyClient: {
    id: string;
    fullName: string;
  } | null;
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

export async function normalizeFormData(
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

export async function serializeApplication(
  application: ApplicationRecord,
): Promise<VisaApplicationDetail> {
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
    agencyClientId: application.agencyClientId,
    agencyClientName: application.agencyClient?.fullName ?? null,
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

function applicationAccessWhere(applicationId: string, user: SessionUser) {
  if (canUseAgencyWorkspace(user)) {
    return { id: applicationId, agencyId: user.agencyId! };
  }

  return { id: applicationId, userId: user.id, agencyId: null };
}

export async function findAccessibleApplication(applicationId: string, user: SessionUser) {
  return prisma.visaApplication.findFirst({
    where: applicationAccessWhere(applicationId, user),
    include: {
      agencyClient: { select: { id: true, fullName: true } },
      passportJob: { include: { extractedData: true } },
    },
  });
}

export async function findOwnedApplication(applicationId: string, userId: string) {
  return prisma.visaApplication.findFirst({
    where: { id: applicationId, userId },
    include: {
      agencyClient: { select: { id: true, fullName: true } },
      passportJob: { include: { extractedData: true } },
    },
  });
}
