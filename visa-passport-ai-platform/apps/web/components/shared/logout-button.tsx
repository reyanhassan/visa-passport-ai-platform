"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "./icon";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return <button className="sidebar-logout" type="button" onClick={() => void logout()} disabled={isLoggingOut} aria-label="Sign out"><Icon name="arrow" /></button>;
}
