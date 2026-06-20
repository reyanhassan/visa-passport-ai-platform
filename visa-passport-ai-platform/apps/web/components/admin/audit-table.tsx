import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/shared/icon";
import { auditLogs } from "@/lib/mock-data";

function auditTone(severity: string) {
  if (severity === "Sensitive") return "danger" as const;
  if (severity === "Review") return "warning" as const;
  return "neutral" as const;
}

export function AuditTable({ compact = false }: { compact?: boolean }) {
  const rows = compact ? auditLogs.slice(0, 3) : auditLogs;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Event</th><th>Actor</th><th>Action</th><th>Resource</th><th>Timestamp</th><th>Level</th></tr></thead><tbody>{rows.map((event) => <tr key={event.id}><td><span className="event-id"><Icon name="audit" />{event.id}</span></td><td><strong>{event.actor}</strong></td><td>{event.action}</td><td><strong className="mono-value">{event.resource}</strong></td><td>{event.timestamp}</td><td><Badge tone={auditTone(event.severity)}>{event.severity}</Badge></td></tr>)}</tbody></table></div>;
}
