import { AgencyMarketplace } from "@/components/landing/agency-marketplace";
import { CountriesSection } from "@/components/landing/countries-section";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingPreview } from "@/components/landing/pricing-preview";
import { SecuritySection } from "@/components/landing/security-section";

export default function HomePage() {
  return <main className="landing-page">
    <HeroSection />
    <HowItWorks />
    <CountriesSection />
    <AgencyMarketplace />
    <SecuritySection />
    <PricingPreview />
    <FinalCta />
  </main>;
}
