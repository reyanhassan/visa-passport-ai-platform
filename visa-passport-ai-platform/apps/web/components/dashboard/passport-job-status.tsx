"use client";

import type { PassportExtractionJob } from "@visa-platform/types";

import { Icon } from "@/components/shared/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function statusPresentation(status: PassportExtractionJob["status"]) {
  switch (status) {
    case "PROCESSING": return { label: "Processing", detail: "OCR and MRZ analysis are running.", progress: 66, tone: "info" as const };
    case "COMPLETED": return { label: "Completed", detail: "Extraction is ready for your review.", progress: 100, tone: "success" as const };
    case "FAILED": return { label: "Failed", detail: "The extraction could not be completed.", progress: 100, tone: "danger" as const };
    default: return { label: "Pending", detail: "Your job is waiting for an available worker.", progress: 24, tone: "warning" as const };
  }
}

export function PassportJobStatus({ job, isRefreshing, lastChecked, onRefresh }: { job: PassportExtractionJob | null; isRefreshing: boolean; lastChecked: string | null; onRefresh: () => Promise<void> }) {
  return <Card className="passport-status-card"><div className="passport-card-heading"><span><Icon name="clock" /></span><div><small>Live monitor</small><h2>Extraction status</h2><p>Track the latest job from queue to completion.</p></div></div>{!job ? <div className="job-empty-state"><span><Icon name="passport" /></span><h3>No active extraction</h3><p>Submit a passport file or image URL and its processing status will appear here.</p><div><i /><i /><i /></div></div> : (() => { const presentation = statusPresentation(job.status); return <div className="job-status-content"><div className="job-status-top"><div><small>Job identifier</small><code>{job.id}</code></div><Badge tone={presentation.tone}>{presentation.label}</Badge></div><div className={`job-progress status-progress-${job.status.toLowerCase()}`}><div><span>{presentation.detail}</span><strong>{presentation.progress}%</strong></div><span><i style={{ width: `${presentation.progress}%` }} /></span></div><div className="processing-steps"><div className="is-complete"><span><Icon name="check" /></span><div><strong>Job created</strong><small>Stored securely in PostgreSQL</small></div></div><div className={job.status !== "PENDING" ? "is-complete" : "is-current"}><span>{job.status === "PENDING" ? "2" : <Icon name="check" />}</span><div><strong>OCR processing</strong><small>Passport fields and MRZ parsing</small></div></div><div className={job.status === "COMPLETED" ? "is-complete" : job.status === "FAILED" ? "is-failed" : ""}><span>{job.status === "COMPLETED" ? <Icon name="check" /> : job.status === "FAILED" ? "!" : "3"}</span><div><strong>Review results</strong><small>Validate extracted identity fields</small></div></div></div>{job.status === "FAILED" && <div className="job-error-message"><Icon name="shield" /><span><strong>Extraction failed</strong><small>{job.errorMessage ?? "An unexpected processing error occurred."}</small></span></div>}<div className="status-refresh-row"><span>{lastChecked ? `Last checked ${lastChecked}` : "Automatic refresh every 3 seconds"}</span><Button variant="outline" size="sm" onClick={() => void onRefresh()} disabled={isRefreshing}>{isRefreshing ? <span className="button-spinner dark" /> : <Icon name="refresh" />} {isRefreshing ? "Checking…" : "Refresh status"}</Button></div></div>; })()}</Card>;
}
