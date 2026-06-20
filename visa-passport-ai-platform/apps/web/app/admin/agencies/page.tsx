import { AgencyTable } from "@/components/admin/agency-table";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";

export default function AdminAgenciesPage() {
  return <><PageHeader eyebrow="Marketplace governance" title="Agencies" description="Verify partners, review service quality, and govern marketplace access." actions={<Button><Icon name="plus" /> Invite agency</Button>} /><div className="stats-grid stats-grid-three"><StatCard label="Verified partners" value="52" detail="Across 19 regions" icon="building" tone="amber" /><StatCard label="Pending review" value="3" detail="Oldest: 2 days" icon="clock" /><StatCard label="Marketplace rating" value="4.81" detail="From 8,240 reviews" icon="trend" tone="cyan" /></div><SectionCard title="Agency directory" subtitle="Verified and pending marketplace organizations"><AgencyTable /></SectionCard></>;
}
