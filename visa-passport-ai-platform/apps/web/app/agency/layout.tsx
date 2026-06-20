import type { ReactNode } from "react";

import { AppShell, type ShellNavItem } from "@/components/shared/app-shell";
import { UserRole } from "@visa-platform/database";
import { requireCurrentUser } from "@/lib/auth";

const navigation: ShellNavItem[] = [
  { href: "/agency", label: "Overview", icon: "home", exact: true },
  { href: "/agency/clients", label: "Clients", icon: "users" },
  { href: "/agency/applications", label: "Applications", icon: "file" },
];

export default async function AgencyLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser([UserRole.AGENCY_USER, UserRole.AGENCY_ADMIN, UserRole.ADMIN]);
  return <AppShell user={user} area="Agency" navigation={navigation} accent="cyan">{children}</AppShell>;
}
