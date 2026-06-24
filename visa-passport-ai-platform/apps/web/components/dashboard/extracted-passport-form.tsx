"use client";

import type {
  CreateVisaApplicationResponse,
  PassportDataUpdateResponse,
  PassportExtractedFields,
} from "@visa-platform/types";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Icon } from "@/components/shared/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiErrorMessage, apiRequest } from "@/lib/api";

const passportFieldKeys = [
  "passportNumber",
  "surname",
  "givenNames",
  "nationality",
  "dateOfBirth",
  "sex",
  "dateOfIssue",
  "dateOfExpiry",
  "placeOfBirth",
  "mrzValid",
] as const;

const destinations = [
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["CA", "Canada"],
  ["SA", "Saudi Arabia"],
  ["TR", "Türkiye"],
  ["SG", "Singapore"],
] as const;

function fieldsMatch(left: PassportExtractedFields, right: PassportExtractedFields) {
  return passportFieldKeys.every((field) => left[field] === right[field]);
}

export function ExtractedPassportForm({
  jobId,
  fields,
  confidence,
  onDataSaved,
}: {
  jobId: string;
  fields: PassportExtractedFields;
  confidence: number | null;
  onDataSaved: (fields: PassportExtractedFields) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState(fields);
  const [savedValues, setSavedValues] = useState(fields);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isApplicationPanelOpen, setIsApplicationPanelOpen] = useState(false);
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [destinationCountry, setDestinationCountry] = useState("AE");
  const [visaType, setVisaType] = useState("Tourist visa");

  const hasUnsavedChanges = !fieldsMatch(values, savedValues);

  function update<K extends keyof PassportExtractedFields>(
    field: K,
    value: PassportExtractedFields[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaveMessage(null);
    setSaveError(null);
  }

  async function saveCorrections() {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const response = await apiRequest<PassportDataUpdateResponse>(
        `/api/passports/jobs/${jobId}/data`,
        { method: "PATCH", body: JSON.stringify(values) },
      );
      setValues(response.data);
      setSavedValues(response.data);
      onDataSaved(response.data);
      setSaveMessage("Corrections saved");
    } catch (error) {
      setSaveError(apiErrorMessage(error, "Unable to save corrections. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }

  function openApplicationPanel() {
    setApplicationError(null);
    setIsApplicationPanelOpen(true);
  }

  async function createApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingApplication(true);
    setApplicationError(null);
    try {
      const response = await apiRequest<CreateVisaApplicationResponse>("/api/applications", {
        method: "POST",
        body: JSON.stringify({ destinationCountry, visaType, passportJobId: jobId }),
      });
      router.push(`/dashboard/applications/${response.application.id}`);
    } catch (error) {
      setApplicationError(
        apiErrorMessage(error, "Unable to start the visa application. Please try again."),
      );
    } finally {
      setIsCreatingApplication(false);
    }
  }

  return <><Card className="extracted-passport-card"><div className="extracted-heading"><div className="passport-card-heading"><span><Icon name="passport" /></span><div><small>Extraction complete</small><h2>Review passport details</h2><p>Confirm every field before using this passport in an application.</p></div></div><div className="extraction-quality"><div><small>Confidence score</small><strong>{confidence === null ? "—" : `${Math.round(confidence * 100)}%`}</strong></div><Badge tone={values.mrzValid ? "success" : "danger"}><Icon name={values.mrzValid ? "check" : "shield"} /> MRZ {values.mrzValid ? "valid" : "invalid"}</Badge></div></div>{saveError && <div className="passport-error-alert passport-form-alert" role="alert"><span><Icon name="shield" /></span><div><strong>Corrections were not saved</strong><p>{saveError}</p></div><button type="button" onClick={() => setSaveError(null)} aria-label="Dismiss error">×</button></div>}{saveMessage && <div className="passport-success-alert passport-form-alert" role="status"><span><Icon name="check" /></span><div><strong>{saveMessage}</strong><p>Your corrected passport data is securely saved.</p></div><button type="button" onClick={() => setSaveMessage(null)} aria-label="Dismiss success message">×</button></div>}<div className="editable-passport-form"><label>Passport number<Input value={values.passportNumber} onChange={(event) => update("passportNumber", event.target.value)} disabled={isSaving} /></label><label>Surname<Input value={values.surname} onChange={(event) => update("surname", event.target.value)} disabled={isSaving} /></label><label>Given names<Input value={values.givenNames} onChange={(event) => update("givenNames", event.target.value)} disabled={isSaving} /></label><label>Nationality<Input value={values.nationality} maxLength={3} onChange={(event) => update("nationality", event.target.value.toUpperCase())} disabled={isSaving} /></label><label>Date of birth<Input type="date" value={values.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} disabled={isSaving} /></label><label>Sex<select className="form-select" value={values.sex ?? ""} onChange={(event) => update("sex", event.target.value || null)} disabled={isSaving}><option value="">Not specified</option><option value="M">Male</option><option value="F">Female</option><option value="X">Unspecified / X</option></select></label><label>Date of issue<Input type="date" value={values.dateOfIssue ?? ""} onChange={(event) => update("dateOfIssue", event.target.value || null)} disabled={isSaving} /></label><label>Date of expiry<Input type="date" value={values.dateOfExpiry ?? ""} onChange={(event) => update("dateOfExpiry", event.target.value || null)} disabled={isSaving} /></label><label>Place of birth<Input value={values.placeOfBirth ?? ""} onChange={(event) => update("placeOfBirth", event.target.value || null)} disabled={isSaving} /></label></div><div className="extracted-actions"><span>{hasUnsavedChanges ? <><Icon name="clock" /> Unsaved changes</> : <><Icon name="check" /> {saveMessage ?? "Passport data is ready to use"}</>}</span><div className="extracted-action-buttons"><Button variant="outline" type="button" onClick={openApplicationPanel} disabled={hasUnsavedChanges || isSaving}>Start visa application</Button><Button type="button" onClick={() => void saveCorrections()} disabled={!hasUnsavedChanges || isSaving}>{isSaving ? <span className="button-spinner" /> : <Icon name="check" />}{isSaving ? "Saving..." : "Save corrections"}</Button></div></div>{hasUnsavedChanges && <p className="extracted-action-note">Save corrections before starting a visa application.</p>}</Card>{isApplicationPanelOpen && <div className="application-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsApplicationPanelOpen(false); }}><div className="application-modal" role="dialog" aria-modal="true" aria-labelledby="passport-application-title"><div className="application-modal-heading"><div><small>Passport ready</small><h2 id="passport-application-title">Start visa application</h2><p>This draft will be securely linked to the passport you just reviewed.</p></div><button type="button" onClick={() => setIsApplicationPanelOpen(false)} aria-label="Close">×</button></div><form onSubmit={createApplication} aria-busy={isCreatingApplication}>{applicationError && <div className="auth-error" role="alert">{applicationError}</div>}<label>Destination country<select className="form-select" value={destinationCountry} onChange={(event) => setDestinationCountry(event.target.value)} disabled={isCreatingApplication}>{destinations.map(([code, name]) => <option value={code} key={code}>{name} ({code})</option>)}</select></label><label>Visa type<Input value={visaType} onChange={(event) => setVisaType(event.target.value)} placeholder="Tourist visa" minLength={1} maxLength={120} required disabled={isCreatingApplication} /></label><div className="application-modal-actions"><Button type="button" variant="outline" onClick={() => setIsApplicationPanelOpen(false)} disabled={isCreatingApplication}>Cancel</Button><Button type="submit" disabled={isCreatingApplication}>{isCreatingApplication ? "Creating..." : "Create application"}</Button></div></form></div></div>}</>;
}
