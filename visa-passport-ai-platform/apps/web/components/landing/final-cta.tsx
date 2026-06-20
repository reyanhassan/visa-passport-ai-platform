import Link from "next/link";

import { Icon } from "@/components/shared/icon";

export function FinalCta() {
  return <><section className="final-cta"><div className="cta-glow" /><span>Ready when you are</span><h2>Your next visa application<br />starts with one scan.</h2><p>Join travelers and agencies replacing repetitive forms with a clearer, faster workflow.</p><div><Link className="primary-cta" href="/register">Create your free workspace <Icon name="arrow" /></Link><Link href="/login">Already have an account? Sign in</Link></div></section><footer className="landing-footer"><Link className="brand" href="/"><span className="brand-mark">V</span><span>VisaFlow<span className="brand-accent">AI</span></span></Link><p>Intelligent document processing for global mobility.</p><div><a href="#how-it-works">Product</a><a href="#agencies">Agencies</a><a href="#pricing">Pricing</a><a href="/login">Sign in</a></div><small>© 2026 VisaFlow AI</small></footer></>;
}
