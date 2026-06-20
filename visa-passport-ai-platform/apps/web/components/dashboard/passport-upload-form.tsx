"use client";

import type { CreatePassportExtractionRequest, UploadPassportResponse } from "@visa-platform/types";
import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";

import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, apiRequest } from "@/lib/api";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const countries = [
  { value: "PK", label: "Pakistan" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "GB", label: "United Kingdom" },
  { value: "SG", label: "Singapore" },
  { value: "TR", label: "Türkiye" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
];

export function PassportUploadForm({
  isSubmitting,
  onSubmit,
  onError,
}: {
  isSubmitting: boolean;
  onSubmit: (request: CreatePassportExtractionRequest) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [countryHint, setCountryHint] = useState("PK");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const isBusy = isSubmitting || isUploading;

  function chooseFile(file: File | undefined) {
    if (!file) return;
    if (!acceptedTypes.has(file.type)) return onError("Use a JPG, PNG, WebP, or PDF file.");
    if (file.size > MAX_FILE_SIZE) return onError("Passport file must be no larger than 15 MB.");
    setSelectedFile(file);
    setImageUrl("");
    onError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile && !imageUrl.trim()) return onError("Select a passport file or enter an image URL.");

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.set("file", selectedFile);
        const upload = await apiRequest<UploadPassportResponse>("/api/uploads/passport", {
          method: "POST",
          body: formData,
        });
        await onSubmit({
          documentType: "passport",
          countryHint,
          imageUrl: upload.imageUrl,
          objectKey: upload.objectKey,
        });
      } catch (error) {
        onError(error instanceof ApiError ? error.message : "Unable to upload passport file.");
      } finally {
        setIsUploading(false);
      }
      return;
    }

    await onSubmit({ documentType: "passport", countryHint, imageUrl: imageUrl.trim() });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  return <Card className="passport-intake-card"><div className="passport-card-heading"><span><Icon name="scan" /></span><div><small>New extraction</small><h2>Upload passport</h2><p>Start with a clear passport image or document URL.</p></div></div><form onSubmit={handleSubmit}><div className={`passport-dropzone${isDragging ? " is-dragging" : ""}`} role="button" tabIndex={0} onClick={() => !isBusy && inputRef.current?.click()} onKeyDown={(event) => { if (!isBusy && (event.key === "Enter" || event.key === " ")) inputRef.current?.click(); }} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}><input ref={inputRef} className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileInput} disabled={isBusy} /><span className="dropzone-icon"><Icon name="upload" /></span><strong>{selectedFile ? selectedFile.name : "Drag and drop your passport image"}</strong><p>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB selected` : "JPG, PNG, WebP, or PDF · Up to 15 MB"}</p><span className="mvp-pill">{selectedFile ? "Ready to upload" : "Click to choose a file"}</span></div><div className="input-divider"><span>or use an image URL</span></div><div className="passport-form-fields"><label>Passport image URL<Input type="url" value={imageUrl} onChange={(event) => { setImageUrl(event.target.value); if (event.target.value) setSelectedFile(null); }} placeholder="https://example.com/passport.jpg" disabled={isBusy} /><small>Use a temporary, access-controlled URL whenever possible.</small></label><label>Issuing country hint<select className="form-select" value={countryHint} onChange={(event) => setCountryHint(event.target.value)} disabled={isBusy}>{countries.map((country) => <option value={country.value} key={country.value}>{country.label} ({country.value})</option>)}</select><small>Helps the OCR engine interpret country-specific layouts.</small></label></div><Button type="submit" size="lg" disabled={isBusy || (!selectedFile && !imageUrl.trim())}>{isBusy ? <><span className="button-spinner" /> Uploading and extracting…</> : <><Icon name="zap" /> Start AI extraction</>}</Button><div className="intake-security"><span><Icon name="lock" /> Encrypted fields</span><span><Icon name="shield" /> Private processing</span><span><Icon name="audit" /> Audited access</span></div></form></Card>;
}
