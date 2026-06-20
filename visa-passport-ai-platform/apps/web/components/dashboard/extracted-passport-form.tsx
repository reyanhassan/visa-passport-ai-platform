"use client";

import type { PassportExtractedFields } from "@visa-platform/types";
import { useState } from "react";

import { Icon } from "@/components/shared/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ExtractedPassportForm({ fields, confidence }: { fields: PassportExtractedFields; confidence: number | null }) {
  const [values, setValues] = useState(fields);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof PassportExtractedFields>(field: K, value: PassportExtractedFields[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  return <Card className="extracted-passport-card"><div className="extracted-heading"><div className="passport-card-heading"><span><Icon name="passport" /></span><div><small>Extraction complete</small><h2>Review passport details</h2><p>Confirm every field before using this passport in an application.</p></div></div><div className="extraction-quality"><div><small>Confidence score</small><strong>{confidence === null ? "—" : `${Math.round(confidence * 100)}%`}</strong></div><Badge tone={values.mrzValid ? "success" : "danger"}><Icon name={values.mrzValid ? "check" : "shield"} /> MRZ {values.mrzValid ? "valid" : "invalid"}</Badge></div></div><div className="editable-passport-form"><label>Passport number<Input value={values.passportNumber} onChange={(event) => update("passportNumber", event.target.value)} /></label><label>Surname<Input value={values.surname} onChange={(event) => update("surname", event.target.value)} /></label><label>Given names<Input value={values.givenNames} onChange={(event) => update("givenNames", event.target.value)} /></label><label>Nationality<Input value={values.nationality} onChange={(event) => update("nationality", event.target.value)} /></label><label>Date of birth<Input type="date" value={values.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} /></label><label>Sex<select className="form-select" value={values.sex ?? ""} onChange={(event) => update("sex", event.target.value || null)}><option value="">Not specified</option><option value="M">Male</option><option value="F">Female</option><option value="X">Unspecified / X</option></select></label><label>Date of issue<Input type="date" value={values.dateOfIssue ?? ""} onChange={(event) => update("dateOfIssue", event.target.value || null)} /></label><label>Date of expiry<Input type="date" value={values.dateOfExpiry ?? ""} onChange={(event) => update("dateOfExpiry", event.target.value || null)} /></label><label>Place of birth<Input value={values.placeOfBirth ?? ""} onChange={(event) => update("placeOfBirth", event.target.value || null)} /></label></div><div className="extracted-actions"><span>{saved ? <><Icon name="check" /> Changes saved locally</> : "Edits are local until application persistence is added."}</span><Button onClick={() => setSaved(true)}><Icon name="check" /> Save reviewed fields</Button></div></Card>;
}
