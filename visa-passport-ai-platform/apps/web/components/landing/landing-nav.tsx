import Link from "next/link";

export function LandingNav() {
  return <nav className="landing-nav" aria-label="Main navigation">
    <Link className="brand" href="/"><span className="brand-mark">V</span><span>VisaFlow<span className="brand-accent">AI</span></span></Link>
    <div className="landing-nav-links"><a href="#how-it-works">How it works</a><a href="#countries">Countries</a><a href="#agencies">For agencies</a><a href="#pricing">Pricing</a></div>
    <div className="landing-nav-actions"><Link href="/login">Sign in</Link><Link className="nav-cta" href="/register">Get started</Link></div>
  </nav>;
}
