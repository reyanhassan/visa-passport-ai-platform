import { Badge } from "@/components/ui/badge";
import { CountryMark } from "@/components/shared/country-mark";

export interface CountryRuleTableRow {
  code: string;
  name: string;
  supportedVisaTypes: string[];
  requiredDocumentsCount: number;
  totalDocumentsCount: number;
  isActive: boolean;
}

export function CountryTable({ countries }: { countries: CountryRuleTableRow[] }) {
  return <div className="data-table-wrap"><table className="data-table country-rule-table"><thead><tr><th>Country</th><th>Supported visa types</th><th>Required documents</th><th>Status</th></tr></thead><tbody>{countries.map((country) => <tr key={country.code}><td><div className="identity-cell"><CountryMark code={country.code} /><span><strong>{country.name}</strong><small>ISO {country.code}</small></span></div></td><td><div className="country-visa-types">{country.supportedVisaTypes.map((type) => <span key={type}>{type.replaceAll("_", " ")}</span>)}</div></td><td><strong>{country.requiredDocumentsCount} required</strong><small className="block-subtle">{country.totalDocumentsCount} listed in rule set</small></td><td><Badge tone={country.isActive ? "success" : "neutral"}>{country.isActive ? "Active" : "Inactive"}</Badge></td></tr>)}</tbody></table></div>;
}
