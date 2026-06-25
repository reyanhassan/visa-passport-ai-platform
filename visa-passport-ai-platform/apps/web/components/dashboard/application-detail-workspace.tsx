"use client";

import type {
  DeleteVisaApplicationDocumentResponse,
  SignedStorageUrlResponse,
  UploadVisaApplicationDocumentResponse,
  VisaApplicationDetail,
  VisaApplicationDetailResponse,
  VisaApplicationDocumentsResponse,
  VisaApplicationDocumentSummary,
  VisaApplicationFormData,
  VisaApplicationReadiness,
  VisaApplicationStatus,
  VisaDocumentChecklistItem,
  VisaDocumentChecklistStatus,
} from "@visa-platform/types";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, apiErrorMessage, apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const destinations = [
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["CA", "Canada"],
  ["SA", "Saudi Arabia"],
  ["TR", "Turkiye"],
  ["SG", "Singapore"],
] as const;

const countryNames = Object.fromEntries(destinations) as Record<string, string>;
const statusOptions: Array<[VisaApplicationStatus, string]> = [
  ["DRAFT", "Draft"],
  ["SUBMITTED", "Submitted"],
  ["IN_REVIEW", "In review"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
  ["CANCELLED", "Cancelled"],
];
const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;
const acceptedDocumentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function statusTone(status: VisaApplicationStatus) {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED" || status === "CANCELLED") return "danger" as const;
  if (status === "DRAFT") return "warning" as const;
  return "info" as const;
}

function maskPassportNumber(value: string): string {
  const compact = value.replace(/\s/g, "");
  if (compact.length <= 4) return "****";
  return `${compact.slice(0, 2)}****${compact.slice(-3)}`;
}

function progressItem(label: string, complete: boolean) {
  return { label, complete };
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function VisaReadinessCard({ readiness }: { readiness: VisaApplicationReadiness }) {
  const hasIssues = readiness.missingFields.length > 0
    || readiness.missingDocuments.length > 0
    || readiness.warnings.length > 0;

  return (
    <Card className="visa-readiness-card">
      <div className="visa-readiness-score">
        <div className={readiness.isReady ? "is-ready" : "needs-attention"}>
          <strong>{readiness.readinessScore}%</strong>
          <span>Readiness</span>
        </div>
        <div>
          <small>Visa readiness</small>
          <h2>{readiness.isReady ? "Ready to submit" : "Needs attention"}</h2>
          <p>{readiness.isReady ? "Required details and documents are complete." : "Resolve the items below before submission."}</p>
        </div>
        <Badge tone={readiness.isReady ? "success" : "warning"}>
          {readiness.isReady ? "Ready" : "Needs attention"}
        </Badge>
      </div>
      <div className="visa-readiness-bar">
        <span><i style={{ width: `${readiness.readinessScore}%` }} /></span>
      </div>
      {hasIssues && (
        <div className="visa-readiness-issues">
          {readiness.missingFields.length > 0 && (
            <div>
              <strong>Missing fields</strong>
              <ul>{readiness.missingFields.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          {readiness.missingDocuments.length > 0 && (
            <div>
              <strong>Missing documents</strong>
              <ul>{readiness.missingDocuments.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          {readiness.warnings.length > 0 && (
            <div>
              <strong>Warnings</strong>
              <ul>{readiness.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function ApplicationDetailWorkspace({ applicationId }: { applicationId: string }) {
  const [application, setApplication] = useState<VisaApplicationDetail | null>(null);
  const [destinationCountry, setDestinationCountry] = useState("AE");
  const [visaType, setVisaType] = useState("");
  const [status, setStatus] = useState<VisaApplicationStatus>("DRAFT");
  const [formData, setFormData] = useState<VisaApplicationFormData | null>(null);
  const [documents, setDocuments] = useState<VisaApplicationDocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [documentActionId, setDocumentActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const applyApplication = useCallback((nextApplication: VisaApplicationDetail) => {
    setApplication(nextApplication);
    setDestinationCountry(nextApplication.destinationCountry);
    setVisaType(nextApplication.visaType);
    setStatus(nextApplication.status);
    setFormData(nextApplication.formData);
  }, []);

  const loadApplication = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const [applicationResponse, documentsResponse] = await Promise.all([
        apiRequest<VisaApplicationDetailResponse>(`/api/applications/${applicationId}`),
        apiRequest<VisaApplicationDocumentsResponse>(`/api/applications/${applicationId}/documents`),
      ]);
      applyApplication(applicationResponse.application);
      setDocuments(documentsResponse.documents);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load this visa application."));
      setErrorCode(requestError instanceof ApiError ? requestError.code : null);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, applyApplication]);

  useEffect(() => {
    void Promise.resolve().then(loadApplication);
  }, [loadApplication]);

  const documentsByChecklistItem = useMemo(() => {
    const grouped = new Map<string, VisaApplicationDocumentSummary[]>();
    for (const document of documents) {
      const current = grouped.get(document.checklistItemId) ?? [];
      current.push(document);
      grouped.set(document.checklistItemId, current);
    }
    return grouped;
  }, [documents]);

  const hasUnsavedChanges = Boolean(
    application
      && formData
      && (
        application.destinationCountry !== destinationCountry
        || application.visaType !== visaType
        || application.status !== status
        || JSON.stringify(application.formData) !== JSON.stringify(formData)
      ),
  );

  const progress = useMemo(() => {
    if (!formData) return [];
    const requiredDocuments = formData.documents.filter((item) => item.required);
    const uploadedDocuments = requiredDocuments.filter((item) => item.status === "uploaded").length;
    return [
      progressItem(
        "Applicant information",
        Boolean(formData.emergencyContactName && formData.emergencyContactPhone),
      ),
      progressItem(
        "Travel information",
        Boolean(formData.purposeOfTravel && formData.intendedArrivalDate && formData.intendedDepartureDate),
      ),
      progressItem("Documents", uploadedDocuments === requiredDocuments.length),
      progressItem("Review", status !== "DRAFT"),
    ];
  }, [formData, status]);

  function clearSaveFeedback() {
    setError(null);
    setErrorCode(null);
    setSaveMessage(null);
  }

  function updateFormField<K extends Exclude<keyof VisaApplicationFormData, "documents">>(
    field: K,
    value: VisaApplicationFormData[K],
  ) {
    setFormData((current) => current ? { ...current, [field]: value } : current);
    clearSaveFeedback();
  }

  function updateChecklistItem(
    id: string,
    field: "status" | "notes",
    value: VisaDocumentChecklistStatus | string,
  ) {
    setFormData((current) => current ? {
      ...current,
      documents: current.documents.map((item) => item.id === id ? { ...item, [field]: value } : item),
    } : current);
    clearSaveFeedback();
  }

  async function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData) return;

    setIsSaving(true);
    setError(null);
    setErrorCode(null);
    setSaveMessage(null);
    try {
      const response = await apiRequest<VisaApplicationDetailResponse>(
        `/api/applications/${applicationId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ destinationCountry, visaType, status, formData }),
        },
      );
      applyApplication(response.application);
      setSaveMessage("Application saved");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to save this application. Please try again."));
      setErrorCode(requestError instanceof ApiError ? requestError.code : null);
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadDocument(
    item: VisaDocumentChecklistItem,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!acceptedDocumentTypes.has(file.type)) {
      setError("Use a PDF, JPG, PNG, or WebP file.");
      return;
    }
    if (file.size === 0 || file.size > MAX_DOCUMENT_SIZE) {
      setError("Document file must be between 1 byte and 15 MB.");
      return;
    }

    setDocumentActionId(`upload:${item.id}`);
    setError(null);
    setSaveMessage(null);
    try {
      const payload = new FormData();
      payload.set("file", file);
      payload.set("checklistItemId", item.id);
      payload.set("label", item.label);
      const response = await apiRequest<UploadVisaApplicationDocumentResponse>(
        `/api/applications/${applicationId}/documents`,
        { method: "POST", body: payload },
      );
      setDocuments((current) => [response.document, ...current]);
      applyApplication(response.application);
      setSaveMessage("Document uploaded");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to upload this document. Please try again."));
    } finally {
      setDocumentActionId(null);
    }
  }

  async function viewDocument(document: VisaApplicationDocumentSummary) {
    setDocumentActionId(`view:${document.id}`);
    setError(null);
    try {
      const response = await apiRequest<SignedStorageUrlResponse>("/api/storage/signed-url", {
        method: "POST",
        body: JSON.stringify({ objectKey: document.objectKey }),
      });
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to open this document. Please try again."));
    } finally {
      setDocumentActionId(null);
    }
  }

  async function deleteDocument(document: VisaApplicationDocumentSummary) {
    setDocumentActionId(`delete:${document.id}`);
    setError(null);
    setSaveMessage(null);
    try {
      const response = await apiRequest<DeleteVisaApplicationDocumentResponse>(
        `/api/applications/${applicationId}/documents/${document.id}`,
        { method: "DELETE" },
      );
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      applyApplication(response.application);
      setSaveMessage("Document deleted");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to delete this document. Please try again."));
    } finally {
      setDocumentActionId(null);
    }
  }

  function renderDocumentChecklistItem(item: VisaDocumentChecklistItem) {
    const itemDocuments = documentsByChecklistItem.get(item.id) ?? [];
    const isUploading = documentActionId === `upload:${item.id}`;

    return (
      <div className="document-checklist-item" key={item.id}>
        <div className="document-checklist-main">
          <div>
            <strong>{item.label}</strong>
            <small>{item.required ? "Required document" : "Optional document"}</small>
          </div>
          <label className={`document-upload-button${isUploading ? " is-busy" : ""}`}>
            <input
              className="sr-only"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              disabled={isSaving || Boolean(documentActionId)}
              onChange={(event) => void uploadDocument(item, event)}
            />
            {isUploading ? <span className="button-spinner dark" /> : <Icon name="upload" />}
            {isUploading ? "Uploading" : "Upload"}
          </label>
        </div>
        <label>
          Status
          <select
            className="form-select"
            value={item.status}
            onChange={(event) => updateChecklistItem(item.id, "status", event.target.value as VisaDocumentChecklistStatus)}
            disabled={isSaving}
          >
            <option value="missing">Missing</option>
            <option value="uploaded">Uploaded</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </label>
        <label>
          Notes
          <Input
            value={item.notes}
            onChange={(event) => updateChecklistItem(item.id, "notes", event.target.value)}
            maxLength={500}
            disabled={isSaving}
          />
        </label>
        {itemDocuments.length > 0 && (
          <div className="document-file-list">
            {itemDocuments.map((document) => (
              <div className="document-file-row" key={document.id}>
                <span><Icon name="file" /></span>
                <div>
                  <strong>{document.fileName}</strong>
                  <small>{formatFileSize(document.size)} uploaded {formatDate(document.createdAt)}</small>
                </div>
                <button
                  type="button"
                  className="document-file-action"
                  onClick={() => void viewDocument(document)}
                  disabled={Boolean(documentActionId)}
                  aria-label={`View ${document.fileName}`}
                >
                  {documentActionId === `view:${document.id}` ? <span className="button-spinner dark" /> : <Icon name="eye" />}
                </button>
                <button
                  type="button"
                  className="document-file-action danger"
                  onClick={() => void deleteDocument(document)}
                  disabled={Boolean(documentActionId)}
                  aria-label={`Delete ${document.fileName}`}
                >
                  {documentActionId === `delete:${document.id}` ? <span className="button-spinner dark" /> : <Icon name="trash" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader eyebrow="Visa processing" title="Application" description="Loading your application workspace." />
        <Card className="application-detail-loading" role="status">
          <span className="button-spinner dark" /> Loading application...
        </Card>
      </>
    );
  }

  if (!application || !formData) {
    const isNotFound = errorCode === "APPLICATION_NOT_FOUND";
    return (
      <>
        <PageHeader
          eyebrow="Visa processing"
          title={isNotFound ? "Application not found" : "Application unavailable"}
          description="Return to your application list or try again."
          actions={<Link className="application-detail-back" href="/dashboard/applications">All applications</Link>}
        />
        <Card className="application-detail-empty">
          <Icon name="file" />
          <h2>{isNotFound ? "This application is no longer available" : "We couldn't load this application"}</h2>
          <p>{error ?? "Please refresh the page and try again."}</p>
          <Button type="button" variant="outline" onClick={() => void loadApplication()}>Try again</Button>
        </Card>
      </>
    );
  }

  const passport = application.passportJob?.extractedData ?? null;
  const completedSteps = progress.filter((item) => item.complete).length;
  const hasKnownDestination = destinations.some(([code]) => code === destinationCountry);

  return (
    <>
      <PageHeader
        eyebrow="Visa processing"
        title={`${countryNames[destinationCountry] ?? destinationCountry} application`}
        description="Review application details, complete requirements, and prepare this case for submission."
        actions={<Link className="application-detail-back" href="/dashboard/applications">All applications</Link>}
      />
      <Card className="application-overview-card">
        <div><small>Visa type</small><strong>{visaType}</strong></div>
        <div><small>Destination country</small><strong>{countryNames[destinationCountry] ?? destinationCountry} ({destinationCountry})</strong></div>
        <div><small>Status</small><Badge tone={statusTone(status)}>{status.replaceAll("_", " ")}</Badge></div>
        <div><small>Last updated</small><strong>{formatDate(application.updatedAt)}</strong></div>
      </Card>
      <VisaReadinessCard readiness={application.readiness} />
      <SectionCard title="Passport summary" subtitle="Passport information linked to this visa application">
        {!application.passportJob ? (
          <div className="application-detail-empty-state">
            <Icon name="passport" />
            <div><strong>No passport linked yet</strong><p>Linking a completed passport extraction is optional for this draft.</p></div>
            <Link className="application-detail-link" href="/dashboard/passports">View passport data</Link>
          </div>
        ) : !passport ? (
          <div className="application-detail-empty-state">
            <Icon name="clock" />
            <div><strong>Passport data is not available yet</strong><p>The linked extraction is still processing or has no completed data.</p></div>
            <Link className="application-detail-link" href="/dashboard/passports">View passport data</Link>
          </div>
        ) : (
          <div className="passport-summary-grid">
            <div><small>Passport number</small><strong className="mono-value">{maskPassportNumber(passport.passportNumber)}</strong></div>
            <div><small>Full name</small><strong>{`${passport.givenNames} ${passport.surname}`}</strong></div>
            <div><small>Nationality</small><strong>{passport.nationality}</strong></div>
            <div><small>Date of birth</small><strong>{formatDate(passport.dateOfBirth)}</strong></div>
            <div><small>Expiry date</small><strong>{passport.dateOfExpiry ? formatDate(passport.dateOfExpiry) : "Not available"}</strong></div>
            <div><small>MRZ</small><Badge tone={passport.mrzValid ? "success" : "danger"}>{passport.mrzValid ? "Valid" : "Invalid"}</Badge></div>
            <Link className="application-detail-link passport-summary-link" href="/dashboard/passports">View passport data <Icon name="arrow" /></Link>
          </div>
        )}
      </SectionCard>
      <SectionCard title="Visa form progress" subtitle={`${completedSteps} of ${progress.length} workflow sections ready`}>
        <div className="visa-progress-grid">
          {progress.map((item) => (
            <div className={item.complete ? "is-complete" : ""} key={item.label}>
              <span>{item.complete ? <Icon name="check" /> : <Icon name="clock" />}</span>
              <strong>{item.label}</strong>
              <small>{item.complete ? "Ready" : "Needs attention"}</small>
            </div>
          ))}
        </div>
      </SectionCard>
      <form className="application-detail-stack" onSubmit={saveApplication}>
        <SectionCard title="Application settings" subtitle="Update the destination, visa category, and internal workflow status.">
          <div className="application-form-grid">
            <label>
              Destination country
              <select
                className="form-select"
                value={destinationCountry}
                onChange={(event) => { setDestinationCountry(event.target.value); clearSaveFeedback(); }}
                disabled={isSaving}
              >
                {!hasKnownDestination && <option value={destinationCountry}>{destinationCountry}</option>}
                {destinations.map(([code, name]) => <option value={code} key={code}>{name} ({code})</option>)}
              </select>
            </label>
            <label>
              Visa type
              <Input value={visaType} onChange={(event) => { setVisaType(event.target.value); clearSaveFeedback(); }} minLength={1} maxLength={120} required disabled={isSaving} />
            </label>
            <label>
              Application status
              <select className="form-select" value={status} onChange={(event) => { setStatus(event.target.value as VisaApplicationStatus); clearSaveFeedback(); }} disabled={isSaving}>
                {statusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
          </div>
        </SectionCard>
        <SectionCard title="Applicant information" subtitle="Add sponsor and emergency contact information for this case.">
          <div className="application-form-grid">
            <label>Sponsor name<Input value={formData.sponsorName} onChange={(event) => updateFormField("sponsorName", event.target.value)} maxLength={200} disabled={isSaving} /></label>
            <label>Emergency contact name<Input value={formData.emergencyContactName} onChange={(event) => updateFormField("emergencyContactName", event.target.value)} maxLength={200} disabled={isSaving} /></label>
            <label>Emergency contact phone<Input value={formData.emergencyContactPhone} onChange={(event) => updateFormField("emergencyContactPhone", event.target.value)} maxLength={64} disabled={isSaving} /></label>
          </div>
        </SectionCard>
        <SectionCard title="Travel information" subtitle="Describe the intended visit and travel arrangements.">
          <div className="application-form-grid">
            <label>Purpose of travel<Input value={formData.purposeOfTravel} onChange={(event) => updateFormField("purposeOfTravel", event.target.value)} placeholder="Tourism, family visit, business..." maxLength={240} disabled={isSaving} /></label>
            <label>Intended arrival date<Input type="date" value={formData.intendedArrivalDate ?? ""} onChange={(event) => updateFormField("intendedArrivalDate", event.target.value || null)} disabled={isSaving} /></label>
            <label>Intended departure date<Input type="date" value={formData.intendedDepartureDate ?? ""} onChange={(event) => updateFormField("intendedDepartureDate", event.target.value || null)} disabled={isSaving} /></label>
            <label className="application-form-wide">Accommodation address<textarea value={formData.accommodationAddress} onChange={(event) => updateFormField("accommodationAddress", event.target.value)} maxLength={500} disabled={isSaving} /></label>
          </div>
        </SectionCard>
        <SectionCard title="Document checklist" subtitle="Track the documents needed for this destination before submission.">
          <div className="document-checklist">
            {formData.documents.map((item) => renderDocumentChecklistItem(item))}
          </div>
        </SectionCard>
        <SectionCard title="Review" subtitle="Keep any final internal notes with this application.">
          <div className="application-form-grid">
            <label className="application-form-wide">Notes<textarea value={formData.notes} onChange={(event) => updateFormField("notes", event.target.value)} maxLength={2_000} disabled={isSaving} /></label>
          </div>
        </SectionCard>
        {error && (
          <div className="passport-error-alert" role="alert">
            <span><Icon name="shield" /></span>
            <div><strong>Application was not saved</strong><p>{error}</p></div>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">x</button>
          </div>
        )}
        {saveMessage && (
          <div className="passport-success-alert" role="status">
            <span><Icon name="check" /></span>
            <div><strong>{saveMessage}</strong><p>Your application details and checklist have been updated.</p></div>
            <button type="button" onClick={() => setSaveMessage(null)} aria-label="Dismiss success message">x</button>
          </div>
        )}
        <div className="application-save-bar">
          <span>{hasUnsavedChanges ? <><Icon name="clock" /> Unsaved changes</> : <><Icon name="check" /> All changes saved</>}</span>
          <Button type="submit" disabled={!hasUnsavedChanges || isSaving}>
            {isSaving ? <span className="button-spinner" /> : <Icon name="check" />}
            {isSaving ? "Saving..." : "Save application"}
          </Button>
        </div>
      </form>
    </>
  );
}
