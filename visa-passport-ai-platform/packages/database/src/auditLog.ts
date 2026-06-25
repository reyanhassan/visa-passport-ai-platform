import { sanitizeLogMessage, sanitizeMetadata } from "@visa-platform/config/security";
import type { Prisma } from "@prisma/client";

export const AuditAction = {
  PASSPORT_EXTRACTION_CREATED: "PASSPORT_EXTRACTION_CREATED",
  PASSPORT_OCR_STARTED: "PASSPORT_OCR_STARTED",
  PASSPORT_OCR_COMPLETED: "PASSPORT_OCR_COMPLETED",
  PASSPORT_OCR_FAILED: "PASSPORT_OCR_FAILED",
  PASSPORT_DATA_VIEWED: "PASSPORT_DATA_VIEWED",
  PASSPORT_DATA_UPDATED: "PASSPORT_DATA_UPDATED",
  VISA_APPLICATION_CREATED: "VISA_APPLICATION_CREATED",
  VISA_APPLICATION_UPDATED: "VISA_APPLICATION_UPDATED",
  VISA_DOCUMENT_UPLOADED: "VISA_DOCUMENT_UPLOADED",
  VISA_DOCUMENT_DELETED: "VISA_DOCUMENT_DELETED",
  AGENCY_CREATED: "AGENCY_CREATED",
  AGENCY_UPDATED: "AGENCY_UPDATED",
  AGENCY_CLIENT_CREATED: "AGENCY_CLIENT_CREATED",
  AGENCY_CLIENT_UPDATED: "AGENCY_CLIENT_UPDATED",
  AGENCY_CLIENT_DELETED: "AGENCY_CLIENT_DELETED",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
type AuditClient = Pick<Prisma.TransactionClient, "auditLog">;

export interface CreateAuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  userId?: string | null;
  agencyId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
}

/** Persists an audit event after recursively sanitizing its metadata. */
export function createAuditLog(client: AuditClient, input: CreateAuditLogInput) {
  return client.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      userId: input.userId ?? null,
      agencyId: input.agencyId ?? null,
      ipAddress: input.ipAddress ? sanitizeLogMessage(input.ipAddress).slice(0, 64) : null,
      userAgent: input.userAgent ? sanitizeLogMessage(input.userAgent).slice(0, 512) : null,
      metadata: sanitizeMetadata(input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
