import { randomUUID } from "node:crypto";

import { sanitizeLogMessage } from "@visa-platform/config/security";
import {
  AuditAction,
  createAuditLog,
  Prisma,
  prisma,
} from "@visa-platform/database";
import type {
  UploadVisaApplicationDocumentResponse,
  VisaApplicationDocumentsResponse,
  VisaApplicationDocumentSummary,
} from "@visa-platform/types";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/server/api-error";
import {
  getMaxUploadSizeBytes,
  getSignedUrlExpiresSeconds,
  getStorageProvider,
} from "@/lib/server/storage";
import {
  applicationIdSchema,
  findAccessibleApplication,
  normalizeFormData,
  serializeApplication,
} from "@/lib/server/visa-applications";

type RouteContext = {
  params: Promise<{ applicationId: string }>;
};

type DocumentRecord = {
  id: string;
  applicationId: string;
  checklistItemId: string;
  label: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
};

const checklistItemIdSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/i);
const labelSchema = z.string().trim().min(1).max(120);
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function sanitizeFileName(value: string, fallbackExtension: string): string {
  const candidate = value
    .split(/[\\/]/)
    .pop()
    ?.trim()
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 255);
  return candidate || `document.${fallbackExtension}`;
}

async function serializeDocument(
  document: DocumentRecord,
  includeUrl: boolean,
): Promise<VisaApplicationDocumentSummary> {
  const signedReadUrl = includeUrl
    ? await getStorageProvider().getSignedReadUrl({
      key: document.objectKey,
      expiresInSeconds: getSignedUrlExpiresSeconds(),
    })
    : undefined;

  return {
    id: document.id,
    applicationId: document.applicationId,
    checklistItemId: document.checklistItemId,
    label: document.label,
    objectKey: document.objectKey,
    fileName: document.fileName,
    contentType: document.contentType,
    size: document.size,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    ...(signedReadUrl ? { signedReadUrl } : {}),
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const { applicationId } = await context.params;
  if (!applicationIdSchema.safeParse(applicationId).success) {
    return apiError("VALIDATION_ERROR", "Invalid application ID", 400);
  }

  const includeUrls = new URL(request.url).searchParams.get("includeUrls") === "true";

  try {
    const application = await findAccessibleApplication(applicationId, user);
    if (!application) {
      return apiError("APPLICATION_NOT_FOUND", "Visa application not found", 404);
    }

    const documents = await prisma.visaApplicationDocument.findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: "desc" },
    });

    const response: VisaApplicationDocumentsResponse = {
      success: true,
      documents: await Promise.all(
        documents.map((document) => serializeDocument(document, includeUrls)),
      ),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[application-documents] failed to list ${applicationId}: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to list application documents", 500);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHENTICATED", "Authentication required", 401);

  const { applicationId } = await context.params;
  if (!applicationIdSchema.safeParse(applicationId).success) {
    return apiError("VALIDATION_ERROR", "Invalid application ID", 400);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const checklistItemId = checklistItemIdSchema.safeParse(formData?.get("checklistItemId"));
  const label = labelSchema.safeParse(formData?.get("label"));
  if (!(file instanceof File) || !checklistItemId.success || !label.success) {
    return apiError("VALIDATION_ERROR", "File, checklist item, and label are required", 400);
  }

  const extension = extensionByMimeType[file.type];
  if (!extension) return apiError("UNSUPPORTED_FILE_TYPE", "Use a PDF, JPG, PNG, or WebP file", 415);

  const maxUploadSizeBytes = getMaxUploadSizeBytes();
  if (file.size === 0 || file.size > maxUploadSizeBytes) {
    return apiError(
      "FILE_SIZE_INVALID",
      `Document file must be between 1 byte and ${Math.floor(maxUploadSizeBytes / 1024 / 1024)} MB`,
      413,
    );
  }

  try {
    const existing = await findAccessibleApplication(applicationId, user);
    if (!existing) {
      return apiError("APPLICATION_NOT_FOUND", "Visa application not found", 404);
    }

    const normalizedFormData = await normalizeFormData(
      existing.formData,
      existing.destinationCountry,
      existing.visaType,
    );
    const checklistItem = normalizedFormData.documents.find((item) => item.id === checklistItemId.data);
    if (!checklistItem) {
      return apiError("CHECKLIST_ITEM_NOT_FOUND", "Checklist item was not found", 404);
    }

    const objectKey = `users/${user.id}/applications/${existing.id}/documents/${checklistItem.id}/${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorageProvider();

    try {
      await storage.uploadObject({
        key: objectKey,
        buffer,
        contentType: file.type,
        metadata: {
          userId: user.id,
          applicationId: existing.id,
          checklistItemId: checklistItem.id,
        },
      });
    } catch (error) {
      console.error(`[application-documents] storage upload failed: ${sanitizeLogMessage(error)}`);
      return apiError("STORAGE_UPLOAD_FAILED", "Unable to store application document", 500);
    }

    let document: DocumentRecord;
    try {
      document = await prisma.$transaction(async (transaction) => {
        const updatedFormData = {
          ...normalizedFormData,
          documents: normalizedFormData.documents.map((item) =>
            item.id === checklistItem.id ? { ...item, status: "uploaded" as const } : item,
          ),
        };

        const created = await transaction.visaApplicationDocument.create({
          data: {
            applicationId: existing.id,
            userId: user.id,
            checklistItemId: checklistItem.id,
            label: label.data || checklistItem.label,
            objectKey,
            fileName: sanitizeFileName(file.name, extension),
            contentType: file.type,
            size: buffer.byteLength,
          },
        });

        await transaction.visaApplication.update({
          where: { id: existing.id },
          data: { formData: updatedFormData as unknown as Prisma.InputJsonValue },
        });

        await createAuditLog(transaction, {
          action: AuditAction.VISA_DOCUMENT_UPLOADED,
          entityType: "VisaApplicationDocument",
          entityId: created.id,
          userId: user.id,
          agencyId: user.agencyId,
          metadata: {
            applicationId: existing.id,
            checklistItemId: checklistItem.id,
            contentType: file.type,
            size: buffer.byteLength,
          },
        });

        return created;
      });
    } catch (error) {
      await storage.deleteObject({ key: objectKey }).catch(() => undefined);
      console.error(`[application-documents] database upload failed: ${sanitizeLogMessage(error)}`);
      return apiError("DATABASE_ERROR", "Unable to save application document", 500);
    }

    const updated = await findAccessibleApplication(existing.id, user);
    if (!updated) throw new Error("Updated visa application was not found");

    const response: UploadVisaApplicationDocumentResponse = {
      success: true,
      document: await serializeDocument(document, false),
      application: await serializeApplication(updated),
    };
    return NextResponse.json(response, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[application-documents] failed to upload ${applicationId}: ${sanitizeLogMessage(error)}`);
    return apiError("DATABASE_ERROR", "Unable to upload application document", 500);
  }
}
