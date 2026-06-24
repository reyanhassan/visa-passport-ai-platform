import { getCountryRule } from "@visa-platform/config";

import { CountryTable, type CountryRuleTableRow } from "@/components/admin/country-table";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";

const countryCodes = ["AE", "CA", "GB", "PK", "SA"];

export default async function AdminCountriesPage() {
  const loadedRules = await Promise.all(
    countryCodes.map(async (code) => {
      try {
        return await getCountryRule(code);
      } catch {
        return null;
      }
    }),
  );
  const countries: CountryRuleTableRow[] = loadedRules
    .filter((rule): rule is NonNullable<typeof rule> => rule !== null)
    .map((rule) => ({
      code: rule.country_code,
      name: rule.country_name,
      supportedVisaTypes: rule.visa_rules.supported_visa_types,
      requiredDocumentsCount: rule.visa_rules.required_documents.filter((document) => document.required).length,
      totalDocumentsCount: rule.visa_rules.required_documents.length,
      isActive: true,
    }));
  const requiredDocumentCount = countries.reduce(
    (total, country) => total + country.requiredDocumentsCount,
    0,
  );

  return <><PageHeader eyebrow="Regulatory intelligence" title="Countries" description="Available JSON rule sets used to generate application requirements and readiness checks." /><div className="stats-grid stats-grid-three"><StatCard label="Rule sets available" value={String(countries.length)} detail="JSON country configurations" icon="globe" tone="cyan" /><StatCard label="Supported destinations" value={String(countries.length)} detail="Active placeholder status" icon="file" /><StatCard label="Required documents" value={String(requiredDocumentCount)} detail="Across available rule sets" icon="check" tone="amber" /></div><SectionCard title="Country rule registry" subtitle="Read-only visibility into currently available country rule files"><CountryTable countries={countries} /></SectionCard></>;
}
