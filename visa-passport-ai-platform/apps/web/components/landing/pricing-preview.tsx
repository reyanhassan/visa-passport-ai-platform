import Link from "next/link";

import { Icon } from "@/components/shared/icon";

const plans = [{ name: "Explorer", price: "$0", description: "For individuals preparing an occasional trip.", features: ["2 passport scans", "Country requirement guides", "1 active application"] }, { name: "Traveler", price: "$19", description: "For frequent travelers who want everything organized.", features: ["Unlimited passport scans", "5 active applications", "Priority document review"], popular: true }, { name: "Agency", price: "$79", description: "For teams managing client applications at scale.", features: ["Multi-client workspace", "Team roles and audit logs", "Agency marketplace profile"] }];

export function PricingPreview() {
  return <section className="landing-section pricing-section" id="pricing"><div className="section-heading centered"><span>Simple pricing</span><h2>Start free. Scale when<br />your journey does.</h2><p>No surprise document fees. Choose the workspace that fits how you travel or work.</p></div><div className="pricing-grid">{plans.map((plan) => <article className={plan.popular ? "popular" : ""} key={plan.name}>{plan.popular && <span className="popular-tag">Most popular</span>}<h3>{plan.name}</h3><p>{plan.description}</p><div className="plan-price"><strong>{plan.price}</strong><span>{plan.price !== "$0" ? "/ month" : "forever"}</span></div><Link href="/register">Choose {plan.name} <Icon name="arrow" /></Link><ul>{plan.features.map((feature) => <li key={feature}><Icon name="check" />{feature}</li>)}</ul></article>)}</div></section>;
}
