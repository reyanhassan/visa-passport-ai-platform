import { sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AuditAction,
  createAuditLog,
  Prisma,
  prisma,
} from "@visa-platform/database";
import type { DeleteVisaApplicationDocumentResponse } from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import { getStorageProvider } from "@/lib/server/storage";
import {
  applicationIdSchema,
  findAccessibleApplication,
  normalizeFormData,
  serializeApplication,
} from "@/lib/server/visa-applications";

type RouteContext = {
  params: Promise<{ applicationId: string; documentId: string }>;
};

const documentIdSchema = z.string().trim().min(1).max(64);

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const { applicationId, documentId } = await context.params;
  if (
    !applicationIdSchema.safeParse(applicationId).success
    || !documentIdSchema.safeParse(documentId).success
  ) {
    return apiError("VALIDATION_ERROR", "Invalid application or document ID", 400);
  }

  try {
    const existing = await findAccessibleApplication(applicationId, user);
    if (!existing) {
      return apiError("APPLICATION_NOT_FOUND", "Visa application not found", 404);
    }

    const document = await prisma.visaApplicationDocument.findFirst({
      where: { id: documentId, applicationId: existing.id },
    });
    if (!document) {
      return apiError("DOCUMENT_NOT_FOUND", "Application document was not found", 404);
    }

    try {
      await getStorageProvider().deleteObject({ key: document.objectKey });
    } catch (error) {
      console.error(`[application-documents] storage delete failed: ${sanitizeLogMessage(error)}`);
      return apiError("STORAGE_DELETE_FAILED", "Unable to delete stored document", 500);
    }

    const normalizedFormData = await normalizeFormData(
      existing.formData,
      existing.destinationCountry,
      existing.visaType,
    );

    await prisma.$transaction(async (transaction) => {
      await transaction.visaApplicationDocument.delete({ where: { id: document.id } });
      const remainingForChecklistItem = await transaction.visaApplicationDocument.count({
        where: {
          applicationId: existing.id,
          checklistItemId: document.checklistItemId,
        },
      });

      if (remainingForChecklistItem === 0) {
        const updatedFormData = {
          ...normalizedFormData,
          documents: normalizedFormData.documents.map((item) =>
            item.id === document.checklistItemId ? { ...item, status: "missing" as const } : item,
          ),
        };

        await transaction.visaApplication.update({
          where: { id: existing.id },
          data: { formData: updatedFormData as unknown as Prisma.InputJsonValue },
        });
      }

      await createAuditLog(transaction, {
        action: AuditAction.VISA_DOCUMENT_DELETED,
        entityType: "VisaApplicationDocument",
        entityId: document.id,
        userId: user.id,
        agencyId: user.agencyId,
        metadata: {
          applicationId: existing.id,
          checklistItemId: document.checklistItemId,
          contentType: document.contentType,
          size: document.size,
        },
      });
    });

    const updated = await findAccessibleApplication(existing.id, user);
    if (!updated) throw new Error("Updated visa application was not found");

    const response: DeleteVisaApplicationDocumentResponse = {
      success: true,
      application: await serializeApplication(updated),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[application-documents] failed to delete ${documentId}: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to delete application document", 500);
  }
}
