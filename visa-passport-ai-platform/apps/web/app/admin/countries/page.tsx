import { CountryTable } from "@/components/admin/country-table";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";

export default function AdminCountriesPage() {
  return <><PageHeader eyebrow="Regulatory intelligence" title="Countries" description="Maintain versioned visa requirements with review dates and source provenance." actions={<Button><Icon name="plus" /> Add country</Button>} /><div className="stats-grid stats-grid-three"><StatCard label="Countries live" value="48" detail="75 launch markets" icon="globe" tone="cyan" /><StatCard label="Visa rule sets" value="286" detail="Across all destinations" icon="file" /><StatCard label="Review due" value="4" detail="Within the next 7 days" icon="clock" tone="amber" /></div><SectionCard title="Country rule registry" subtitle="Version-controlled regulatory reference data"><CountryTable /></SectionCard></>;
}
