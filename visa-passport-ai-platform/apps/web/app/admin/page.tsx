import { AgencyTable } from "@/components/admin/agency-table";
import { AuditTable } from "@/components/admin/audit-table";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";

export default function AdminPage() {
  return <><PageHeader eyebrow="System overview" title="Platform control center" description="Monitor marketplace health, regulatory data, and sensitive platform activity." /><div className="stats-grid"><StatCard label="Verified agencies" value="52" detail="3 pending review" icon="building" tone="amber" /><StatCard label="Countries live" value="48" detail="64% launch coverage" icon="globe" tone="cyan" /><StatCard label="Applications today" value="1,284" detail="+18.2% vs yesterday" icon="file" /><StatCard label="Review flags" value="7" detail="2 security-sensitive" icon="shield" tone="rose" /></div><div className="admin-overview-grid"><SectionCard title="Agency health" subtitle="Highest-volume marketplace partners" href="/admin/agencies"><AgencyTable compact /></SectionCard><div className="system-health"><div className="system-health-head"><span><i /> All systems operational</span><small>Updated just now</small></div><h2>Platform health</h2>{[{ name: "Web application", value: "99.99%" }, { name: "OCR extraction", value: "99.94%" }, { name: "Queue processing", value: "99.98%" }, { name: "Country rules API", value: "100%" }].map((service) => <div className="health-row" key={service.name}><span>{service.name}</span><strong>{service.value}</strong><i /></div>)}</div></div><SectionCard title="Recent audit events" subtitle="Security and operational activity" href="/admin/audit-logs"><AuditTable compact /></SectionCard></>;
}
