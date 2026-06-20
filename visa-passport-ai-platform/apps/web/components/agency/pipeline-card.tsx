import { Card } from "@/components/ui/card";

const stages = [{ label: "New intake", value: 12, tone: "violet" }, { label: "Documents", value: 8, tone: "cyan" }, { label: "Review", value: 5, tone: "amber" }, { label: "Ready", value: 9, tone: "green" }];

export function PipelineCard() {
  return <Card className="pipeline-card"><div className="section-card-header"><div><h2>Application pipeline</h2><p>Live workload across your team</p></div><span className="live-indicator"><i /> Live</span></div><div className="pipeline-bars">{stages.map((stage) => <div key={stage.label}><span><strong>{stage.value}</strong><small>{stage.label}</small></span><div><i className={`bar-${stage.tone}`} style={{ height: `${38 + stage.value * 5}px` }} /></div></div>)}</div><div className="pipeline-total"><span>34 active applications</span><strong>+12% <small>this month</small></strong></div></Card>;
}
