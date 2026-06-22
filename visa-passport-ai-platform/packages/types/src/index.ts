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
      message: "Passport extraction completed using local development fallback";
    };

export interface PassportExtractionQueuePayload {
  jobId: string;
  userId: string | null;
  agencyId: string | null;
  documentType: "passport";
  countryHint?: string;
  imageUrl: string;
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

export interface UploadPassportResponse {
  success: true;
  imageUrl: string;
  objectKey: string;
}

export interface RecentPassportExtraction {
  id: string;
  documentType: string;
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

export interface VisaApplicationSummary {
  id: string;
  destinationCountry: string;
  visaType: string;
  status: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export interface VisaApplicationsResponse {
  success: true;
  applications: VisaApplicationSummary[];
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
