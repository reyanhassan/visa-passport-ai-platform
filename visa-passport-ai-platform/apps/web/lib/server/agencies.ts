import { AgencyStatus, VisaApplicationStatus, type Agency } from "@visa-platform/database";
import type { AgencyClientSummary, AgencySummary } from "@visa-platform/types";

export function serializeAgency(agency: Agency): AgencySummary {
  return {
    id: agency.id,
    name: agency.name,
    email: agency.email,
    phone: agency.phone,
    country: agency.country,
    city: agency.city,
    status: agency.status,
    createdAt: agency.createdAt.toISOString(),
    updatedAt: agency.updatedAt.toISOString(),
  };
}

export type AgencyClientRecord = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    visaApplications?: number;
    extractionJobs?: number;
  };
};

export function serializeAgencyClient(client: AgencyClientRecord): AgencyClientSummary {
  return {
    id: client.id,
    fullName: client.fullName,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    activeCases: client._count?.visaApplications ?? 0,
    passportJobs: client._count?.extractionJobs ?? 0,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

export const agencyStatusSchemaValues = [
  AgencyStatus.PENDING,
  AgencyStatus.ACTIVE,
  AgencyStatus.SUSPENDED,
] as const;

export const activeVisaStatuses = [
  VisaApplicationStatus.DRAFT,
  VisaApplicationStatus.SUBMITTED,
  VisaApplicationStatus.IN_REVIEW,
] as const;
