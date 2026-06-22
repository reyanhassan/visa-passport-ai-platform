"use client";

import type {
  CreatePassportExtractionRequest,
  CreatePassportExtractionResponse,
  PassportExtractionJob,
  PassportExtractionJobResponse,
  RecentPassportExtraction,
  RecentPassportExtractionsResponse,
} from "@visa-platform/types";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/shared/icon";
import { apiErrorMessage, apiRequest } from "@/lib/api";
import { ExtractedPassportForm } from "./extracted-passport-form";
import { PassportJobStatus } from "./passport-job-status";
import { PassportUploadForm } from "./passport-upload-form";
import { RecentExtractionsTable } from "./recent-extractions-table";

function displayError(error: unknown) {
  return apiErrorMessage(error, "Something went wrong. Please try again.");
}

export function PassportUploadWorkspace() {
  const [activeJob, setActiveJob] = useState<PassportExtractionJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentPassportExtraction[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    try {
      const response = await apiRequest<RecentPassportExtractionsResponse>("/api/passports/recent");
      setRecentJobs(response.jobs);
    } catch (requestError) {
      setError(displayError(requestError));
    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiRequest<RecentPassportExtractionsResponse>("/api/passports/recent")
      .then((response) => { if (!cancelled) setRecentJobs(response.jobs); })
      .catch((requestError: unknown) => { if (!cancelled) setError(displayError(requestError)); })
      .finally(() => { if (!cancelled) setIsLoadingRecent(false); });
    return () => { cancelled = true; };
  }, []);

  const refreshStatus = useCallback(async (jobId?: string) => {
    const targetJobId = jobId ?? activeJob?.id;
    if (!targetJobId) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await apiRequest<PassportExtractionJobResponse>(`/api/passports/jobs/${targetJobId}`);
      setActiveJob(response.job);
      setLastChecked(new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date()));
      if (response.job.status === "COMPLETED" || response.job.status === "FAILED") {
        await loadRecent();
      }
    } catch (requestError) {
      setError(displayError(requestError));
    } finally {
      setIsRefreshing(false);
    }
  }, [activeJob?.id, loadRecent]);

  useEffect(() => {
    if (!activeJob || !["PENDING", "PROCESSING"].includes(activeJob.status)) return;
    const poll = window.setInterval(() => void refreshStatus(activeJob.id), 3_000);
    return () => window.clearInterval(poll);
  }, [activeJob, refreshStatus]);

  async function submitExtraction(request: CreatePassportExtractionRequest) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setLastChecked(null);
    try {
      const created = await apiRequest<CreatePassportExtractionResponse>("/api/passports/extract", {
        method: "POST",
        body: JSON.stringify(request),
      });
      setActiveJob({
        id: created.jobId,
        status: created.status,
        confidence: null,
        countryHint: request.countryHint ?? null,
        createdAt: new Date().toISOString(),
      });
      if (created.status === "COMPLETED") {
        await refreshStatus(created.jobId);
        setSuccess(created.message);
      } else {
        await loadRecent();
      }
    } catch (requestError) {
      setError(displayError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return <div className="passport-upload-workspace">{error && <div className="passport-error-alert" role="alert"><span><Icon name="shield" /></span><div><strong>We couldn’t complete that request</strong><p>{error}</p></div><button onClick={() => setError(null)} aria-label="Dismiss error">×</button></div>}{success && <div className="passport-success-alert" role="status"><span><Icon name="check" /></span><div><strong>Extraction ready</strong><p>{success}</p></div><button onClick={() => setSuccess(null)} aria-label="Dismiss success message">×</button></div>}<div className="passport-upload-grid"><PassportUploadForm isSubmitting={isSubmitting} onSubmit={submitExtraction} onError={setError} /><PassportJobStatus job={activeJob} isRefreshing={isRefreshing} lastChecked={lastChecked} onRefresh={() => refreshStatus()} /></div>{activeJob?.status === "COMPLETED" && activeJob.extractedData && <ExtractedPassportForm key={activeJob.id} fields={activeJob.extractedData} confidence={activeJob.confidence} />}<RecentExtractionsTable jobs={recentJobs} activeJobId={activeJob?.id ?? null} isLoading={isLoadingRecent} onView={(jobId) => refreshStatus(jobId)} /></div>;
}
