import type { ReactNode } from "react";

import { AppShell, type ShellNavItem } from "@/components/shared/app-shell";
import { requireCurrentUser } from "@/lib/auth";

const navigation: ShellNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home", exact: true },
  { href: "/dashboard/passports", label: "Passports", icon: "passport" },
  { href: "/dashboard/applications", label: "Applications", icon: "file" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell user={await requireCurrentUser()} area="Traveler" navigation={navigation}>{children}</AppShell>;
}
