import { Badge } from "@/components/ui/badge";
import { CountryMark } from "@/components/shared/country-mark";
import { Icon } from "@/components/shared/icon";
import { countries } from "@/lib/mock-data";

export function CountryTable() {
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Country</th><th>Visa types</th><th>Rules version</th><th>Last reviewed</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{countries.map((country) => <tr key={country.code}><td><div className="identity-cell"><CountryMark code={country.code} /><span><strong>{country.name}</strong><small>ISO {country.code}</small></span></div></td><td>{country.visaTypes}</td><td><strong className="mono-value">v{country.rulesVersion}</strong></td><td>{country.reviewed}</td><td><Badge tone={country.status === "Current" ? "success" : "warning"}>{country.status}</Badge></td><td><button className="table-action" aria-label={`Actions for ${country.name}`}><Icon name="more" /></button></td></tr>)}</tbody></table></div>;
}
