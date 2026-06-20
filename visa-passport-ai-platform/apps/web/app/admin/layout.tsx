import type { ReactNode } from "react";

import { AppShell, type ShellNavItem } from "@/components/shared/app-shell";
import { UserRole } from "@visa-platform/database";
import { requireCurrentUser } from "@/lib/auth";

const navigation: ShellNavItem[] = [
  { href: "/admin", label: "Overview", icon: "home", exact: true },
  { href: "/admin/agencies", label: "Agencies", icon: "building" },
  { href: "/admin/countries", label: "Countries", icon: "globe" },
  { href: "/admin/audit-logs", label: "Audit logs", icon: "audit" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser([UserRole.ADMIN]);
  return <AppShell user={user} area="Platform admin" navigation={navigation} accent="amber">{children}</AppShell>;
}
