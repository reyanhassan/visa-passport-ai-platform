import Link from "next/link";

import { Icon } from "@/components/shared/icon";
import { LandingNav } from "./landing-nav";
import { PassportDemo } from "./passport-demo";

export function HeroSection() {
  return <section className="landing-hero">
    <LandingNav />
    <div className="landing-hero-grid">
      <div className="landing-hero-copy">
        <div className="hero-kicker"><span><Icon name="zap" /></span> AI document intelligence for global mobility</div>
        <h1>AI-powered visa applications, starting with <em>instant passport scanning.</em></h1>
        <p>Upload a passport, extract details automatically, validate country requirements, and prepare visa applications faster for individuals and travel agencies.</p>
        <div className="landing-hero-actions"><Link className="primary-cta" href="/register">Scan your first passport <Icon name="arrow" /></Link><a className="demo-link" href="#how-it-works"><span>▶</span> See how it works</a></div>
        <div className="hero-proof"><div className="proof-avatars"><span>AM</span><span>NH</span><span>DK</span><span>+</span></div><div><strong>Trusted by global travelers</strong><small>4.9/5 from early access teams</small></div></div>
      </div>
      <PassportDemo />
    </div>
    <div className="hero-integrations"><span>Built for secure global processing</span><div><b>ICAO</b><b>MRZ</b><b>GDPR</b><b>SOC 2 READY</b><b>256-BIT AES</b></div></div>
  </section>;
}
