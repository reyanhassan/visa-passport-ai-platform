import { AuditTable } from "@/components/admin/audit-table";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";

export default function AuditLogsPage() {
  return <><PageHeader eyebrow="Security operations" title="Audit logs" description="Review immutable access, change, export, and system activity events." actions={<><Button variant="outline"><Icon name="filter" /> Filter</Button><Button><Icon name="download" /> Export</Button></>} /><div className="audit-summary"><span><Icon name="shield" /><strong>Audit integrity protected</strong><small>Events are append-only and retained according to policy.</small></span><div><strong>24,892</strong><small>Events in the last 30 days</small></div></div><SectionCard title="Event stream" subtitle="Showing the latest platform activity"><AuditTable /></SectionCard></>;
}
