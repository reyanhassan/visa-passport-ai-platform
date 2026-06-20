import { ClientTable } from "@/components/agency/client-table";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";

export default function AgencyClientsPage() {
  return <><PageHeader eyebrow="Customer management" title="Clients" description="Manage traveler profiles, shared documents, and active case access." actions={<Button><Icon name="plus" /> Add client</Button>} /><div className="stats-grid stats-grid-three"><StatCard label="Total clients" value="128" detail="42 currently active" icon="users" tone="cyan" /><StatCard label="New this month" value="6" detail="18% growth" icon="trend" /><StatCard label="Waiting on client" value="9" detail="Documents or approval" icon="clock" tone="amber" /></div><SectionCard title="Client directory" subtitle="Authorized client records in your workspace"><ClientTable /></SectionCard></>;
}
