import Link from "next/link";

import { CountryMark } from "@/components/shared/country-mark";
import { Icon } from "@/components/shared/icon";

const destinations = [{ code: "AE", name: "UAE", count: "6 visa types" }, { code: "GB", name: "United Kingdom", count: "8 visa types" }, { code: "SG", name: "Singapore", count: "5 visa types" }, { code: "TR", name: "Türkiye", count: "4 visa types" }, { code: "CA", name: "Canada", count: "7 visa types" }, { code: "AU", name: "Australia", count: "9 visa types" }];

export function CountriesSection() {
  return <section className="countries-section" id="countries"><div className="countries-inner"><div className="countries-copy"><span className="section-tag light">Global rule intelligence</span><h2>Country requirements,<br /><em>made understandable.</em></h2><p>Navigate changing visa rules with structured, reviewed guidance. Know what is required before an application begins.</p><div className="country-benefits"><span><Icon name="check" /> Versioned requirement data</span><span><Icon name="check" /> Review dates and official sources</span><span><Icon name="check" /> Clear document checklists</span></div><Link href="/register">Explore country coverage <Icon name="arrow" /></Link></div><div className="country-board"><div className="board-header"><span>Popular destinations</span><small><i /> 48 countries live</small></div><div className="destination-grid">{destinations.map((country) => <div key={country.code}><CountryMark code={country.code} /><span><strong>{country.name}</strong><small>{country.count}</small></span><Icon name="arrow" /></div>)}</div><div className="coverage-meter"><div><span>Coverage expansion</span><strong>48 of 75 launch markets</strong></div><span><i /></span></div></div></div></section>;
}
