import type { ReactNode } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Icon } from "./icon";

export function SectionCard({ title, subtitle, href, children }: { title: string; subtitle?: string; href?: string; children: ReactNode }) {
  return <Card className="section-card"><div className="section-card-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{href && <Link href={href}>View all <Icon name="arrow" /></Link>}</div>{children}</Card>;
}
