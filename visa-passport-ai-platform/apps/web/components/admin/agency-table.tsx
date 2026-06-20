import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/shared/icon";
import { agencies } from "@/lib/mock-data";

export function AgencyTable({ compact = false }: { compact?: boolean }) {
  const rows = compact ? agencies.slice(0, 3) : agencies;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Agency</th><th>Region</th><th>Specialists</th><th>Applications</th><th>Rating</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((agency) => <tr key={agency.id}><td><div className="identity-cell"><span className="agency-table-logo">{agency.name.slice(0, 2).toUpperCase()}</span><span><strong>{agency.name}</strong><small>{agency.id}</small></span></div></td><td>{agency.region}</td><td>{agency.specialists}</td><td>{agency.applications}</td><td><strong className="rating">★ {agency.rating}</strong></td><td><Badge tone={agency.status === "Verified" ? "success" : "warning"}>{agency.status}</Badge></td><td><button className="table-action" aria-label={`Actions for ${agency.name}`}><Icon name="more" /></button></td></tr>)}</tbody></table></div>;
}
