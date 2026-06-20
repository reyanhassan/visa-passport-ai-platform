"use client";

import type { RecentPassportExtraction } from "@visa-platform/types";

import { CountryMark } from "@/components/shared/country-mark";
import { Icon } from "@/components/shared/icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

function tone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "FAILED") return "danger" as const;
  if (status === "PROCESSING") return "info" as const;
  return "warning" as const;
}

export function RecentExtractionsTable({ jobs, activeJobId, isLoading, onView }: { jobs: RecentPassportExtraction[]; activeJobId: string | null; isLoading: boolean; onView: (jobId: string) => Promise<void> }) {
  return <Card className="recent-extractions-card"><div className="section-card-header"><div><h2>Recent extractions</h2><p>Your latest passport OCR jobs and confidence results</p></div><span className="table-count">{jobs.length} jobs</span></div>{isLoading ? <div className="table-empty-state">Loading recent extractions…</div> : jobs.length === 0 ? <div className="table-empty-state"><Icon name="passport" /><strong>No passport extractions yet</strong><span>Your first completed scan will appear here.</span></div> : <div className="data-table-wrap"><table className="data-table extraction-table"><thead><tr><th>Job</th><th>Document</th><th>Country hint</th><th>Passport</th><th>Status</th><th>Confidence</th><th>Created</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id} className={job.id === activeJobId ? "active-extraction-row" : ""}><td><code>{job.id.slice(0, 8)}…</code>{job.id === activeJobId && <small>Current job</small>}</td><td><div className="extraction-document-cell"><span><Icon name="passport" /></span><div><strong>Passport</strong><small>{job.documentType}</small></div></div></td><td><div className="identity-cell"><CountryMark code={job.countryHint ?? "--"} /><strong>{job.countryHint ?? "—"}</strong></div></td><td><strong className="mono-value">{job.maskedPassportNumber ?? "—"}</strong></td><td><Badge tone={tone(job.status)}>{job.status}</Badge></td><td>{job.confidence === null ? <span className="muted-value">—</span> : <div className="table-confidence"><span><i style={{ width: `${job.confidence * 100}%` }} /></span><strong>{Math.round(job.confidence * 100)}%</strong></div>}</td><td>{formatDate(job.createdAt)}</td><td><button className="table-action" onClick={() => void onView(job.id)} aria-label={`View job ${job.id}`}><Icon name={job.id === activeJobId ? "refresh" : "arrow"} /></button></td></tr>)}</tbody></table></div>}</Card>;
}
