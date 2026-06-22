"use client";

import type { VisaApplicationsResponse, VisaApplicationSummary } from "@visa-platform/types";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { ApplicationTable } from "@/components/dashboard/application-table";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage, apiRequest } from "@/lib/api";

const destinations = [
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["CA", "Canada"],
  ["SA", "Saudi Arabia"],
  ["TR", "Türkiye"],
  ["SG", "Singapore"],
];

export function ApplicationsWorkspace() {
  const [applications, setApplications] = useState<VisaApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [destinationCountry, setDestinationCountry] = useState("AE");
  const [visaType, setVisaType] = useState("Tourist visa");
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      const response = await apiRequest<VisaApplicationsResponse>("/api/applications");
      setApplications(response.applications);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load applications. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiRequest<VisaApplicationsResponse>("/api/applications")
      .then((response) => { if (!cancelled) setApplications(response.applications); })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(apiErrorMessage(requestError, "Unable to load applications. Please try again."));
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => ({
    inProgress: applications.filter((item) => ["DRAFT", "SUBMITTED", "IN_REVIEW"].includes(item.status)).length,
    needsAttention: applications.filter((item) => item.status === "DRAFT").length,
    completed: applications.filter((item) => ["APPROVED", "REJECTED", "CANCELLED"].includes(item.status)).length,
  }), [applications]);

  async function createApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      await apiRequest("/api/applications", {
        method: "POST",
        body: JSON.stringify({ destinationCountry, visaType }),
      });
      setShowForm(false);
      setVisaType("Tourist visa");
      await loadApplications();
    } catch (requestError) {
      setCreateError(apiErrorMessage(requestError, "Unable to create the application. Please try again."));
    } finally {
      setIsCreating(false);
    }
  }

  function openCreateForm() {
    setCreateError(null);
    setShowForm(true);
  }

  return <><PageHeader eyebrow="Visa processing" title="Applications" description="Track requirements, documents, reviews, and submission readiness." actions={<Button onClick={openCreateForm}><Icon name="plus" /> New application</Button>} />{error && <div className="passport-error-alert" role="alert"><span><Icon name="shield" /></span><div><strong>Application request failed</strong><p>{error}</p></div><button onClick={() => setError(null)} aria-label="Dismiss error">×</button></div>}<div className="stats-grid stats-grid-three"><StatCard label="In progress" value={String(stats.inProgress)} detail="Draft, submitted, or review" icon="clock" /><StatCard label="Needs attention" value={String(stats.needsAttention)} detail="Draft applications" icon="file" tone="amber" /><StatCard label="Completed" value={String(stats.completed)} detail="Closed decisions" icon="check" tone="cyan" /></div><SectionCard title="All applications" subtitle={`${applications.length} application${applications.length === 1 ? "" : "s"} across your destinations`}>{isLoading ? <div className="table-empty-state" role="status">Loading applications…</div> : applications.length === 0 ? <div className="table-empty-state"><Icon name="file" /><strong>No visa applications yet</strong><span>Create a draft to start organizing your next trip.</span><Button size="sm" onClick={openCreateForm}>New application</Button></div> : <ApplicationTable applications={applications} />}</SectionCard>{showForm && <div className="application-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><div className="application-modal" role="dialog" aria-modal="true" aria-labelledby="new-application-title"><div className="application-modal-heading"><div><small>New visa case</small><h2 id="new-application-title">Create application</h2><p>Start a draft now; documents and detailed forms come next.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close">×</button></div><form onSubmit={createApplication} aria-busy={isCreating}>{createError && <div className="auth-error" role="alert">{createError}</div>}<label>Destination country<select className="form-select" value={destinationCountry} onChange={(event) => setDestinationCountry(event.target.value)} disabled={isCreating}>{destinations.map(([code, name]) => <option value={code} key={code}>{name} ({code})</option>)}</select></label><label>Visa type<Input value={visaType} onChange={(event) => setVisaType(event.target.value)} placeholder="Tourist visa" minLength={2} maxLength={120} required disabled={isCreating} /></label><div className="application-modal-actions"><Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isCreating}>Cancel</Button><Button type="submit" disabled={isCreating}>{isCreating ? "Creating…" : "Create draft"}</Button></div></form></div></div>}</>;
}
