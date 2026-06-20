import type { ReactNode } from "react";
import Link from "next/link";

import type { SessionUser } from "@/lib/auth";
import { initials } from "@/lib/utils";
import { Icon, type IconName } from "./icon";
import { LogoutButton } from "./logout-button";
import { NavLink } from "./nav-link";

export interface ShellNavItem { href: string; label: string; icon: IconName; exact?: boolean }

export function AppShell({ children, user, area, navigation, accent = "violet" }: { children: ReactNode; user: SessionUser; area: string; navigation: ShellNavItem[]; accent?: "violet" | "cyan" | "amber" }) {
  return <div className={`app-shell shell-${accent}`}>
    <aside className="app-sidebar">
      <Link className="shell-brand" href="/"><span className="brand-mark">V</span><span>VisaFlow<b>AI</b></span></Link>
      <div className="workspace-label"><span>{area}</span><small>Workspace</small></div>
      <nav className="shell-navigation" aria-label={`${area} navigation`}>
        {navigation.map((item) => <NavLink key={item.href} {...item} />)}
      </nav>
      <div className="sidebar-support"><Icon name="shield" /><div><strong>Secure workspace</strong><span>All activity is audited</span></div></div>
      <div className="sidebar-user"><span className="avatar">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><LogoutButton /></div>
    </aside>
    <div className="app-workspace">
      <header className="app-topbar">
        <div><small>{area} workspace</small><strong>Good morning, {user.name.split(" ")[0]}</strong></div>
        <div className="topbar-actions"><button className="search-button" aria-label="Search"><Icon name="search" /><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button" aria-label="Notifications"><Icon name="bell" /><i /></button><span className="topbar-avatar">{initials(user.name)}</span></div>
      </header>
      <nav className="mobile-navigation" aria-label={`${area} mobile navigation`}>{navigation.map((item) => <NavLink key={item.href} {...item} />)}</nav>
      <main className="app-content">{children}</main>
    </div>
  </div>;
}
