import { ApplicationTable } from "@/components/dashboard/application-table";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";

export default function AgencyApplicationsPage() {
  return <><PageHeader eyebrow="Case operations" title="Applications" description="Manage every client application from intake through submission." actions={<Button><Icon name="plus" /> New application</Button>} /><div className="stats-grid"><StatCard label="New intake" value="12" detail="4 unassigned" icon="file" /><StatCard label="Collecting documents" value="8" detail="3 overdue" icon="passport" tone="cyan" /><StatCard label="Under review" value="5" detail="2 high priority" icon="clock" tone="amber" /><StatCard label="Ready to submit" value="9" detail="Across 6 countries" icon="check" tone="rose" /></div><SectionCard title="Application queue" subtitle="Sorted by most recently updated"><ApplicationTable agency /></SectionCard></>;
}
