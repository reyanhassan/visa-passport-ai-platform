"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "./icon";

export function NavLink({ href, label, icon, exact = false }: { href: string; label: string; icon: IconName; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return <Link className={`shell-nav-link${active ? " is-active" : ""}`} href={href}><Icon name={icon} /><span>{label}</span>{active && <i />}</Link>;
}
