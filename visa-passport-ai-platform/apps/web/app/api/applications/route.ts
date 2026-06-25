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
import { canUseAgencyWorkspace } from "@/lib/server/access-control";

const applicationSchema = z
  .object({
    destinationCountry: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase()),
    visaType: z.string().trim().min(1).max(120),
    passportJobId: z.string().uuid().optional(),
    agencyClientId: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

function serializeApplication(application: {
  id: string;
  passportJobId: string | null;
  agencyClientId: string | null;
  agencyClient: { fullName: string } | null;
  destinationCountry: string;
  visaType: string;
  status: VisaApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
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

  try {
    const applications = await prisma.visaApplication.findMany({
      where: canUseAgencyWorkspace(user)
        ? { agencyId: user.agencyId! }
        : { userId: user.id, agencyId: null },
      orderBy: { updatedAt: "desc" },
      include: { agencyClient: { select: { fullName: true } } },
    });
    const response: VisaApplicationsResponse = {
      success: true,
      applications: applications.map(serializeApplication),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[applications] list failed: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to load visa applications", 500);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const parsed = applicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid application details", 400);

  try {
    let agencyClientId: string | null = null;
    let agencyId: string | null = null;

    if (canUseAgencyWorkspace(user)) {
      if (!parsed.data.agencyClientId) {
        return apiError(
          "AGENCY_CLIENT_REQUIRED",
          "Agency applications must be linked to an agency client",
          400,
        );
      }

      const client = await prisma.agencyClient.findFirst({
        where: { id: parsed.data.agencyClientId, agencyId: user.agencyId! },
        select: { id: true },
      });
      if (!client) return apiError("AGENCY_CLIENT_NOT_FOUND", "Agency client not found", 404);

      agencyId = user.agencyId!;
      agencyClientId = client.id;
    } else if (parsed.data.agencyClientId) {
      return apiError("AGENCY_REQUIRED", "Agency client applications require agency access", 403);
    }

    if (parsed.data.passportJobId) {
      const passportJob = await prisma.passportExtractionJob.findFirst({
        where: agencyId
          ? { id: parsed.data.passportJobId, agencyId, agencyClientId }
          : { id: parsed.data.passportJobId, userId: user.id, agencyId: null },
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
          agencyId,
          agencyClientId,
          passportJobId: parsed.data.passportJobId ?? null,
          destinationCountry: parsed.data.destinationCountry,
          visaType: parsed.data.visaType,
          status: VisaApplicationStatus.DRAFT,
          formData: initialFormData as unknown as Prisma.InputJsonValue,
        },
        include: { agencyClient: { select: { fullName: true } } },
      });
      await createAuditLog(transaction, {
        action: AuditAction.VISA_APPLICATION_CREATED,
        entityType: "VisaApplication",
        entityId: created.id,
        userId: user.id,
        agencyId,
        metadata: {
          destinationCountry: created.destinationCountry,
          visaType: created.visaType,
          passportJobId: created.passportJobId,
          agencyClientId: created.agencyClientId,
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
