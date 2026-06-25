import { UserRole } from "@visa-platform/database";

import type { SessionUser } from "@/lib/auth";

export function isAgencyRole(user: SessionUser): boolean {
  return user.role === UserRole.AGENCY_USER || user.role === UserRole.AGENCY_ADMIN;
}

export function canUseAgencyWorkspace(user: SessionUser): boolean {
  return isAgencyRole(user) && Boolean(user.agencyId);
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === UserRole.ADMIN;
}

export function canAccessAgencyData(user: SessionUser): boolean {
  return canUseAgencyWorkspace(user) || isAdmin(user);
}
