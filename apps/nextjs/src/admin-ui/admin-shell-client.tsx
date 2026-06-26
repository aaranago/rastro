"use client";

import { usePathname } from "next/navigation";

import { ThemeToggle } from "@acme/ui/theme";

import { AdminNavigation } from "./admin-navigation";

export function AdminNavigationWithPathname() {
  const pathname = usePathname();

  return <AdminNavigation currentPathname={pathname} />;
}

export function AdminHeaderThemeToggle() {
  return <ThemeToggle />;
}
