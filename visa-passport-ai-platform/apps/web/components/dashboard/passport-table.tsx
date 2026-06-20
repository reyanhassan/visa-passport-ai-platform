import { Badge } from "@/components/ui/badge";
import { CountryMark } from "@/components/shared/country-mark";
import { Icon } from "@/components/shared/icon";
import { passportScans } from "@/lib/mock-data";

export interface PassportTableRow {
  id: string;
  holder: string;
  country: string;
  code: string;
  number: string;
  scanned: string;
  confidence: number;
  status: string;
}

export function PassportTable({ compact = false, scans }: { compact?: boolean; scans?: PassportTableRow[] }) {
  const source = scans ?? passportScans;
  const rows = compact ? source.slice(0, 3) : source;
  if (rows.length === 0) return <div className="table-empty-state"><Icon name="passport" /><strong>No completed passport scans</strong><span>Upload your first passport to populate this table.</span></div>;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Passport holder</th><th>Document</th><th>Scanned</th><th>Confidence</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((scan) => <tr key={scan.id}><td><div className="identity-cell"><CountryMark code={scan.code} /><span><strong>{scan.holder}</strong><small>{scan.country}</small></span></div></td><td><strong className="mono-value">{scan.number}</strong><small className="block-subtle">{scan.id.slice(0, 12)}</small></td><td>{scan.scanned}</td><td><div className="confidence-cell"><span><i style={{ width: `${scan.confidence}%` }} /></span><strong>{scan.confidence}%</strong></div></td><td><Badge tone={scan.status === "Verified" ? "success" : "warning"}>{scan.status}</Badge></td><td><button className="table-action" aria-label={`Actions for ${scan.holder}`}><Icon name="more" /></button></td></tr>)}</tbody></table></div>;
}
