import { sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AuditAction,
  createAuditLog,
  Prisma,
  prisma,
} from "@visa-platform/database";
import type { VisaApplicationDetailResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import {
  applicationIdSchema,
  applicationStatusSchema,
  findAccessibleApplication,
  formDataSchema,
  normalizeFormData,
  serializeApplication,
} from "@/lib/server/visa-applications";

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

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const { applicationId } = await context.params;
  if (!applicationIdSchema.safeParse(applicationId).success) {
    return apiError("VALIDATION_ERROR", "Invalid application ID", 400);
  }

  try {
    const application = await findAccessibleApplication(applicationId, user);
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
    const existing = await findAccessibleApplication(applicationId, user);
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

    const updated = await findAccessibleApplication(updatedApplicationId, user);
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
