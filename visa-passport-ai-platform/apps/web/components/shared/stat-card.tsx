import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "./icon";

export function StatCard({ label, value, detail, icon, tone = "violet" }: { label: string; value: string; detail: string; icon: IconName; tone?: "violet" | "cyan" | "amber" | "rose" }) {
  return <Card className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon name={icon} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></Card>;
}
