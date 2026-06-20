import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/shared/icon";
import { initials } from "@/lib/utils";
import { agencyClients } from "@/lib/mock-data";

function clientTone(status: string) {
  if (status === "Active" || status === "Complete") return "success" as const;
  return "warning" as const;
}

export function ClientTable({ compact = false }: { compact?: boolean }) {
  const rows = compact ? agencyClients.slice(0, 3) : agencyClients;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Client</th><th>Passports</th><th>Active cases</th><th>Last active</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((client) => <tr key={client.id}><td><div className="identity-cell"><span className="table-avatar">{initials(client.name)}</span><span><strong>{client.name}</strong><small>{client.email} · {client.id}</small></span></div></td><td>{client.passports}</td><td>{client.activeCases}</td><td>{client.lastActive}</td><td><Badge tone={clientTone(client.status)}>{client.status}</Badge></td><td><button className="table-action" aria-label={`Actions for ${client.name}`}><Icon name="more" /></button></td></tr>)}</tbody></table></div>;
}
