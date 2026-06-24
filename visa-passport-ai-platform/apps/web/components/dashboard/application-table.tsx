"use client";

import type { VisaApplicationSummary } from "@visa-platform/types";
import { useRouter } from "next/navigation";

import { CountryMark } from "@/components/shared/country-mark";
import { Icon } from "@/components/shared/icon";
import { Badge } from "@/components/ui/badge";
import { visaApplications } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

const countryNames: Record<string, string> = {
  AE: "United Arab Emirates",
  AU: "Australia",
  CA: "Canada",
  GB: "United Kingdom",
  PK: "Pakistan",
  SA: "Saudi Arabia",
  SG: "Singapore",
  TR: "Türkiye",
};

const progressByStatus: Record<VisaApplicationSummary["status"], number> = {
  DRAFT: 15,
  SUBMITTED: 60,
  IN_REVIEW: 78,
  APPROVED: 100,
  REJECTED: 100,
  CANCELLED: 100,
};

function tone(status: string) {
  if (status === "Ready" || status === "Submitted" || status === "Approved") return "success" as const;
  if (status === "Needs documents" || status === "Draft") return "warning" as const;
  if (status === "Rejected" || status === "Cancelled") return "danger" as const;
  return "info" as const;
}

export function ApplicationTable({
  compact = false,
  agency = false,
  applications,
}: {
  compact?: boolean;
  agency?: boolean;
  applications?: VisaApplicationSummary[];
}) {
  const router = useRouter();
  const applicationRows = applications?.map((application) => ({
    id: application.id,
    destination: countryNames[application.destinationCountry] ?? application.destinationCountry,
    code: application.destinationCountry,
    type: application.visaType,
    applicant: "You",
    updated: formatDate(application.updatedAt),
    progress: progressByStatus[application.status],
    status: application.status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
    linkToDetail: true,
  })) ?? visaApplications.map((application) => ({ ...application, linkToDetail: false }));
  const rows = compact ? applicationRows.slice(0, 3) : applicationRows;

  function openApplication(id: string, linkToDetail: boolean) {
    if (linkToDetail) router.push(`/dashboard/applications/${id}`);
  }

  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Application</th>{agency && <th>Applicant</th>}<th>Progress</th><th>Updated</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((application) => <tr key={application.id} className={application.linkToDetail ? "application-table-row" : undefined} tabIndex={application.linkToDetail ? 0 : undefined} onClick={() => openApplication(application.id, application.linkToDetail)} onKeyDown={(event) => { if (application.linkToDetail && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openApplication(application.id, true); } }}><td><div className="identity-cell"><CountryMark code={application.code} /><span><strong>{application.destination}</strong><small>{application.type} · {application.id}</small></span></div></td>{agency && <td><strong>{application.applicant}</strong></td>}<td><div className="application-progress"><span><i style={{ width: `${application.progress}%` }} /></span><small>{application.progress}%</small></div></td><td>{application.updated}</td><td><Badge tone={tone(application.status)}>{application.status}</Badge></td><td>{application.linkToDetail && <button type="button" className="table-action" aria-label={`Open ${application.id}`} onClick={(event) => { event.stopPropagation(); openApplication(application.id, true); }}><Icon name="arrow" /></button>}</td></tr>)}</tbody></table></div>;
}
