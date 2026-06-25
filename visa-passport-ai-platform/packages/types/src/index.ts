export type DocumentKind = "passport" | "visa" | "supporting_document";

export type ExtractionStatus =
  | "received"
  | "processing"
  | "needs_review"
  | "completed"
  | "failed";

export type PassportExtractionJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface CreatePassportExtractionRequest {
  documentType: "passport";
  countryHint?: string;
  imageUrl?: string;
  objectKey?: string;
  agencyClientId?: string;
}

export type CreatePassportExtractionResponse =
  | {
      success: true;
      jobId: string;
      status: "PENDING";
      message: "Passport extraction job created successfully";
    }
  | {
      success: true;
      jobId: string;
      status: "COMPLETED";
      message:
        | "Passport extraction completed using mock mode"
        | "Passport extraction completed using local development fallback";
    };

export interface PassportExtractionQueuePayload {
  jobId: string;
  userId: string | null;
  agencyId: string | null;
  agencyClientId?: string | null;
  documentType: "passport";
  countryHint?: string;
  objectKey?: string;
  imageUrl?: string;
  requestedAt: string;
}

export interface PassportExtractionWorkerResult {
  jobId: string;
  status: "COMPLETED" | "ALREADY_COMPLETED";
}

export interface PassportExtractedFields {
  passportNumber: string;
  surname: string;
  givenNames: string;
  nationality: string;
  dateOfBirth: string;
  sex: string | null;
  dateOfIssue: string | null;
  dateOfExpiry: string | null;
  placeOfBirth: string | null;
  mrzValid: boolean;
}

export interface PassportExtractionJob {
  id: string;
  status: PassportExtractionJobStatus;
  agencyClientId?: string | null;
  agencyClientName?: string | null;
  confidence: number | null;
  countryHint: string | null;
  createdAt: string;
  errorMessage?: string | null;
  extractedData?: PassportExtractedFields;
}

export interface PassportExtractionJobResponse {
  success: true;
  job: PassportExtractionJob;
}

export interface PassportDataUpdateResponse {
  success: true;
  message: "Passport data updated successfully";
  data: PassportExtractedFields;
}

export interface UploadPassportResponse {
  success: true;
  objectKey: string;
  contentType: string;
  size: number;
}

export interface RecentPassportExtraction {
  id: string;
  documentType: string;
  agencyClientId?: string | null;
  agencyClientName?: string | null;
  countryHint: string | null;
  maskedPassportNumber: string | null;
  status: PassportExtractionJobStatus;
  confidence: number | null;
  createdAt: string;
}

export interface RecentPassportExtractionsResponse {
  success: true;
  jobs: RecentPassportExtraction[];
}

export type VisaApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type VisaDocumentChecklistStatus = "missing" | "uploaded" | "not_applicable";

export interface VisaDocumentChecklistItem {
  id: string;
  label: string;
  required: boolean;
  status: VisaDocumentChecklistStatus;
  notes: string;
}

export interface VisaApplicationFormData {
  purposeOfTravel: string;
  intendedArrivalDate: string | null;
  intendedDepartureDate: string | null;
  accommodationAddress: string;
  sponsorName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  documents: VisaDocumentChecklistItem[];
}

export interface LinkedPassportExtraction {
  id: string;
  status: PassportExtractionJobStatus;
  countryHint: string | null;
  createdAt: string;
  extractedData: PassportExtractedFields | null;
}

export interface VisaApplicationSummary {
  id: string;
  passportJobId: string | null;
  agencyClientId?: string | null;
  agencyClientName?: string | null;
  destinationCountry: string;
  visaType: string;
  status: VisaApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VisaApplicationsResponse {
  success: true;
  applications: VisaApplicationSummary[];
}

export interface CreateVisaApplicationResponse {
  success: true;
  application: VisaApplicationSummary;
}

export interface VisaApplicationDetail extends VisaApplicationSummary {
  passportJob: LinkedPassportExtraction | null;
  formData: VisaApplicationFormData;
  checklist: VisaDocumentChecklistItem[];
  readiness: VisaApplicationReadiness;
}

export interface VisaApplicationReadiness {
  readinessScore: number;
  isReady: boolean;
  missingFields: string[];
  missingDocuments: string[];
  warnings: string[];
}

export interface VisaApplicationDetailResponse {
  success: true;
  application: VisaApplicationDetail;
}

export interface VisaApplicationDocumentSummary {
  id: string;
  applicationId: string;
  checklistItemId: string;
  label: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  signedReadUrl?: string;
}

export interface VisaApplicationDocumentsResponse {
  success: true;
  documents: VisaApplicationDocumentSummary[];
}

export interface UploadVisaApplicationDocumentResponse {
  success: true;
  document: VisaApplicationDocumentSummary;
  application: VisaApplicationDetail;
}

export interface DeleteVisaApplicationDocumentResponse {
  success: true;
  application: VisaApplicationDetail;
}

export interface SignedStorageUrlResponse {
  success: true;
  url: string;
  expiresInSeconds: number;
}

export interface AgencySummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

export interface AgencyResponse {
  success: true;
  agency: AgencySummary;
}

export interface AgencyClientSummary {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  activeCases: number;
  passportJobs: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyClientsResponse {
  success: true;
  clients: AgencyClientSummary[];
}

export interface AgencyClientResponse {
  success: true;
  client: AgencyClientSummary;
}

export interface AdminAuditLogSummary {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  agencyId: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AdminAuditLogsResponse {
  success: true;
  logs: AdminAuditLogSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface AdminAgenciesResponse {
  success: true;
  agencies: Array<AgencySummary & {
    usersCount: number;
    clientsCount: number;
    applicationsCount: number;
  }>;
}

export interface UpdateVisaApplicationRequest {
  destinationCountry?: string;
  visaType?: string;
  status?: VisaApplicationStatus;
  formData?: VisaApplicationFormData;
}

export interface StructuredApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PassportFields {
  documentNumber?: string;
  surname?: string;
  givenNames?: string;
  nationality?: string;
  dateOfBirth?: string;
  sex?: string;
  dateOfExpiry?: string;
  issuingCountry?: string;
}

export interface ExtractionResult {
  documentId: string;
  status: ExtractionStatus;
  fields: PassportFields;
  confidence: Record<keyof PassportFields, number | undefined>;
  warnings: string[];
}
