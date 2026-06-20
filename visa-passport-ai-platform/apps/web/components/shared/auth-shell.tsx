import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "./icon";

export function AuthShell({ eyebrow, title, description, children, footer }: { eyebrow: string; title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return <main className="auth-page"><section className="auth-story"><Link className="brand" href="/"><span className="brand-mark">V</span><span>VisaFlow<span className="brand-accent">AI</span></span></Link><div className="auth-story-content"><span className="auth-pill"><Icon name="shield" /> Secure document intelligence</span><h1>Less form filling.<br /><em>More going places.</em></h1><p>Scan once, organize every detail, and move through visa requirements with confidence.</p><div className="auth-mini-card"><div className="mini-scan"><Icon name="passport" /><span><strong>Passport verified</strong><small>All identity fields extracted</small></span><b>99.4%</b></div><div className="mini-progress"><span><i /></span><small><Icon name="check" /> Ready for application</small></div></div></div><div className="auth-trust"><span><Icon name="lock" /> Encrypted</span><span><Icon name="shield" /> Privacy-first</span><span><Icon name="audit" /> Auditable</span></div></section><section className="auth-form-panel"><div className="auth-form-wrap"><span className="auth-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p>{children}<div className="auth-footer">{footer}</div></div></section></main>;
}
