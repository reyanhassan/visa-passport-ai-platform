import { Icon } from "@/components/shared/icon";

export function PassportDemo() {
  return <div className="scan-demo" aria-label="AI passport scanning preview">
    <div className="scan-orbit scan-orbit-a" /><div className="scan-orbit scan-orbit-b" />
    <div className="scan-window">
      <div className="scan-window-header"><div><span className="window-dot dot-red" /><span className="window-dot dot-amber" /><span className="window-dot dot-green" /></div><small>Passport analysis</small><span className="live-state"><i /> LIVE</span></div>
      <div className="scan-body">
        <div className="passport-sheet">
          <div className="passport-meta"><span>PASSPORT</span><b>P</b></div>
          <div className="passport-data"><div className="portrait"><span /><i /></div><div className="passport-fields"><small>Surname</small><strong>MORGAN</strong><small>Given names</small><strong>ALEX JAMES</strong><div><span><small>Nationality</small><strong>BRITISH</strong></span><span><small>Date of birth</small><strong>14 FEB 1993</strong></span></div></div></div>
          <div className="mrz">P&lt;GBRMORGAN&lt;&lt;ALEX&lt;JAMES&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />48219374&lt;7GBR9302148M3109182&lt;&lt;&lt;&lt;&lt;&lt;6</div>
          <div className="laser-line"><i /></div>
        </div>
        <div className="extraction-panel"><div className="extraction-title"><span>Extracted fields</span><small><Icon name="zap" /> 1.8 sec</small></div><div className="confidence"><div><small>Overall confidence</small><strong>99.4%</strong></div><span><i /></span></div><div className="check-list"><span><Icon name="check" /> Identity verified</span><span><Icon name="check" /> MRZ validated</span><span><Icon name="check" /> Document active</span></div></div>
      </div>
    </div>
    <div className="floating-chip secure-chip"><Icon name="shield" /><span><small>Security</small><strong>Encrypted</strong></span></div>
    <div className="floating-chip ready-chip"><Icon name="check" /><span><small>Scan complete</small><strong>Ready to apply</strong></span></div>
  </div>;
}
