import { ClientTable } from "@/components/agency/client-table";
import { PipelineCard } from "@/components/agency/pipeline-card";
import { ApplicationTable } from "@/components/dashboard/application-table";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";

export default function AgencyPage() {
  return <><PageHeader eyebrow="Atlas Travel Co." title="Agency command center" description="Coordinate clients, documents, and visa workloads from one secure workspace." actions={<Button><Icon name="plus" /> Add client</Button>} /><div className="stats-grid"><StatCard label="Active clients" value="42" detail="6 added this month" icon="users" tone="cyan" /><StatCard label="Open applications" value="34" detail="Across 12 destinations" icon="file" /><StatCard label="Awaiting review" value="5" detail="2 high priority" icon="clock" tone="amber" /><StatCard label="Approval rate" value="96.8%" detail="Last 90 days" icon="trend" tone="rose" /></div><div className="agency-overview-grid"><PipelineCard /><SectionCard title="Recently active clients" subtitle="Latest customer activity" href="/agency/clients"><ClientTable compact /></SectionCard></div><SectionCard title="Priority applications" subtitle="Cases that need attention this week" href="/agency/applications"><ApplicationTable compact agency /></SectionCard></>;
}
