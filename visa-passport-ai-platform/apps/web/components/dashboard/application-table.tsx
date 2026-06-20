import { Badge } from "@/components/ui/badge";
import { CountryMark } from "@/components/shared/country-mark";
import { Icon } from "@/components/shared/icon";
import { visaApplications } from "@/lib/mock-data";
import type { VisaApplicationSummary } from "@visa-platform/types";
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
  if (status === "Ready" || status === "Submitted") return "success" as const;
  if (status === "Needs documents") return "warning" as const;
  return "info" as const;
}

export function ApplicationTable({ compact = false, agency = false, applications }: { compact?: boolean; agency?: boolean; applications?: VisaApplicationSummary[] }) {
  const applicationRows = applications?.map((application) => ({
    id: application.id,
    destination: countryNames[application.destinationCountry] ?? application.destinationCountry,
    code: application.destinationCountry,
    type: application.visaType,
    applicant: "You",
    updated: formatDate(application.updatedAt),
    progress: progressByStatus[application.status],
    status: application.status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
  })) ?? visaApplications;
  const rows = compact ? applicationRows.slice(0, 3) : applicationRows;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Application</th>{agency && <th>Applicant</th>}<th>Progress</th><th>Updated</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((application) => <tr key={application.id}><td><div className="identity-cell"><CountryMark code={application.code} /><span><strong>{application.destination}</strong><small>{application.type} · {application.id}</small></span></div></td>{agency && <td><strong>{application.applicant}</strong></td>}<td><div className="application-progress"><span><i style={{ width: `${application.progress}%` }} /></span><small>{application.progress}%</small></div></td><td>{application.updated}</td><td><Badge tone={tone(application.status)}>{application.status}</Badge></td><td><button className="table-action" aria-label={`Actions for ${application.id}`}><Icon name="more" /></button></td></tr>)}</tbody></table></div>;
}
