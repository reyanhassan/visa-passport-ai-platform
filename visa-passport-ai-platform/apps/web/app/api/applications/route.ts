import { getVisaRequirements } from "@visa-platform/config";
import { sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AuditAction,
  createAuditLog,
  Prisma,
  prisma,
  VisaApplicationStatus,
} from "@visa-platform/database";
import type { VisaApplicationFormData, VisaApplicationsResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";

const applicationSchema = z
  .object({
    destinationCountry: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase()),
    visaType: z.string().trim().min(1).max(120),
    passportJobId: z.string().uuid().optional(),
  })
  .strict();

function serializeApplication(application: {
  id: string;
  passportJobId: string | null;
  destinationCountry: string;
  visaType: string;
  status: VisaApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: application.id,
    passportJobId: application.passportJobId,
    destinationCountry: application.destinationCountry,
    visaType: application.visaType,
    status: application.status,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

async function createInitialFormData(
  destinationCountry: string,
  visaType: string,
): Promise<VisaApplicationFormData> {
  const requirements = await getVisaRequirements(destinationCountry, visaType);
  return {
    purposeOfTravel: "",
    intendedArrivalDate: null,
    intendedDepartureDate: null,
    accommodationAddress: "",
    sponsorName: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
    documents: requirements.requiredDocuments.map((document) => ({
      id: document.key,
      label: document.label,
      required: document.required,
      status: "missing" as const,
      notes: "",
    })),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const applications = await prisma.visaApplication.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  const response: VisaApplicationsResponse = {
    success: true,
    applications: applications.map(serializeApplication),
  };
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const parsed = applicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid application details", 400);

  try {
    if (parsed.data.passportJobId) {
      const passportJob = await prisma.passportExtractionJob.findFirst({
        where: { id: parsed.data.passportJobId, userId: user.id },
        select: { id: true },
      });

      if (!passportJob) {
        return apiError("PASSPORT_JOB_NOT_FOUND", "Passport extraction job not found", 404);
      }
    }

    const initialFormData = await createInitialFormData(
      parsed.data.destinationCountry,
      parsed.data.visaType,
    );

    const application = await prisma.$transaction(async (transaction) => {
      const created = await transaction.visaApplication.create({
        data: {
          userId: user.id,
          agencyId: user.agencyId,
          passportJobId: parsed.data.passportJobId ?? null,
          destinationCountry: parsed.data.destinationCountry,
          visaType: parsed.data.visaType,
          status: VisaApplicationStatus.DRAFT,
          formData: initialFormData as unknown as Prisma.InputJsonValue,
        },
      });
      await createAuditLog(transaction, {
        action: AuditAction.VISA_APPLICATION_CREATED,
        entityType: "VisaApplication",
        entityId: created.id,
        userId: user.id,
        agencyId: user.agencyId,
        metadata: {
          destinationCountry: created.destinationCountry,
          visaType: created.visaType,
          passportJobId: created.passportJobId,
          status: created.status,
        },
      });
      return created;
    });

    return NextResponse.json(
      { success: true, application: serializeApplication(application) },
      { status: 201 },
    );
  } catch (error) {
    console.error(`[applications] create failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to create visa application", 500);
  }
}
